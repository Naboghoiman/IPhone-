/**
 * Precision BPM & Dynamic Beatgrid Analysis Engine
 *
 * Implements multi-band spectral flux onset detection, energy drop discovery,
 * and sub-sample autocorrelation to extract exact BPM, downbeat phase, and
 * transient kick attack markers from real-world, local, and variable-tempo songs.
 */

import { BeatGrid, TrackData } from '../types/dj';
import { BeatGridRefiner, RefinedBeatGridResult } from './beatGridRefiner';

export interface BpmAnalysisResult {
  bpm: number;
  confidence: number;
  firstDownbeatSample: number;
  samplesPerBeat: number;
  beatSamples: number[];
  isDownbeat: boolean[];
  transientMarkers: number[];
  hasIntro: boolean;
  introDurationSec: number;
  isVariableBpm: boolean;
  bpmVariance: number;
}

/**
 * Analyzes an AudioBuffer using multi-band energy flux and robust autocorrelation
 * to extract exact BPM (0.01 precision), first downbeat phase, and transient peaks.
 */
export function analyzeAudioBufferBpm(
  audioBuffer: AudioBuffer,
  minBpm = 60,
  maxBpm = 195
): BpmAnalysisResult {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const totalFrames = channelData.length;

  // 1. Decimate/downsample for fast, robust energy envelope analysis (~500 Hz control rate)
  const hopSize = Math.max(1, Math.floor(sampleRate / 500));
  const envelopeLength = Math.floor(totalFrames / hopSize);
  const envelopeSampleRate = sampleRate / hopSize;

  // Multi-band filtering:
  // Band 1: Low kick/sub-bass (40 - 180 Hz) - primary pulse
  // Band 2: Mid snare/clap (180 - 1200 Hz) - backbeat rhythm
  const dt = 1 / sampleRate;
  const rcLow = 1 / (2 * Math.PI * 180);
  const alphaLow = dt / (rcLow + dt);

  const rcMidHigh = 1 / (2 * Math.PI * 1200);
  const alphaMidHigh = dt / (rcMidHigh + dt);

  const kickEnvelope = new Float32Array(envelopeLength);
  const midEnvelope = new Float32Array(envelopeLength);
  const rmsProfile = new Float32Array(envelopeLength);

  let filteredLow = 0;
  let filteredMid = 0;

  for (let i = 0; i < envelopeLength; i++) {
    let kickSum = 0;
    let midSum = 0;
    let rawSum = 0;
    const frameStart = i * hopSize;
    const frameEnd = Math.min(totalFrames, frameStart + hopSize);

    for (let j = frameStart; j < frameEnd; j++) {
      const sample = channelData[j];
      rawSum += sample * sample;

      // Low pass 180 Hz
      filteredLow = filteredLow + alphaLow * (sample - filteredLow);
      kickSum += filteredLow * filteredLow;

      // Band pass ~180 - 1200 Hz
      filteredMid = filteredMid + alphaMidHigh * (sample - filteredMid);
      const midBandVal = filteredMid - filteredLow;
      midSum += midBandVal * midBandVal;
    }

    const count = frameEnd - frameStart;
    kickEnvelope[i] = Math.sqrt(kickSum / count);
    midEnvelope[i] = Math.sqrt(midSum / count);
    rmsProfile[i] = Math.sqrt(rawSum / count);
  }

  // 2. Discover the primary rhythmic drop / active beat section
  // Real songs often have 2 - 10s quiet vocal/acoustic intros before drums drop
  let maxRms = 0;
  for (let i = 0; i < envelopeLength; i++) {
    if (rmsProfile[i] > maxRms) maxRms = rmsProfile[i];
  }

  // Find when steady rhythmic energy begins (exceeds 25% of max RMS)
  const rmsThreshold = maxRms * 0.25;
  let rhythmStartFrame = 0;
  for (let i = 0; i < envelopeLength; i++) {
    if (rmsProfile[i] >= rmsThreshold && kickEnvelope[i] > 0.02) {
      rhythmStartFrame = i;
      break;
    }
  }

  const introDurationSec = (rhythmStartFrame * hopSize) / sampleRate;
  const hasIntro = introDurationSec > 1.0;

  // 3. Compute half-wave rectified onset novelty curve focusing on kick & mid hits
  const novelty = new Float32Array(envelopeLength);
  for (let i = 1; i < envelopeLength; i++) {
    const diffKick = kickEnvelope[i] - kickEnvelope[i - 1];
    const diffMid = midEnvelope[i] - midEnvelope[i - 1];

    const posKick = diffKick > 0 ? diffKick : 0;
    const posMid = diffMid > 0 ? diffMid : 0;

    // Weight kick drum hits heavily (75% kick, 25% snare/clap)
    novelty[i] = posKick * 0.75 + posMid * 0.25;
  }

  // Normalize novelty curve
  let maxNovelty = 0;
  for (let i = 0; i < envelopeLength; i++) {
    if (novelty[i] > maxNovelty) maxNovelty = novelty[i];
  }
  if (maxNovelty > 0) {
    for (let i = 0; i < envelopeLength; i++) {
      novelty[i] /= maxNovelty;
    }
  }

  // 4. Autocorrelation across candidate tempo lags (60 - 195 BPM)
  const minLag = Math.floor((envelopeSampleRate * 60) / maxBpm);
  const maxLag = Math.ceil((envelopeSampleRate * 60) / minBpm);

  // Analyze starting from where rhythm actually begins (up to 45s of active rhythm)
  const analysisStart = rhythmStartFrame;
  const analysisLength = Math.min(
    envelopeLength - analysisStart - maxLag - 1,
    Math.floor(envelopeSampleRate * 45)
  );

  let bestLag = minLag;
  let maxCorrelation = -1;
  const correlationScores: { lag: number; score: number }[] = [];

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let n = analysisStart; n < analysisStart + analysisLength; n++) {
      corr += novelty[n] * novelty[n + lag];
    }

    correlationScores.push({ lag, score: corr });

    if (corr > maxCorrelation) {
      maxCorrelation = corr;
      bestLag = lag;
    }
  }

  // 5. Parabolic interpolation around best lag for sub-sample fractional BPM precision
  let refinedLag = bestLag;
  const bestIdx = correlationScores.findIndex((s) => s.lag === bestLag);
  if (bestIdx > 0 && bestIdx < correlationScores.length - 1) {
    const alphaCorr = correlationScores[bestIdx - 1].score;
    const betaCorr = correlationScores[bestIdx].score;
    const gammaCorr = correlationScores[bestIdx + 1].score;

    const denom = 2 * (alphaCorr - 2 * betaCorr + gammaCorr);
    if (Math.abs(denom) > 1e-9) {
      const delta = (alphaCorr - gammaCorr) / denom;
      refinedLag = bestLag + Math.max(-0.5, Math.min(0.5, delta));
    }
  }

  let rawBpm = (envelopeSampleRate * 60) / refinedLag;

  // 6. Intelligent Octave & Genre Harmonics Check (Dancehall / Reggae / Halftime / DnB)
  const halfLag = Math.round(refinedLag / 2);
  const doubleLag = Math.round(refinedLag * 2);

  const halfScore = correlationScores.find((s) => s.lag === halfLag)?.score ?? 0;
  const doubleScore = correlationScores.find((s) => s.lag === doubleLag)?.score ?? 0;

  // Prefer standard DJ mixing range (80 - 145 BPM) unless strong DnB (>160)
  if (rawBpm < 70 && doubleScore > maxCorrelation * 0.75) {
    rawBpm *= 2;
    refinedLag = (envelopeSampleRate * 60) / rawBpm;
  } else if (rawBpm > 155 && rawBpm < 185 && halfScore > maxCorrelation * 0.9) {
    // If half tempo is very strong, check if it's dancehall/reggae or halftime
    rawBpm /= 2;
    refinedLag = (envelopeSampleRate * 60) / rawBpm;
  }

  const preciseBpm = Math.round(rawBpm * 100) / 100;
  const samplesPerBeat = (sampleRate * 60) / preciseBpm;

  // 7. Find true first downbeat: search from rhythmStartFrame forward across 4 beats
  // for the highest kick attack transient
  const rhythmStartSample = rhythmStartFrame * hopSize;
  const searchRange = Math.min(totalFrames, rhythmStartSample + Math.round(samplesPerBeat * 4));

  let downbeatCandidateSample = rhythmStartSample;
  let maxKickEnergy = 0;

  for (let s = rhythmStartSample; s < searchRange; s += 8) {
    const val = Math.abs(channelData[s]);
    if (val > maxKickEnergy) {
      maxKickEnergy = val;
      downbeatCandidateSample = s;
    }
  }

  // Back-propagate this periodic phase backwards to near sample 0 so the entire song is gridded
  let firstDownbeatSample = downbeatCandidateSample;
  while (firstDownbeatSample >= samplesPerBeat) {
    firstDownbeatSample -= Math.round(samplesPerBeat);
  }
  firstDownbeatSample = Math.max(0, firstDownbeatSample);

  // 8. Generate full beat samples & transient kick markers
  const totalBeats = Math.floor((totalFrames - firstDownbeatSample) / samplesPerBeat);
  const beatSamples: number[] = [];
  const isDownbeat: boolean[] = [];
  const transientMarkers: number[] = [];
  const beatDeviations: number[] = [];

  const localRadius = Math.round(sampleRate * 0.025); // +/- 25ms search radius

  for (let b = 0; b < totalBeats; b++) {
    const theoreticalSample = Math.round(firstDownbeatSample + b * samplesPerBeat);
    beatSamples.push(theoreticalSample);
    isDownbeat.push(b % 4 === 0);

    // Search around theoretical sample for actual local maximum (kick attack transient)
    const startIdx = Math.max(0, theoreticalSample - localRadius);
    const endIdx = Math.min(totalFrames - 1, theoreticalSample + localRadius);

    let localMax = 0;
    let localMaxIdx = theoreticalSample;

    for (let k = startIdx; k <= endIdx; k += 4) {
      const v = Math.abs(channelData[k]);
      if (v > localMax) {
        localMax = v;
        localMaxIdx = k;
      }
    }

    transientMarkers.push(localMaxIdx);

    // Track drift/deviation between transient and theoretical grid
    if (localMax > 0.08) {
      const devMs = ((localMaxIdx - theoreticalSample) / sampleRate) * 1000;
      beatDeviations.push(Math.abs(devMs));
    }
  }

  // Calculate confidence and live tempo variance
  let avgCorrelation = 0;
  for (const item of correlationScores) avgCorrelation += item.score;
  avgCorrelation /= Math.max(1, correlationScores.length);
  const confidence = Math.min(
    0.99,
    Math.max(0.65, (maxCorrelation - avgCorrelation) / (maxCorrelation + 1e-6))
  );

  let avgDevMs = 0;
  if (beatDeviations.length > 0) {
    avgDevMs = beatDeviations.reduce((a, b) => a + b, 0) / beatDeviations.length;
  }
  const isVariableBpm = avgDevMs > 12.0; // > 12ms average jitter indicates live drummer or variable tempo
  const bpmVariance = Math.round((avgDevMs / 10) * 10) / 10;

  return {
    bpm: preciseBpm,
    confidence,
    firstDownbeatSample,
    samplesPerBeat,
    beatSamples,
    isDownbeat,
    transientMarkers,
    hasIntro,
    introDurationSec,
    isVariableBpm,
    bpmVariance
  };
}

/**
 * Re-calibrates an existing TrackData with updated BPM, manual offset, or transient snapping.
 */
export function recalibrateTrackBeatGrid(
  track: TrackData,
  newBpm: number,
  firstDownbeatSample = 0
): TrackData {
  const safeBpm = Math.max(40, Math.min(240, newBpm));
  const samplesPerBeat = (track.sampleRate * 60) / safeBpm;
  const totalFrames = track.audioBuffer.length;
  const totalBeats = Math.floor((totalFrames - firstDownbeatSample) / samplesPerBeat);

  const beatSamples: number[] = [];
  const isDownbeat: boolean[] = [];
  const transientMarkers: number[] = [];

  for (let b = 0; b < totalBeats; b++) {
    const sample = Math.round(firstDownbeatSample + b * samplesPerBeat);
    beatSamples.push(sample);
    isDownbeat.push(b % 4 === 0);
    transientMarkers.push(sample);
  }

  const updatedBeatGrid: BeatGrid = {
    ...track.beatGrid,
    firstDownbeatSample,
    samplesPerBeat,
    bpm: safeBpm,
    totalBeats,
    confidence: 1.0, // manually verified or recalibrated
    beatSamples,
    isDownbeat
  };

  return {
    ...track,
    bpm: safeBpm,
    beatGrid: updatedBeatGrid,
    warpMap: {
      transientMarkers
    }
  };
}

/**
 * Runs the MASAVU BeatGrid Refinement pipeline on a track's existing beatGrid.
 * Aligns vertical grid markers onto actual musical pulse before synchronization.
 */
export function refineTrackBeatGrid(track: TrackData): { track: TrackData; result: RefinedBeatGridResult } {
  const refiner = new BeatGridRefiner();
  const result = refiner.refineBeatGrid(track.audioBuffer, track.beatGrid);
  const updatedTrack: TrackData = {
    ...track,
    bpm: result.refinedGrid.bpm,
    beatGrid: result.refinedGrid,
    warpMap: {
      ...track.warpMap,
      transientMarkers: result.refinedGrid.beatSamples ?? track.warpMap?.transientMarkers
    }
  };
  return { track: updatedTrack, result };
}

