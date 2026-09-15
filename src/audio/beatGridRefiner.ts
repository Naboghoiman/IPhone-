/**
 * MASAVU Precision BeatGrid Refinement Engine
 *
 * Implements clean-room BeatGrid refinement to fix inaccurate placement
 * of vertical beatGrid markers BEFORE synchronization occurs.
 *
 * Principle:
 * FIRST: make the vertical beatGrid represent the actual musical pulse.
 * THEN: let the existing synchronization system align those grids.
 *
 * Preserves all downstream synchronization and audio features:
 * - Master/slave logic
 * - 0.5x / 1x / 2x tempo-family matching
 * - Kick-snapped launch
 * - Scheduled AudioContext start
 * - Phase controller (deadband/recovery)
 * - Slip, key lock, looper, sampler
 */

import { BeatCandidate, BeatGrid, BeatGridRefinementInfo, DynamicBeatAnchor, TrackData } from '../types/dj';

export interface BeatGridRefinerOptions {
  searchWindowMs?: number;      // Default: ±80 ms
  minBeatsForAnalysis?: number; // Default: 8 beats
  maxBeatsForAnalysis?: number; // Default: 64 beats
  confidenceThresholdAuto?: number;   // Default: 0.65 (High confidence -> auto-apply)
  confidenceThresholdMedium?: number; // Default: 0.40 (Medium confidence -> conservative)
}

export interface RefinedBeatGridResult {
  refinedGrid: BeatGrid;
  refinementInfo: BeatGridRefinementInfo;
  candidates: BeatCandidate[];
}

export class BeatGridRefiner {
  private options: Required<BeatGridRefinerOptions>;

  constructor(options: BeatGridRefinerOptions = {}) {
    this.options = {
      searchWindowMs: options.searchWindowMs ?? 80,
      minBeatsForAnalysis: options.minBeatsForAnalysis ?? 8,
      maxBeatsForAnalysis: options.maxBeatsForAnalysis ?? 64,
      confidenceThresholdAuto: options.confidenceThresholdAuto ?? 0.65,
      confidenceThresholdMedium: options.confidenceThresholdMedium ?? 0.40
    };
  }

  /**
   * Refines a track's beatGrid using multi-band rhythmic novelty, local onset search,
   * error classification (phase vs BPM spacing vs dynamic tempo), and downbeat verification.
   */
  public refineTrack(track: TrackData): TrackData {
    if (!track.audioBuffer || !track.beatGrid) {
      return track;
    }

    const result = this.refineBeatGrid(track.audioBuffer, track.beatGrid);

    return {
      ...track,
      bpm: result.refinedGrid.bpm,
      beatGrid: result.refinedGrid,
      warpMap: {
        ...track.warpMap,
        transientMarkers: result.refinedGrid.beatSamples ?? track.warpMap?.transientMarkers
      }
    };
  }

  /**
   * Primary refinement pipeline.
   * Takes an initial BeatGrid and AudioBuffer, produces an analyzed and refined BeatGrid.
   */
  public refineBeatGrid(
    audioBuffer: AudioBuffer,
    initialGrid: BeatGrid
  ): RefinedBeatGridResult {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const totalFrames = channelData.length;

    // 1. Initial Grid parameters
    const initialBpm = initialGrid.bpm > 0 ? initialGrid.bpm : 120.0;
    const initialSamplesPerBeat = initialGrid.samplesPerBeat > 0
      ? initialGrid.samplesPerBeat
      : (sampleRate * 60) / initialBpm;
    const initialDownbeatSample = Math.max(0, initialGrid.firstDownbeatSample || 0);

    // 2. Build Rhythmic Novelty / Onset Curve
    // Combination of low-frequency kick energy (40-180Hz), broadband spectral flux,
    // and rise-time sharpness. Not waveform amplitude peak alone.
    const { novelty, kickEnvelope, hopSize } = this.buildRhythmicNoveltyCurve(
      channelData,
      sampleRate
    );

    // Generate initial beat predictions to inspect
    const totalPossibleBeats = Math.floor((totalFrames - initialDownbeatSample) / initialSamplesPerBeat);
    const beatsToAnalyze = Math.min(
      this.options.maxBeatsForAnalysis,
      Math.max(this.options.minBeatsForAnalysis, Math.min(totalPossibleBeats, 48))
    );

    const initialBeatSamples: number[] = [];
    for (let b = 0; b < beatsToAnalyze; b++) {
      const s = Math.round(initialDownbeatSample + b * initialSamplesPerBeat);
      if (s < totalFrames) initialBeatSamples.push(s);
    }

    // 3. Local Search Around Each Predicted Beat (±80 ms window)
    const searchRadiusFrames = Math.round((this.options.searchWindowMs / 1000) * sampleRate);
    const candidates: BeatCandidate[] = [];

    for (let i = 0; i < initialBeatSamples.length; i++) {
      const predictedSample = initialBeatSamples[i];
      const candidate = this.findBeatCandidate(
        predictedSample,
        i,
        searchRadiusFrames,
        novelty,
        kickEnvelope,
        hopSize,
        sampleRate,
        totalFrames
      );
      candidates.push(candidate);
    }

    // 4. Examine Many Beats to Classify Error
    const reliableCandidates = candidates.filter((c) => c.isReliable);
    const reliableOffsets = reliableCandidates.map((c) => c.offsetMs);

    // Compute metrics
    const candidateRatio = initialBeatSamples.length > 0
      ? reliableCandidates.length / initialBeatSamples.length
      : 0;

    let medianOffsetMs = 0;
    let madOffsetMs = 0;
    let driftSlopeMsPerBeat = 0;
    let rSquared = 0;

    if (reliableOffsets.length >= 4) {
      medianOffsetMs = this.computeMedian(reliableOffsets);
      const absDevs = reliableOffsets.map((o) => Math.abs(o - medianOffsetMs));
      madOffsetMs = this.computeMedian(absDevs);

      // Linear regression on (beatIndex, offsetMs)
      const reg = this.computeLinearRegression(
        reliableCandidates.map((c) => c.beatIndex),
        reliableCandidates.map((c) => c.offsetMs)
      );
      driftSlopeMsPerBeat = reg.slope;
      rSquared = reg.rSquared;
    }

    // 5. Confidence Calculation (Section 10)
    // High confidence: >= 0.65 -> apply automatic correction
    // Medium confidence: 0.40 - 0.65 -> conservative phase shift
    // Low confidence: < 0.40 -> leave current beatGrid unchanged
    let confidence = 0.5;
    if (reliableCandidates.length >= 8) {
      const consistencyBonus = Math.max(0, 1 - madOffsetMs / 30);
      const linearityBonus = Math.abs(driftSlopeMsPerBeat) > 0.35 ? rSquared : (1 - Math.min(1, Math.abs(driftSlopeMsPerBeat)));
      confidence = Math.min(0.98, Math.max(0.2, 0.4 * candidateRatio + 0.35 * consistencyBonus + 0.25 * linearityBonus));
    } else if (reliableCandidates.length >= 4) {
      confidence = Math.min(0.60, 0.4 * candidateRatio + 0.2);
    } else {
      confidence = 0.25; // Low confidence
    }

    // Check if confidence is too low to modify (Section 10)
    if (confidence < this.options.confidenceThresholdMedium || reliableCandidates.length < 4) {
      const unrefinedInfo: BeatGridRefinementInfo = {
        classification: 'STRAIGHT',
        confidence,
        applied: false,
        globalOffsetMs: medianOffsetMs,
        bpmDriftSlope: driftSlopeMsPerBeat,
        originalBpm: initialBpm,
        refinedBpm: initialBpm,
        detectedCandidateCount: candidates.length,
        reliableCandidateCount: reliableCandidates.length,
        statusMessage: `Low onset confidence (${(confidence * 100).toFixed(0)}%) - BeatGrid retained unchanged for safety.`
      };

      return {
        refinedGrid: {
          ...initialGrid,
          gridType: 'STRAIGHT',
          refinementInfo: unrefinedInfo
        },
        refinementInfo: unrefinedInfo,
        candidates
      };
    }

    // 6. Error Classification: Straight vs Dynamic & Phase vs Spacing (Sections 4, 6, 7, 8)
    let classification: 'STRAIGHT' | 'DYNAMIC' = 'STRAIGHT';
    let refinedBpm = initialBpm;
    let refinedSamplesPerBeat = initialSamplesPerBeat;
    let refinedDownbeatSample = initialDownbeatSample;
    let dynamicAnchors: DynamicBeatAnchor[] | undefined = undefined;
    let statusMessage = '';

    // Check for Dynamic / Variable Tempo Mode (Section 7 & 8)
    // Check if multi-bar chunks have persistent tempo drift that cannot be explained
    // by simple swing or single linear slope.
    const dynamicCheck = this.evaluateDynamicTempo(reliableCandidates, sampleRate, initialSamplesPerBeat);

    if (dynamicCheck.isDynamic && confidence >= this.options.confidenceThresholdAuto) {
      classification = 'DYNAMIC';
      dynamicAnchors = dynamicCheck.anchors;
      refinedBpm = dynamicCheck.averageBpm;
      refinedSamplesPerBeat = (sampleRate * 60) / refinedBpm;
      refinedDownbeatSample = dynamicCheck.anchors[0]?.sourceSample ?? initialDownbeatSample;
      statusMessage = `DYNAMIC grid: ${dynamicCheck.anchors.length} tempo anchors interpolated across track (${refinedBpm.toFixed(1)} avg BPM).`;
    } else if (Math.abs(driftSlopeMsPerBeat) >= 0.35 && rSquared >= 0.60 && reliableCandidates.length >= 6) {
      // BPM / Grid Spacing Correction (Section 6)
      // Error increases linearly over time -> refine BPM and spacing
      const initialPeriodSec = 60 / initialBpm;
      const slopeSecPerBeat = driftSlopeMsPerBeat / 1000;
      const refinedPeriodSec = initialPeriodSec + slopeSecPerBeat;
      refinedBpm = Math.round((60 / refinedPeriodSec) * 100) / 100;
      refinedSamplesPerBeat = (sampleRate * 60) / refinedBpm;

      // Phase intercept at beat 0
      const reg = this.computeLinearRegression(
        reliableCandidates.map((c) => c.beatIndex),
        reliableCandidates.map((c) => c.offsetMs)
      );
      const phaseInterceptMs = reg.intercept;
      const phaseShiftSamples = Math.round((phaseInterceptMs / 1000) * sampleRate);
      refinedDownbeatSample = Math.max(0, initialDownbeatSample + phaseShiftSamples);

      statusMessage = `BPM Spacing Refined: ${initialBpm.toFixed(2)} -> ${refinedBpm.toFixed(2)} BPM (drift slope ${driftSlopeMsPerBeat > 0 ? '+' : ''}${driftSlopeMsPerBeat.toFixed(2)}ms/beat corrected).`;
    } else if (Math.abs(medianOffsetMs) >= 2.0) {
      // Global Grid Offset Correction (Section 5)
      // Most reliable beat candidates show approximately the same offset
      const shiftSamples = Math.round((medianOffsetMs / 1000) * sampleRate);
      refinedDownbeatSample = Math.max(0, initialDownbeatSample + shiftSamples);
      statusMessage = `Global Grid Phase Refined: Shifted by ${medianOffsetMs > 0 ? '+' : ''}${medianOffsetMs.toFixed(1)}ms to align with physical kick pulse.`;
    } else {
      statusMessage = `Grid verified accurate (residual phase offset ${medianOffsetMs > 0 ? '+' : ''}${medianOffsetMs.toFixed(1)}ms within 2ms tolerance).`;
    }

    // Keep downbeat within [0, samplesPerBeat)
    while (refinedDownbeatSample >= refinedSamplesPerBeat) {
      refinedDownbeatSample -= Math.round(refinedSamplesPerBeat);
    }

    // 7. Downbeat Detection (Section 9)
    // Separate beat detection from downbeat detection. Determine beat 1 boundaries
    // using bar-level rhythmic energy contrast. Preserve 1 2 3 4 across track.
    const downbeatPhase = this.detectDownbeatBarPhase(
      refinedDownbeatSample,
      refinedSamplesPerBeat,
      kickEnvelope,
      hopSize,
      totalFrames
    );

    if (downbeatPhase > 0) {
      refinedDownbeatSample = Math.round(refinedDownbeatSample + downbeatPhase * refinedSamplesPerBeat);
      statusMessage += ` Downbeat (Beat 1) re-aligned to bar phase ${downbeatPhase + 1}.`;
    }

    // 8. Rebuild full beat samples & downbeat flags (Section 12 interface)
    const totalBeats = Math.floor((totalFrames - refinedDownbeatSample) / refinedSamplesPerBeat);
    const beatSamples: number[] = [];
    const isDownbeat: boolean[] = [];

    if (classification === 'DYNAMIC' && dynamicAnchors && dynamicAnchors.length >= 2) {
      // Interpolate dynamic anchors
      const anchoredBeats = this.interpolateDynamicBeatSamples(
        dynamicAnchors,
        totalFrames,
        refinedSamplesPerBeat
      );
      for (let i = 0; i < anchoredBeats.length; i++) {
        beatSamples.push(anchoredBeats[i]);
        isDownbeat.push(i % 4 === 0);
      }
    } else {
      // Straight grid
      for (let b = 0; b < totalBeats; b++) {
        const s = Math.round(refinedDownbeatSample + b * refinedSamplesPerBeat);
        if (s >= totalFrames) break;
        beatSamples.push(s);
        isDownbeat.push(b % 4 === 0);
      }
    }

    const refinementInfo: BeatGridRefinementInfo = {
      classification,
      confidence,
      applied: true,
      globalOffsetMs: medianOffsetMs,
      bpmDriftSlope: driftSlopeMsPerBeat,
      originalBpm: initialBpm,
      refinedBpm,
      detectedCandidateCount: candidates.length,
      reliableCandidateCount: reliableCandidates.length,
      statusMessage,
      dynamicAnchors
    };

    const refinedGrid: BeatGrid = {
      firstDownbeatSample: refinedDownbeatSample,
      samplesPerBeat: refinedSamplesPerBeat,
      bpm: refinedBpm,
      beatsPerBar: 4,
      totalBeats: beatSamples.length,
      confidence,
      beatSamples,
      isDownbeat,
      gridType: classification,
      dynamicAnchors,
      refinementInfo
    };

    return {
      refinedGrid,
      refinementInfo,
      candidates
    };
  }

  /**
   * Builds the multi-band rhythmic novelty curve combining positive spectral flux,
   * low-frequency transient energy (40-180Hz), and rise-time sharpness.
   */
  private buildRhythmicNoveltyCurve(
    channelData: Float32Array,
    sampleRate: number
  ): {
    novelty: Float32Array;
    kickEnvelope: Float32Array;
    hopSize: number;
  } {
    const totalFrames = channelData.length;
    // ~1000 Hz analysis rate for 1ms time resolution
    const hopSize = Math.max(1, Math.floor(sampleRate / 1000));
    const envelopeLength = Math.floor(totalFrames / hopSize);

    // 1-pole Low-pass filter for Kick/Sub-bass: 180 Hz
    const dt = 1 / sampleRate;
    const rcLow = 1 / (2 * Math.PI * 180);
    const alphaLow = dt / (rcLow + dt);

    // 1-pole Band-pass filter for Mid-Snare: 1800 Hz
    const rcMid = 1 / (2 * Math.PI * 1800);
    const alphaMid = dt / (rcMid + dt);

    const kickEnvelope = new Float32Array(envelopeLength);
    const broadbandEnvelope = new Float32Array(envelopeLength);

    let lowFilter = 0;
    let midFilter = 0;

    for (let i = 0; i < envelopeLength; i++) {
      let lowSum = 0;
      let broadSum = 0;
      const start = i * hopSize;
      const end = Math.min(totalFrames, start + hopSize);

      for (let j = start; j < end; j++) {
        const s = channelData[j];
        broadSum += s * s;

        lowFilter = lowFilter + alphaLow * (s - lowFilter);
        lowSum += lowFilter * lowFilter;

        midFilter = midFilter + alphaMid * (s - midFilter);
      }

      const count = Math.max(1, end - start);
      kickEnvelope[i] = Math.sqrt(lowSum / count);
      broadbandEnvelope[i] = Math.sqrt(broadSum / count);
    }

    // Half-wave rectified positive spectral flux
    const novelty = new Float32Array(envelopeLength);
    for (let i = 1; i < envelopeLength; i++) {
      const diffKick = kickEnvelope[i] - kickEnvelope[i - 1];
      const diffBroad = broadbandEnvelope[i] - broadbandEnvelope[i - 1];

      const posKick = diffKick > 0 ? diffKick : 0;
      const posBroad = diffBroad > 0 ? diffBroad : 0;

      // 70% kick transient attack, 30% broadband percussive onset
      novelty[i] = posKick * 0.70 + posBroad * 0.30;
    }

    // Normalize novelty curve to [0, 1]
    let maxNovelty = 0;
    for (let i = 0; i < envelopeLength; i++) {
      if (novelty[i] > maxNovelty) maxNovelty = novelty[i];
    }
    if (maxNovelty > 1e-6) {
      for (let i = 0; i < envelopeLength; i++) {
        novelty[i] /= maxNovelty;
      }
    }

    return { novelty, kickEnvelope, hopSize };
  }

  /**
   * Searches within predictedBeat ± 80ms for strong beat-compatible onset candidates.
   */
  private findBeatCandidate(
    predictedSample: number,
    beatIndex: number,
    searchRadiusFrames: number,
    novelty: Float32Array,
    kickEnvelope: Float32Array,
    hopSize: number,
    sampleRate: number,
    totalFrames: number
  ): BeatCandidate {
    const startSample = Math.max(0, predictedSample - searchRadiusFrames);
    const endSample = Math.min(totalFrames - 1, predictedSample + searchRadiusFrames);

    const startHop = Math.floor(startSample / hopSize);
    const endHop = Math.min(novelty.length - 1, Math.floor(endSample / hopSize));

    let maxVal = 0;
    let maxHop = Math.floor(predictedSample / hopSize);
    let localNoiseFloor = 0;
    let hopCount = 0;

    for (let h = startHop; h <= endHop; h++) {
      const val = novelty[h];
      localNoiseFloor += val;
      hopCount++;
      if (val > maxVal) {
        maxVal = val;
        maxHop = h;
      }
    }

    const avgNoise = hopCount > 0 ? localNoiseFloor / hopCount : 0;
    const detectedOnsetSample = maxHop * hopSize;
    const offsetMs = ((detectedOnsetSample - predictedSample) / sampleRate) * 1000;
    const lowFreqStrength = kickEnvelope[maxHop] || 0;

    // Confidence combines peak height, prominence over local noise, and distance
    const prominence = maxVal - avgNoise;
    const distancePenalty = Math.max(0, 1 - Math.abs(offsetMs) / 80);
    const candidateConfidence = Math.min(1.0, Math.max(0, (maxVal * 0.4 + prominence * 0.4 + distancePenalty * 0.2)));

    // Reliable if onset is distinct and confidence is reasonable
    const isReliable = maxVal >= 0.12 && candidateConfidence >= 0.35 && prominence > 0.05;

    return {
      beatIndex,
      predictedSample,
      detectedOnsetSample,
      offsetMs,
      onsetStrength: maxVal,
      lowFrequencyStrength: lowFreqStrength,
      confidence: candidateConfidence,
      isReliable
    };
  }

  /**
   * Differentiates true dynamic tempo drift from simple swing or syncopation (Section 7 & 8).
   * Aggregates by 4-beat bars to cancel out swing/syncopation before assessing tempo changes.
   */
  private evaluateDynamicTempo(
    reliableCandidates: BeatCandidate[],
    sampleRate: number,
    expectedSamplesPerBeat: number
  ): {
    isDynamic: boolean;
    averageBpm: number;
    anchors: DynamicBeatAnchor[];
  } {
    if (reliableCandidates.length < 16) {
      return { isDynamic: false, averageBpm: 0, anchors: [] };
    }

    // Group candidates by 4-beat bars
    const barGroups = new Map<number, BeatCandidate[]>();
    for (const c of reliableCandidates) {
      const barIdx = Math.floor(c.beatIndex / 4);
      if (!barGroups.has(barIdx)) barGroups.set(barIdx, []);
      barGroups.get(barIdx)!.push(c);
    }

    const sortedBars = Array.from(barGroups.keys()).sort((a, b) => a - b);
    if (sortedBars.length < 4) {
      return { isDynamic: false, averageBpm: 0, anchors: [] };
    }

    const barTempos: { barIdx: number; samplePos: number; localBpm: number }[] = [];

    for (let i = 0; i < sortedBars.length - 1; i++) {
      const b1 = sortedBars[i];
      const b2 = sortedBars[i + 1];
      const c1 = barGroups.get(b1)![0];
      const c2 = barGroups.get(b2)![0];

      const beatDelta = c2.beatIndex - c1.beatIndex;
      const sampleDelta = c2.detectedOnsetSample - c1.detectedOnsetSample;

      if (beatDelta > 0 && sampleDelta > 0) {
        const samplesPerBeat = sampleDelta / beatDelta;
        const localBpm = (sampleRate * 60) / samplesPerBeat;
        // Check sanity (40 - 220 BPM)
        if (localBpm >= 40 && localBpm <= 220) {
          barTempos.push({
            barIdx: b1,
            samplePos: c1.detectedOnsetSample,
            localBpm
          });
        }
      }
    }

    if (barTempos.length < 3) {
      return { isDynamic: false, averageBpm: 0, anchors: [] };
    }

    // Compute standard deviation of bar tempos
    const bpms = barTempos.map((b) => b.localBpm);
    const meanBpm = bpms.reduce((a, b) => a + b, 0) / bpms.length;
    const variance = bpms.reduce((a, b) => a + Math.pow(b - meanBpm, 2), 0) / bpms.length;
    const stdDevBpm = Math.sqrt(variance);

    // True dynamic tempo drift has stdDev > 2.5 BPM across consecutive bars
    const isDynamic = stdDevBpm >= 2.5;

    const anchors: DynamicBeatAnchor[] = [];
    if (isDynamic) {
      for (const item of barTempos) {
        anchors.push({
          beatIndex: item.barIdx * 4,
          sourceSample: item.samplePos,
          localBpm: Math.round(item.localBpm * 10) / 10,
          confidence: 0.85
        });
      }
    }

    return {
      isDynamic,
      averageBpm: Math.round(meanBpm * 10) / 10,
      anchors
    };
  }

  /**
   * Interpolates beat positions smoothly between dynamic anchors (Section 7).
   */
  private interpolateDynamicBeatSamples(
    anchors: DynamicBeatAnchor[],
    totalFrames: number,
    fallbackSamplesPerBeat: number
  ): number[] {
    const beatSamples: number[] = [];
    if (anchors.length === 0) return beatSamples;

    // Fill beats before the first anchor
    const firstAnchor = anchors[0];
    const preBeats = firstAnchor.beatIndex;
    for (let b = preBeats; b > 0; b--) {
      const s = Math.round(firstAnchor.sourceSample - b * fallbackSamplesPerBeat);
      if (s >= 0) beatSamples.push(s);
    }
    beatSamples.push(firstAnchor.sourceSample);

    // Interpolate between successive anchors
    for (let a = 0; a < anchors.length - 1; a++) {
      const a1 = anchors[a];
      const a2 = anchors[a + 1];
      const beatsBetween = a2.beatIndex - a1.beatIndex;
      const sampleSpan = a2.sourceSample - a1.sourceSample;
      const step = sampleSpan / beatsBetween;

      for (let b = 1; b < beatsBetween; b++) {
        beatSamples.push(Math.round(a1.sourceSample + b * step));
      }
      beatSamples.push(a2.sourceSample);
    }

    // Extrapolate after the last anchor
    const lastAnchor = anchors[anchors.length - 1];
    const lastStep = fallbackSamplesPerBeat;
    let curr = lastAnchor.sourceSample + lastStep;
    while (curr < totalFrames) {
      beatSamples.push(Math.round(curr));
      curr += lastStep;
    }

    return beatSamples;
  }

  /**
   * Downbeat Detection (Section 9):
   * Evaluates candidate downbeat phases (0, 1, 2, 3) across multiple bars
   * using rhythmic kick energy contrast to identify Beat 1.
   */
  private detectDownbeatBarPhase(
    firstBeatSample: number,
    samplesPerBeat: number,
    kickEnvelope: Float32Array,
    hopSize: number,
    totalFrames: number
  ): number {
    const phaseScores = [0, 0, 0, 0];
    const maxBarsToTest = 16;

    for (let bar = 0; bar < maxBarsToTest; bar++) {
      for (let p = 0; p < 4; p++) {
        const beatSample = Math.round(firstBeatSample + (bar * 4 + p) * samplesPerBeat);
        if (beatSample >= totalFrames) continue;

        const hop = Math.floor(beatSample / hopSize);
        if (hop >= 0 && hop < kickEnvelope.length) {
          // Downbeats in 4/4 electronic/pop/afro/rock rhythm have highest kick weight
          phaseScores[p] += kickEnvelope[hop];
        }
      }
    }

    let bestPhase = 0;
    let maxScore = phaseScores[0];
    for (let p = 1; p < 4; p++) {
      if (phaseScores[p] > maxScore) {
        maxScore = phaseScores[p];
        bestPhase = p;
      }
    }

    // Require notable contrast (> 20% stronger than average of other phases)
    const otherAvg = (phaseScores.reduce((a, b) => a + b, 0) - maxScore) / 3;
    if (otherAvg > 0 && (maxScore - otherAvg) / otherAvg > 0.20) {
      return bestPhase;
    }

    return 0; // Default to phase 0 if no strong bar contrast
  }

  private computeMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private computeLinearRegression(
    x: number[],
    y: number[]
  ): { slope: number; intercept: number; rSquared: number } {
    const n = x.length;
    if (n < 2) return { slope: 0, intercept: y[0] || 0, rSquared: 0 };

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumXX += x[i] * x[i];
      sumYY += y[i] * y[i];
    }

    const meanX = sumX / n;
    const meanY = sumY / n;

    const denominator = sumXX - sumX * meanX;
    if (Math.abs(denominator) < 1e-9) {
      return { slope: 0, intercept: meanY, rSquared: 0 };
    }

    const slope = (sumXY - sumX * meanY) / denominator;
    const intercept = meanY - slope * meanX;

    // Compute R^2
    const totalSS = sumYY - sumY * meanY;
    let residualSS = 0;
    for (let i = 0; i < n; i++) {
      const pred = intercept + slope * x[i];
      residualSS += Math.pow(y[i] - pred, 2);
    }

    const rSquared = totalSS > 1e-9 ? Math.max(0, 1 - residualSS / totalSS) : 0;

    return { slope, intercept, rSquared };
  }
}
