/**
 * WSOLA (Waveform Similarity Overlap-Add) time-domain pitch-preserving time stretch.
 *
 * Used to prepare a pristine, pitch-preserved copy of a musical beat loop at
 * the target tempo (stretchRatio = plan.baseTempoMultiplier), which is then
 * played at playbackRate = 1.0.
 *
 * Preserves transients (kicks, snares, hats) without metallic phase artifacts,
 * preserves exact musical pitch, and applies a 5ms boundary crossfade for click-free looping.
 */

export interface WsolaOptions {
  windowSize?: number;
  boundarySmoothMs?: number;
}

export function timeStretchWsola(
  audioCtx: AudioContext,
  sourceBuffer: AudioBuffer,
  startSample: number,
  endSample: number,
  stretchRatio: number,
  options: WsolaOptions = {}
): AudioBuffer {
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  const totalSourceSamples = sourceBuffer.length;

  const safeStart = Math.max(0, Math.min(totalSourceSamples - 1, Math.round(startSample)));
  const safeEnd = Math.max(safeStart + 1, Math.min(totalSourceSamples, Math.round(endSample)));
  const sourceLoopLength = safeEnd - safeStart;

  // Boundary smoothing length (default 5ms per Section 10)
  const boundarySmoothMs = options.boundarySmoothMs ?? 5;

  // Output sample count: at speedup ratio R, duration T_out = T_in / R
  const outputLength = Math.max(1, Math.round(sourceLoopLength / stretchRatio));

  // Extract source channels
  const inChannels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    const raw = sourceBuffer.getChannelData(c);
    const slice = new Float32Array(sourceLoopLength);
    for (let i = 0; i < sourceLoopLength; i++) {
      slice[i] = raw[safeStart + i];
    }
    inChannels.push(slice);
  }

  // Mono mix for waveform correlation matching
  const mono = new Float32Array(sourceLoopLength);
  if (numChannels === 1) {
    mono.set(inChannels[0]);
  } else {
    const c0 = inChannels[0];
    const c1 = inChannels[1];
    for (let i = 0; i < sourceLoopLength; i++) {
      mono[i] = 0.5 * (c0[i] + c1[i]);
    }
  }

  // Fast path: if stretchRatio is essentially 1.0 (no tempo change), return direct slice
  if (Math.abs(stretchRatio - 1.0) < 0.002) {
    const outBuffer = audioCtx.createBuffer(numChannels, sourceLoopLength, sampleRate);
    for (let c = 0; c < numChannels; c++) {
      const outData = outBuffer.getChannelData(c);
      outData.set(inChannels[c]);
      applyBoundarySmoothing(outData, sampleRate, boundarySmoothMs);
    }
    return outBuffer;
  }

  // Configure WSOLA parameters
  // ~23ms window at 44.1kHz (1024 samples) is optimal for percussion and drum transients
  let windowSize = options.windowSize ?? 1024;
  if (sourceLoopLength < windowSize) {
    windowSize = Math.max(128, 1 << Math.floor(Math.log2(sourceLoopLength)));
  }
  const hopSize = Math.floor(windowSize / 2);
  const searchRadius = Math.min(Math.floor(hopSize / 2), 256);

  // Precalculate Hann window
  const hann = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
  }

  // Allocate synthesis buffers
  const outChannels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    outChannels.push(new Float32Array(outputLength));
  }
  const windowWeight = new Float32Array(outputLength);

  const analysisHop = hopSize * stretchRatio;
  let synthPos = 0;
  let step = 0;
  let lastInputPos = 0;

  const N = sourceLoopLength;

  while (synthPos < outputLength) {
    const nominalInputPos = step * analysisHop;
    let chosenInputPos = Math.round(nominalInputPos);

    if (step === 0) {
      chosenInputPos = 0;
    } else {
      // Natural continuation from previous grain:
      const naturalPos = (lastInputPos + hopSize) % N;
      const nominalRounded = Math.round(nominalInputPos);

      // Search for best correlation around nominal position
      let bestCorr = -Infinity;
      let bestOffset = 0;

      const matchLen = hopSize;

      // Energy of template
      let templateEnergy = 0;
      for (let k = 0; k < matchLen; k++) {
        const val = mono[(naturalPos + k) % N];
        templateEnergy += val * val;
      }
      const templateNorm = Math.sqrt(templateEnergy) + 1e-9;

      for (let delta = -searchRadius; delta <= searchRadius; delta += 2) {
        const candidatePos = ((nominalRounded + delta) % N + N) % N;

        let dot = 0;
        let candEnergy = 0;
        for (let k = 0; k < matchLen; k++) {
          const tVal = mono[(naturalPos + k) % N];
          const cVal = mono[(candidatePos + k) % N];
          dot += tVal * cVal;
          candEnergy += cVal * cVal;
        }

        const normCorr = dot / (templateNorm * (Math.sqrt(candEnergy) + 1e-9));
        if (normCorr > bestCorr) {
          bestCorr = normCorr;
          bestOffset = delta;
        }
      }

      chosenInputPos = ((nominalRounded + bestOffset) % N + N) % N;
    }

    // Overlap-add windowed grain
    for (let k = 0; k < windowSize; k++) {
      const outIdx = synthPos + k;
      if (outIdx >= outputLength) break;

      const inIdx = (chosenInputPos + k) % N;
      const w = hann[k];

      for (let c = 0; c < numChannels; c++) {
        outChannels[c][outIdx] += inChannels[c][inIdx] * w;
      }
      windowWeight[outIdx] += w;
    }

    lastInputPos = chosenInputPos;
    synthPos += hopSize;
    step++;
  }

  // Normalize by window weight sum pass
  for (let i = 0; i < outputLength; i++) {
    const w = windowWeight[i];
    if (w > 1e-5) {
      const inv = 1.0 / w;
      for (let c = 0; c < numChannels; c++) {
        outChannels[c][i] *= inv;
      }
    }
  }

  // Apply 5ms boundary smoothing on each channel to guarantee click-free wrap
  for (let c = 0; c < numChannels; c++) {
    applyBoundarySmoothing(outChannels[c], sampleRate, boundarySmoothMs);
  }

  // Build final AudioBuffer
  const outBuffer = audioCtx.createBuffer(numChannels, outputLength, sampleRate);
  for (let c = 0; c < numChannels; c++) {
    outBuffer.getChannelData(c).set(outChannels[c]);
  }

  return outBuffer;
}

/**
 * 3–10 ms equal-amplitude boundary crossfade so the loop wrap (end -> start)
 * connects with zero click or discontinuity without altering loop length or tempo.
 */
function applyBoundarySmoothing(
  channelData: Float32Array,
  sampleRate: number,
  smoothMs: number
): void {
  const L = channelData.length;
  const smoothSamples = Math.min(
    Math.max(16, Math.round((smoothMs / 1000) * sampleRate)),
    Math.floor(L / 4)
  );

  if (smoothSamples <= 0 || L <= smoothSamples) return;

  for (let i = 0; i < smoothSamples; i++) {
    const t = i / smoothSamples; // 0.0 -> 1.0
    const tailIdx = L - smoothSamples + i;
    const headIdx = i;

    // Blend tail into head sample so wrap from L-1 to 0 is seamless
    const tailVal = channelData[tailIdx];
    const headVal = channelData[headIdx];

    channelData[tailIdx] = tailVal * (1 - t) + headVal * t;
  }
}
