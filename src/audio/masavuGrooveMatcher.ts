/**
 * MASAVU RHYTHMIC GROOVE MATCHER
 *
 * Rhythmic synchronization layer that operates on top of the structural beat grid.
 *
 * PURPOSE:
 * Improves rhythmic synchronization when important kicks or drum transients
 * occur between vertical beat-grid markers (e.g., syncopated grooves, Afrobeat,
 * swung house, live percussion, off-grid kick attacks).
 *
 * ARCHITECTURAL PRINCIPLES:
 * 1. BEAT GRID = STRUCTURAL CLOCK (BPM, Bars, Downbeats, Long-term Reference)
 * 2. GROOVE MAP = RHYTHMIC SYNCHRONIZATION (Transient Onsets & Kick Timing Offsets)
 * 3. ANALYZES A 1-2 BAR MUSICAL WINDOW (Does NOT rely on only one kick)
 * 4. ONE GLOBAL RHYTHMIC PHASE RELATIONSHIP (Preserves natural groove, no micro-warping)
 * 5. CONFIDENCE FALLBACK (High -> Groove Match; Medium -> Kick Snap; Low -> Beat Grid)
 * 6. OUTPUT ONLY AN OFFSET / SOURCE SAMPLE (Supplies position to existing launch engine)
 * 7. PRESERVES DESIRED GROOVE OFFSET IN PHASE CONTROLLER (actualRhythmicOffset ≈ desiredGrooveOffsetMs)
 */

import { BeatGrid, GrooveEvent, GrooveMatch, GroovePattern, TrackData } from '../types/dj';

export interface GrooveMatcherConfig {
  /** Width of Gaussian similarity bell-curve in milliseconds. Default: 30ms */
  sigmaMs: number;
  /** Minimum kicks required for high-confidence pattern match. Default: 2 */
  minKicksForHighConfidence: number;
  /** High confidence threshold for applying groove alignment. Default: 0.65 */
  highConfidenceThreshold: number;
  /** Medium confidence threshold for kick-snap fallback. Default: 0.35 */
  mediumConfidenceThreshold: number;
  /** Search window around theoretical beat for kick discovery as fraction of beat. Default: 0.85 */
  beatIntervalFraction: number;
}

export const DEFAULT_GROOVE_CONFIG: GrooveMatcherConfig = {
  sigmaMs: 30.0,
  minKicksForHighConfidence: 2,
  highConfidenceThreshold: 0.65,
  mediumConfidenceThreshold: 0.35,
  beatIntervalFraction: 0.85
};

export class MasavuGrooveMatcher {
  private config: GrooveMatcherConfig;

  constructor(config: Partial<GrooveMatcherConfig> = {}) {
    this.config = { ...DEFAULT_GROOVE_CONFIG, ...config };
  }

  public updateConfig(config: Partial<GrooveMatcherConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): GrooveMatcherConfig {
    return { ...this.config };
  }

  /**
   * SECTION 2: CREATE A GROOVE MAP
   *
   * For every beat interval detect significant rhythmic transients.
   * Stores:
   *   beatIndex, samplePosition, offsetFromBeatMs, type ('kick'|'transient'),
   *   strength (0.0-1.0), confidence (0.0-1.0).
   *
   * Executed independently for Master and Slave tracks.
   */
  public extractGrooveMap(track: TrackData): GrooveEvent[] {
    // Return cached groove map if already computed
    if (track.grooveMap && track.grooveMap.length > 0) {
      return track.grooveMap;
    }

    const grid = this.safeGrid(track.beatGrid, track.sampleRate, track.bpm);
    const totalBeats = grid.totalBeats > 0
      ? grid.totalBeats
      : Math.floor((track.duration * track.sampleRate) / Math.max(1, grid.samplesPerBeat));

    const events: GrooveEvent[] = [];
    const channelData = track.audioBuffer ? track.audioBuffer.getChannelData(0) : null;
    const totalFrames = channelData ? channelData.length : Math.round(track.duration * track.sampleRate);
    const transientMarkers = track.warpMap?.transientMarkers || [];

    // Pre-sort transient markers for fast binary search
    const sortedTransients = [...transientMarkers].sort((a, b) => a - b);

    for (let b = 0; b < totalBeats; b++) {
      const beatSample = this.beatIndexToSample(b, grid);
      const nextBeatSample = this.beatIndexToSample(b + 1, grid);
      const beatSpan = Math.max(1, nextBeatSample - beatSample);

      // Search range within the beat interval
      const intervalStart = Math.max(0, beatSample - Math.round(beatSpan * 0.12));
      const intervalEnd = Math.min(totalFrames - 1, beatSample + Math.round(beatSpan * this.config.beatIntervalFraction));

      let bestSamplePosition = beatSample;
      let bestStrength = 0.5;
      let bestConfidence = 0.5;
      let detectedType: 'kick' | 'transient' = 'kick';
      let foundSignificantEvent = false;

      // 1. Check pre-analyzed transient markers in this beat interval
      const matchingMarkers = sortedTransients.filter(
        (pos) => pos >= intervalStart && pos <= intervalEnd
      );

      if (matchingMarkers.length > 0) {
        // Choose the transient with the highest local energy
        let maxEnergy = 0;
        for (const marker of matchingMarkers) {
          let markerEnergy = 0.6;
          if (channelData) {
            // Measure low-pass/kick energy around transient marker (+/- 15ms)
            const rad = Math.min(Math.round(track.sampleRate * 0.015), 1000);
            const sStart = Math.max(0, marker - rad);
            const sEnd = Math.min(totalFrames - 1, marker + rad);
            let sum = 0;
            for (let i = sStart; i <= sEnd; i += 4) {
              const val = Math.abs(channelData[i]);
              if (val > sum) sum = val;
            }
            markerEnergy = sum;
          }

          if (markerEnergy > maxEnergy) {
            maxEnergy = markerEnergy;
            bestSamplePosition = marker;
            bestStrength = Math.min(1.0, Math.max(0.2, markerEnergy));
            bestConfidence = 0.90;
            detectedType = markerEnergy > 0.4 ? 'kick' : 'transient';
            foundSignificantEvent = true;
          }
        }
      }

      // 2. If no transient marker exists or audio buffer is directly accessible,
      // discover prominent kick attack in this beat interval
      if (!foundSignificantEvent && channelData) {
        let maxVal = 0;
        let peakSample = beatSample;

        // Search with sub-sampling for peak energy
        for (let s = intervalStart; s <= intervalEnd; s += 8) {
          const val = Math.abs(channelData[s]);
          if (val > maxVal) {
            maxVal = val;
            peakSample = s;
          }
        }

        if (maxVal > 0.10) {
          bestSamplePosition = peakSample;
          bestStrength = Math.min(1.0, maxVal);
          bestConfidence = Math.min(0.95, Math.max(0.4, maxVal * 1.2));
          detectedType = maxVal > 0.35 ? 'kick' : 'transient';
          foundSignificantEvent = true;
        }
      }

      // Compute signed offset from the mathematical beat-grid marker in milliseconds
      const offsetFromBeatMs = ((bestSamplePosition - beatSample) / track.sampleRate) * 1000;

      events.push({
        beatIndex: b,
        samplePosition: bestSamplePosition,
        offsetFromBeatMs,
        type: detectedType,
        strength: foundSignificantEvent ? bestStrength : 0.4,
        confidence: foundSignificantEvent ? bestConfidence : 0.3
      });
    }

    // Cache on track object for performance
    track.grooveMap = events;
    return events;
  }

  /**
   * SECTION 3: ANALYZE A MUSICAL WINDOW
   *
   * Extracts a 1-to-2 bar musical groove pattern window around the reference beat.
   * Minimum: 1 bar.
   * Preferred: 2 bars (8 beats in 4/4) when audio is available.
   * Does NOT rely on only one kick.
   */
  public extractGroovePattern(
    track: TrackData,
    centerBeatIndex: number,
    windowBars = 2
  ): GroovePattern {
    const grooveMap = this.extractGrooveMap(track);
    const beatsPerBar = Math.max(1, track.beatGrid.beatsPerBar || 4);

    // Anchor window to the start of the musical bar
    const currentBar = Math.floor(centerBeatIndex / beatsPerBar);
    const startBeatIndex = Math.max(0, currentBar * beatsPerBar);

    // Check available beats
    let actualBars = windowBars;
    let endBeatIndex = startBeatIndex + actualBars * beatsPerBar - 1;

    if (endBeatIndex >= grooveMap.length) {
      // If 2 bars exceed track length, fall back to 1 bar
      actualBars = 1;
      endBeatIndex = Math.min(grooveMap.length - 1, startBeatIndex + beatsPerBar - 1);
    }

    const events: GrooveEvent[] = [];
    for (let b = startBeatIndex; b <= endBeatIndex; b++) {
      if (grooveMap[b]) {
        events.push(grooveMap[b]);
      }
    }

    return {
      events,
      startBeatIndex,
      endBeatIndex,
      barsCount: actualBars
    };
  }

  /**
   * SECTION 4: FIND BEST RHYTHMIC ALIGNMENT
   *
   * Compares candidate slave beat/bar alignments against the master groove pattern.
   *
   * Conceptual score:
   *   timingError = masterKickOffsetMs - slaveKickOffsetMs
   *   similarity = exp(-(timingError * timingError) / sigmaSquared)
   *   score += masterStrength * slaveStrength * masterConfidence * slaveConfidence * similarity
   *
   * Chooses the alignment with the highest total pattern score.
   *
   * SECTION 5: OUTPUT ONLY AN OFFSET / START POSITION
   * Returns GrooveMatch with slaveSourceSample and grooveOffsetMs.
   * IT MUST NOT START AUDIO ITSELF.
   *
   * SECTION 8: CONFIDENCE FALLBACK
   * - High confidence: GrooveMatch.slaveSourceSample
   * - Medium confidence: existing kick-snapped launch
   * - Low confidence: existing beat-grid/downbeat launch
   */
  public findBestGrooveMatch(params: {
    masterTrack: TrackData;
    slaveTrack: TrackData;
    targetMasterBeatIndex: number;
    candidateSlaveBeatIndex: number;
    slavePlaybackMultiplier: number;
    quantizeMode?: 'beat' | 'bar';
  }): GrooveMatch {
    const {
      masterTrack,
      slaveTrack,
      targetMasterBeatIndex,
      candidateSlaveBeatIndex,
      slavePlaybackMultiplier,
      quantizeMode = 'beat'
    } = params;

    const masterGrid = this.safeGrid(masterTrack.beatGrid, masterTrack.sampleRate, masterTrack.bpm);
    const slaveGrid = this.safeGrid(slaveTrack.beatGrid, slaveTrack.sampleRate, slaveTrack.bpm);

    const masterBeatsPerBar = Math.max(1, masterGrid.beatsPerBar || 4);
    const slaveBeatsPerBar = Math.max(1, slaveGrid.beatsPerBar || 4);

    // 1. Extract Master Pattern (1 - 2 bars window)
    const masterPattern = this.extractGroovePattern(masterTrack, targetMasterBeatIndex, 2);
    const slaveGrooveMap = this.extractGrooveMap(slaveTrack);

    // 2. Identify candidate slave alignments around the requested candidate beat
    const candidateSlaveOffsets: number[] = [];

    if (quantizeMode === 'bar') {
      // Bar-quantized: test candidate downbeat alignments
      const candidateDownbeat = Math.floor(candidateSlaveBeatIndex / slaveBeatsPerBar) * slaveBeatsPerBar;
      for (let barDelta = -1; barDelta <= 2; barDelta++) {
        const beat = candidateDownbeat + barDelta * slaveBeatsPerBar;
        if (beat >= 0 && beat < slaveGrooveMap.length) {
          candidateSlaveOffsets.push(beat);
        }
      }
    } else {
      // Beat-quantized: test candidate beat alignments within +/- 1 bar
      for (let delta = -slaveBeatsPerBar; delta <= slaveBeatsPerBar; delta++) {
        const beat = candidateSlaveBeatIndex + delta;
        if (beat >= 0 && beat < slaveGrooveMap.length) {
          candidateSlaveOffsets.push(beat);
        }
      }
    }

    if (candidateSlaveOffsets.length === 0) {
      candidateSlaveOffsets.push(Math.max(0, candidateSlaveBeatIndex));
    }

    const sigmaSquared = this.config.sigmaMs * this.config.sigmaMs;

    let bestAlignmentScore = -1;
    let bestSlaveBeatIndex = candidateSlaveBeatIndex;
    let bestMatchedKicks = 0;
    let bestAverageErrorMs = 0;
    let bestWeightedGrooveOffsetMs = 0;
    let bestConfidence = 0;

    // 3. Score each candidate alignment across the multi-beat pattern
    for (const candBeat of candidateSlaveOffsets) {
      let currentScore = 0;
      let matchedKicks = 0;
      let weightedTimingErrorSum = 0;
      let weightSum = 0;
      let absErrorSum = 0;

      const numBeatsToCompare = masterPattern.events.length;

      for (let i = 0; i < numBeatsToCompare; i++) {
        const masterEvent = masterPattern.events[i];
        const slaveBeatIdx = candBeat + i;

        if (slaveBeatIdx >= slaveGrooveMap.length) break;
        const slaveEvent = slaveGrooveMap[slaveBeatIdx];
        if (!slaveEvent) continue;

        // Compare corresponding kicks/transients
        const masterKickOffsetMs = masterEvent.offsetFromBeatMs;
        const slaveKickOffsetMs = slaveEvent.offsetFromBeatMs;

        // timingError = masterKickOffsetMs - slaveKickOffsetMs
        const timingError = masterKickOffsetMs - slaveKickOffsetMs;
        const similarity = Math.exp(-(timingError * timingError) / sigmaSquared);

        const weight =
          masterEvent.strength *
          slaveEvent.strength *
          masterEvent.confidence *
          slaveEvent.confidence;

        const pairScore = weight * similarity;
        currentScore += pairScore;

        if (masterEvent.type === 'kick' || slaveEvent.type === 'kick' || weight > 0.25) {
          matchedKicks++;
          weightedTimingErrorSum += timingError * weight;
          weightSum += weight;
          absErrorSum += Math.abs(timingError);
        }
      }

      // Proximity penalty for alignments far from requested candidate beat
      const beatDist = Math.abs(candBeat - candidateSlaveBeatIndex);
      const proximityFactor = Math.max(0.7, 1.0 - beatDist * 0.04);
      const normalizedScore = currentScore * proximityFactor;

      if (normalizedScore > bestAlignmentScore) {
        bestAlignmentScore = normalizedScore;
        bestSlaveBeatIndex = candBeat;
        bestMatchedKicks = matchedKicks;
        bestAverageErrorMs = matchedKicks > 0 ? absErrorSum / matchedKicks : 0;
        bestWeightedGrooveOffsetMs = weightSum > 0 ? weightedTimingErrorSum / weightSum : 0;

        // Composite confidence score
        const kickCountFactor = Math.min(1.0, matchedKicks / Math.max(1, this.config.minKicksForHighConfidence));
        const avgWeight = weightSum / Math.max(1, matchedKicks);
        const errorFactor = Math.max(0.1, 1.0 - bestAverageErrorMs / 60.0);
        bestConfidence = Math.min(0.98, Math.max(0.1, kickCountFactor * avgWeight * errorFactor));
      }
    }

    // 4. Determine applied mode via Confidence Fallback (Section 8)
    const selectedSlaveBeatSample = this.beatIndexToSample(bestSlaveBeatIndex, slaveGrid);
    const existingNearestKickSample = this.findNearestTransientToBeat(
      slaveTrack,
      selectedSlaveBeatSample,
      slaveGrid.samplesPerBeat
    );

    let appliedMode: 'groove' | 'kick-snap' | 'grid' = 'grid';
    let slaveSourceSample = selectedSlaveBeatSample;
    let effectiveGrooveOffsetMs = 0;

    // SECTION 8: CONFIDENCE FALLBACK DECISION
    if (bestConfidence >= this.config.highConfidenceThreshold && bestMatchedKicks >= this.config.minKicksForHighConfidence) {
      // HIGH CONFIDENCE -> Use Groove Matcher
      appliedMode = 'groove';
      effectiveGrooveOffsetMs = bestWeightedGrooveOffsetMs;

      // SECTION 5 & 10: Position slave source sample so slave kick attack coincides with master kick!
      // Master kick sounds at masterKickOffsetMs.
      // Slave kick is at slaveKickOffsetMs.
      // Offset required: bestWeightedGrooveOffsetMs = masterKickOffsetMs - slaveKickOffsetMs.
      // Adjusting slaveSourceSample by -effectiveGrooveOffsetMs shifts slave audio so that
      // its rhythmic kick occurs at the exact same audio output instant as the master kick.
      const sampleOffset = Math.round(
        (effectiveGrooveOffsetMs / 1000) * slaveTrack.sampleRate * slavePlaybackMultiplier
      );

      // Start position is anchored relative to the selected slave beat minus the groove offset
      slaveSourceSample = Math.max(0, selectedSlaveBeatSample - sampleOffset);

    } else if (bestConfidence >= this.config.mediumConfidenceThreshold && existingNearestKickSample !== null) {
      // MEDIUM CONFIDENCE -> Fall back to existing kick-snapped launch
      appliedMode = 'kick-snap';
      slaveSourceSample = existingNearestKickSample;
      effectiveGrooveOffsetMs = ((existingNearestKickSample - selectedSlaveBeatSample) / slaveTrack.sampleRate) * 1000;

    } else {
      // LOW CONFIDENCE -> Fall back to existing beat-grid/downbeat launch
      appliedMode = 'grid';
      slaveSourceSample = selectedSlaveBeatSample;
      effectiveGrooveOffsetMs = 0;
    }

    return {
      slaveBeatIndex: bestSlaveBeatIndex,
      slaveSourceSample,
      grooveOffsetMs: effectiveGrooveOffsetMs,
      matchedKickCount: bestMatchedKicks,
      averageKickErrorMs: bestAverageErrorMs,
      confidence: bestConfidence,
      score: bestAlignmentScore,
      appliedMode
    };
  }

  private findNearestTransientToBeat(
    track: TrackData,
    beatSample: number,
    samplesPerBeat: number
  ): number | null {
    const transients = track.warpMap?.transientMarkers;
    if (!transients || transients.length === 0 || samplesPerBeat <= 0) return null;

    const maxDistance = Math.max(1, samplesPerBeat * 0.18);
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const marker of transients) {
      const distance = Math.abs(marker - beatSample);
      if (distance <= maxDistance && distance < bestDistance) {
        best = marker;
        bestDistance = distance;
      }
    }
    return best;
  }

  private beatIndexToSample(index: number, grid: BeatGrid): number {
    const exact = grid.beatSamples?.[index];
    if (Number.isFinite(exact)) return Math.max(0, Math.round(exact));
    return Math.max(0, Math.round(grid.firstDownbeatSample + index * grid.samplesPerBeat));
  }

  private safeGrid(grid: BeatGrid, sampleRate: number, bpm: number): BeatGrid {
    if (grid && Number.isFinite(grid.samplesPerBeat) && grid.samplesPerBeat > 0) return grid;
    const safeBpm = Number.isFinite(bpm) && bpm >= 20 && bpm <= 300 ? bpm : 120;
    const samplesPerBeat = (sampleRate * 60) / safeBpm;
    return {
      firstDownbeatSample: 0,
      samplesPerBeat,
      bpm: safeBpm,
      beatsPerBar: 4,
      totalBeats: Number.MAX_SAFE_INTEGER,
      confidence: 0,
      beatSamples: [],
      isDownbeat: []
    };
  }
}
