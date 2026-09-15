/**
 * VirtualDJ-8-style synchronization behaviour for MASAVU.
 *
 * CLEAN-ROOM IMPLEMENTATION:
 * This file reproduces publicly observable DJ sync behaviour (tempo-family
 * matching, beat/bar quantized launch, master/slave phase alignment and
 * kick-preferred start) without using VirtualDJ proprietary source code.
 *
 * Design rule for MASAVU: prepare tempo + phase before launch, then keep the
 * stable tempo. Do not run a permanent audible auto-nudge loop.
 */

import { BeatGrid, GrooveMatch, SlaveStartPlan, TrackData } from '../types/dj';
import { MasavuGrooveMatcher } from './masavuGrooveMatcher';

export interface TempoFamilyMatch {
  /** 0.5, 1.0 or 2.0 interpretation of the slave analysis BPM. */
  familyFactor: 0.5 | 1 | 2;
  /** Slave BPM interpreted in the family closest to the master BPM. */
  equivalentSlaveBpm: number;
  /** Stable playback multiplier to match the master musical tempo family. */
  playbackMultiplier: number;
  /** Relative mismatch before time-stretching. Lower is better. */
  logTempoDistance: number;
}

export interface DownbeatPhaseTelemetry {
  masterBeatInBar: number; // 0, 1, 2, 3 (where 0 is Beat 1 downbeat)
  slaveBeatInBar: number;  // 0, 1, 2, 3
  masterBarIndex: number;
  slaveBarIndex: number;
  downbeatOffsetBeats: number; // 0 means downbeats are matched!
  isDownbeatMatched: boolean;  // true when downbeatOffsetBeats === 0
  isCurrentlyOnDownbeat: boolean; // true when both are playing beat 1
}

export interface Vdj8StyleLaunchPlan extends SlaveStartPlan {
  familyFactor: 0.5 | 1 | 2;
  equivalentSlaveBpm: number;
  targetMasterBeatIndex: number;
  targetSlaveBeatIndex: number;
  selectedSlaveBeatSample: number;
  /** True when a transient close to the selected beat was used as the audible launch point. */
  kickSnapped: boolean;
  /** Signed transient offset from the mathematical beat grid, in milliseconds at source speed. */
  kickOffsetMs: number;
  quantizeMode: 'beat' | 'bar';
  /** MASAVU Rhythmic Groove Matcher result */
  grooveMatch?: GrooveMatch;
  /** Preserved rhythmic groove phase offset for the phase controller */
  desiredGrooveOffsetMs?: number;
}

export interface Vdj8StyleSyncConfig {
  /** Minimum scheduling headroom before the target master beat. */
  minLookaheadSeconds: number;
  /** Search window around a beat for an analysed transient, as a fraction of one beat. */
  kickSearchWindowBeats: number;
  /** When BPM family is half/double, prefer a downbeat to remove beat ambiguity. */
  forceDownbeatForHalfDouble: boolean;
  /** Optional measured processing latency fields for telemetry/native-port parity. */
  decoderLatencyFrames: number;
  timeStretcherLatencyFrames: number;
  audioBufferLatencyFrames: number;
}

const DEFAULT_CONFIG: Vdj8StyleSyncConfig = {
  minLookaheadSeconds: 0.055,
  kickSearchWindowBeats: 0.18,
  forceDownbeatForHalfDouble: true,
  decoderLatencyFrames: 0,
  timeStretcherLatencyFrames: 0,
  audioBufferLatencyFrames: 0
};

export class Vdj8StyleSyncEngine {
  private config: Vdj8StyleSyncConfig;
  private grooveMatcher: MasavuGrooveMatcher;

  constructor(config: Partial<Vdj8StyleSyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.grooveMatcher = new MasavuGrooveMatcher();
  }

  public updateConfig(config: Partial<Vdj8StyleSyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): Vdj8StyleSyncConfig {
    return { ...this.config };
  }

  public getGrooveMatcher(): MasavuGrooveMatcher {
    return this.grooveMatcher;
  }

  /**
   * VirtualDJ-style tempo family selection: compare 0.5x / 1x / 2x BPM
   * interpretations and choose the one needing the smallest time-stretch.
   */
  public matchTempoFamily(masterBpm: number, slaveBpm: number): TempoFamilyMatch {
    const master = this.safeBpm(masterBpm);
    const slave = this.safeBpm(slaveBpm);
    const factors: Array<0.5 | 1 | 2> = [0.5, 1, 2];

    let best: TempoFamilyMatch | null = null;
    for (const factor of factors) {
      const equivalentSlaveBpm = slave * factor;
      const playbackMultiplier = master / equivalentSlaveBpm;
      const logTempoDistance = Math.abs(Math.log2(playbackMultiplier));
      const candidate: TempoFamilyMatch = {
        familyFactor: factor,
        equivalentSlaveBpm,
        playbackMultiplier,
        logTempoDistance
      };

      if (!best || candidate.logTempoDistance < best.logTempoDistance) {
        best = candidate;
      } else if (
        best &&
        Math.abs(candidate.logTempoDistance - best.logTempoDistance) < 1e-9 &&
        factor === 1
      ) {
        // Prefer the native analysis family on an exact tie.
        best = candidate;
      }
    }

    return best!;
  }

  /**
   * Builds the complete synchronized launch plan on the same AudioContext clock
   * used by both decks. The selected slave source position is a matching beat,
   * optionally snapped to a nearby analysed transient so the audible kick attack
   * itself lands on the master's target beat.
   */
  public createLaunchPlan(params: {
    audioContextCurrentTime: number;
    outputSampleRate: number;
    masterTrack: TrackData;
    slaveTrack: TrackData;
    masterCurrentSourceSample: number;
    slaveCurrentSourceSample: number;
    masterEffectiveBpm: number;
    slaveIsPlaying: boolean;
    quantizeMode?: 'beat' | 'bar';
  }): Vdj8StyleLaunchPlan {
    const {
      audioContextCurrentTime,
      outputSampleRate,
      masterTrack,
      slaveTrack,
      masterCurrentSourceSample,
      slaveCurrentSourceSample,
      masterEffectiveBpm,
      slaveIsPlaying
    } = params;

    const requestedMode = params.quantizeMode ?? 'beat';
    const masterBpm = this.safeBpm(masterEffectiveBpm || masterTrack.bpm);
    const slaveBpm = this.safeBpm(slaveTrack.bpm);
    const tempo = this.matchTempoFamily(masterBpm, slaveBpm);

    const masterGrid = this.safeGrid(masterTrack.beatGrid, masterTrack.sampleRate, masterBpm);
    const slaveGrid = this.safeGrid(slaveTrack.beatGrid, slaveTrack.sampleRate, slaveBpm);

    const masterBeatFloat = this.sampleToBeat(masterCurrentSourceSample, masterGrid);
    const masterBeatPeriodSeconds = 60 / masterBpm;
    const masterBeatsPerBar = Math.max(1, masterGrid.beatsPerBar || 4);

    let quantizeMode: 'beat' | 'bar' = requestedMode;
    if (this.config.forceDownbeatForHalfDouble && tempo.familyFactor !== 1) {
      quantizeMode = 'bar';
    }

    let targetMasterBeatIndex = this.nextMasterTargetBeat(
      masterBeatFloat,
      masterBeatPeriodSeconds,
      masterBeatsPerBar,
      quantizeMode
    );

    let secondsUntilTarget = (targetMasterBeatIndex - masterBeatFloat) * masterBeatPeriodSeconds;
    while (secondsUntilTarget < this.config.minLookaheadSeconds) {
      targetMasterBeatIndex += quantizeMode === 'bar' ? masterBeatsPerBar : 1;
      secondsUntilTarget = (targetMasterBeatIndex - masterBeatFloat) * masterBeatPeriodSeconds;
    }

    const targetOutputTime = audioContextCurrentTime + secondsUntilTarget;
    const targetOutputFrame = Math.round(targetOutputTime * outputSampleRate);
    const masterBeatInBar = this.mod(targetMasterBeatIndex, masterBeatsPerBar);
    const masterBarIndex = Math.floor(targetMasterBeatIndex / masterBeatsPerBar);

    // Project the slave to target time only if it is already running; otherwise
    // preserve its current cue/read-head as the search origin.
    const projectedSlaveSample = slaveIsPlaying
      ? slaveCurrentSourceSample +
        secondsUntilTarget * tempo.playbackMultiplier * slaveTrack.sampleRate
      : slaveCurrentSourceSample;

    const slaveReferenceBeat = this.sampleToBeat(projectedSlaveSample, slaveGrid);
    const slaveBeatsPerBar = Math.max(1, slaveGrid.beatsPerBar || 4);

    const desiredSlaveBeatInBar = quantizeMode === 'bar'
      ? 0
      : this.mod(masterBeatInBar, slaveBeatsPerBar);

    const targetSlaveBeatIndex = this.closestBeatWithBarPosition(
      slaveReferenceBeat,
      desiredSlaveBeatInBar,
      slaveBeatsPerBar,
      slaveGrid.totalBeats,
      !slaveIsPlaying
    );

    const selectedSlaveBeatSample = this.beatIndexToSample(targetSlaveBeatIndex, slaveGrid);

    // MASAVU RHYTHMIC GROOVE MATCHER:
    // Analyzes 1-2 bars of Master and Slave rhythm, computes best rhythmic alignment
    // using timing-error scoring of strong kicks, and supplies slaveSourceSample.
    // Falls back gracefully according to confidence (Groove -> Kick-snap -> Grid).
    const grooveMatch = this.grooveMatcher.findBestGrooveMatch({
      masterTrack,
      slaveTrack,
      targetMasterBeatIndex,
      candidateSlaveBeatIndex: targetSlaveBeatIndex,
      slavePlaybackMultiplier: tempo.playbackMultiplier,
      quantizeMode
    });

    const finalSlaveBeatIndex = grooveMatch.slaveBeatIndex;
    const slaveSourceSample = grooveMatch.slaveSourceSample;
    const kickSnapped = grooveMatch.appliedMode !== 'grid';
    const kickOffsetMs = grooveMatch.grooveOffsetMs;
    const desiredGrooveOffsetMs = (grooveMatch.appliedMode === 'groove' || grooveMatch.appliedMode === 'kick-snap')
      ? grooveMatch.grooveOffsetMs
      : 0;

    const totalLatencyFrames =
      this.config.decoderLatencyFrames +
      this.config.timeStretcherLatencyFrames +
      this.config.audioBufferLatencyFrames;
    const totalLatencySeconds = totalLatencyFrames / Math.max(1, outputSampleRate);

    return {
      targetOutputFrame,
      targetOutputTime,
      masterBeatNumber: masterBeatInBar + 1,
      masterIsDownbeat: masterBeatInBar === 0,
      masterBarIndex,
      slaveSourceSample,
      slaveBeatNumber: this.mod(finalSlaveBeatIndex, slaveBeatsPerBar) + 1,
      slaveIsDownbeat: this.mod(finalSlaveBeatIndex, slaveBeatsPerBar) === 0,
      baseTempoMultiplier: tempo.playbackMultiplier,
      decoderLatencyFrames: this.config.decoderLatencyFrames,
      timeStretcherLatencyFrames: this.config.timeStretcherLatencyFrames,
      audioBufferLatencyFrames: this.config.audioBufferLatencyFrames,
      totalLatencySeconds,
      prerollOutputTime: Math.max(audioContextCurrentTime, targetOutputTime - totalLatencySeconds),
      familyFactor: tempo.familyFactor,
      equivalentSlaveBpm: tempo.equivalentSlaveBpm,
      targetMasterBeatIndex,
      targetSlaveBeatIndex: finalSlaveBeatIndex,
      selectedSlaveBeatSample,
      kickSnapped,
      kickOffsetMs,
      quantizeMode,
      grooveMatch,
      desiredGrooveOffsetMs
    };
  }

  /**
   * Phase error supervisor only. It does not continuously alter playback speed.
   * Positive value means the slave beat is late relative to the master beat.
   */
  public measureWrappedPhaseErrorMs(params: {
    masterCurrentSourceSample: number;
    masterGrid: BeatGrid;
    masterBpm: number;
    slaveCurrentSourceSample: number;
    slaveGrid: BeatGrid;
  }): number {
    const masterBpm = this.safeBpm(params.masterBpm);
    const periodMs = 60000 / masterBpm;
    const masterPhase = this.frac(this.sampleToBeat(params.masterCurrentSourceSample, params.masterGrid));
    const slavePhase = this.frac(this.sampleToBeat(params.slaveCurrentSourceSample, params.slaveGrid));
    let errorMs = (slavePhase - masterPhase) * periodMs;
    errorMs = ((errorMs + periodMs / 2) % periodMs + periodMs) % periodMs - periodMs / 2;
    return errorMs;
  }

  /** Rare recovery gate: no permanent auto-nudging. */
  public shouldReanchor(phaseErrorMs: number, persistedBeatCount: number): boolean {
    return Number.isFinite(phaseErrorMs) && Math.abs(phaseErrorMs) >= 45 && persistedBeatCount >= 2;
  }

  /**
   * Evaluates bar-level musical downbeat alignment (Beat 1 to 4 in 4/4 time).
   * Downbeat alignment ensures that Beat 1.1 of Deck A plays simultaneously
   * with Beat 1.1 of Deck B, preventing rhythmic clashes like kicks landing on snares.
   */
  public measureDownbeatPhase(params: {
    masterCurrentSourceSample: number;
    masterGrid: BeatGrid;
    slaveCurrentSourceSample: number;
    slaveGrid: BeatGrid;
  }): DownbeatPhaseTelemetry {
    const masterBeatsPerBar = Math.max(1, params.masterGrid.beatsPerBar || 4);
    const slaveBeatsPerBar = Math.max(1, params.slaveGrid.beatsPerBar || 4);

    const masterBeatFloat = this.sampleToBeat(params.masterCurrentSourceSample, params.masterGrid);
    const slaveBeatFloat = this.sampleToBeat(params.slaveCurrentSourceSample, params.slaveGrid);

    const masterBeatInt = Math.floor(masterBeatFloat);
    const slaveBeatInt = Math.floor(slaveBeatFloat);

    const masterBeatInBar = this.mod(masterBeatInt, masterBeatsPerBar);
    const slaveBeatInBar = this.mod(slaveBeatInt, slaveBeatsPerBar);

    const masterBarIndex = Math.floor(masterBeatInt / masterBeatsPerBar);
    const slaveBarIndex = Math.floor(slaveBeatInt / slaveBeatsPerBar);

    const downbeatOffsetBeats = this.mod(slaveBeatInBar - masterBeatInBar, slaveBeatsPerBar);
    const isDownbeatMatched = downbeatOffsetBeats === 0;
    const isCurrentlyOnDownbeat = isDownbeatMatched && masterBeatInBar === 0;

    return {
      masterBeatInBar,
      slaveBeatInBar,
      masterBarIndex,
      slaveBarIndex,
      downbeatOffsetBeats,
      isDownbeatMatched,
      isCurrentlyOnDownbeat
    };
  }

  /**
   * Calculates the temporary pitch adjustment (jog nudge factor) needed to smoothly
   * eliminate the micro-phase error over targetDurationSec without jarring cuts.
   */
  public calculateSoftPhaseNudge(phaseErrorMs: number, targetDurationSec = 0.4): number {
    if (!Number.isFinite(phaseErrorMs) || Math.abs(phaseErrorMs) < 0.5) return 0;
    // errorMs is slavePhase - masterPhase
    // If errorMs > 0, slave beat is late. Slave needs to speed up: positive nudge.
    // If errorMs < 0, slave beat is early. Slave needs to slow down: negative nudge.
    const errorSec = phaseErrorMs / 1000;
    const requiredNudge = errorSec / Math.max(0.1, targetDurationSec);
    return Math.max(-0.06, Math.min(0.06, requiredNudge));
  }

  private nextMasterTargetBeat(
    masterBeatFloat: number,
    beatPeriodSeconds: number,
    beatsPerBar: number,
    mode: 'beat' | 'bar'
  ): number {
    if (mode === 'bar') {
      const currentBeatIndex = Math.floor(masterBeatFloat);
      const currentBar = Math.floor(currentBeatIndex / beatsPerBar);
      return (currentBar + 1) * beatsPerBar;
    }

    const nextBeat = Math.floor(masterBeatFloat) + 1;
    const delay = (nextBeat - masterBeatFloat) * beatPeriodSeconds;
    return delay >= 0 ? nextBeat : nextBeat + 1;
  }

  private closestBeatWithBarPosition(
    referenceBeat: number,
    desiredBeatInBar: number,
    beatsPerBar: number,
    totalBeats: number,
    preferForward: boolean
  ): number {
    const refBar = Math.floor(referenceBeat / beatsPerBar);
    const candidates: number[] = [];

    for (let d = -2; d <= 3; d += 1) {
      const idx = (refBar + d) * beatsPerBar + desiredBeatInBar;
      if (idx >= 0 && (totalBeats <= 0 || idx < totalBeats)) {
        candidates.push(idx);
      }
    }

    if (candidates.length === 0) {
      return Math.max(0, Math.round(referenceBeat));
    }

    if (preferForward) {
      const forward = candidates.filter((v) => v >= referenceBeat - 1e-6);
      if (forward.length > 0) {
        return forward.reduce((a, b) => (a < b ? a : b));
      }
    }

    return candidates.reduce((best, candidate) =>
      Math.abs(candidate - referenceBeat) < Math.abs(best - referenceBeat) ? candidate : best
    );
  }

  private findNearestTransientToBeat(
    track: TrackData,
    beatSample: number,
    samplesPerBeat: number
  ): number | null {
    const transients = track.warpMap?.transientMarkers;
    if (!transients || transients.length === 0 || samplesPerBeat <= 0) return null;

    const maxDistance = Math.max(1, samplesPerBeat * this.config.kickSearchWindowBeats);
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    // A simple pass is deterministic and safe for the current track sizes. The
    // detector has already reduced the source to transient marker positions.
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

  private sampleToBeat(sample: number, grid: BeatGrid): number {
    if (!Number.isFinite(sample) || !Number.isFinite(grid.samplesPerBeat) || grid.samplesPerBeat <= 0) {
      return 0;
    }
    return (sample - grid.firstDownbeatSample) / grid.samplesPerBeat;
  }

  private safeGrid(grid: BeatGrid, sampleRate: number, bpm: number): BeatGrid {
    if (grid && Number.isFinite(grid.samplesPerBeat) && grid.samplesPerBeat > 0) return grid;
    const samplesPerBeat = sampleRate * 60 / this.safeBpm(bpm);
    return {
      firstDownbeatSample: 0,
      samplesPerBeat,
      bpm: this.safeBpm(bpm),
      beatsPerBar: 4,
      totalBeats: Number.MAX_SAFE_INTEGER,
      confidence: 0,
      beatSamples: [],
      isDownbeat: []
    };
  }

  private safeBpm(value: number): number {
    return Number.isFinite(value) && value >= 20 && value <= 300 ? value : 120;
  }

  private frac(value: number): number {
    return value - Math.floor(value);
  }

  private mod(value: number, divisor: number): number {
    return ((value % divisor) + divisor) % divisor;
  }
}
