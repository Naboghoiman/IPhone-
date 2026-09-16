import { TrackData } from '../types/dj';
import { DjDeck } from './djDeck';
import { BeatLoopDeck } from './beatLoopDeck';
import { Vdj8StyleSyncEngine } from './vdj8StyleSyncEngine';

export type BeatLoopLength = 1 | 2 | 4 | 8 | 16 | 32;

export interface LooperSyncState {
  loaded: boolean;
  playing: boolean;
  syncedTo: 'A' | 'B' | null;

  loopBeatCount: BeatLoopLength;

  loopStartSample: number;
  loopEndSample: number;

  baseTempoMultiplier: number;
  currentSourceSample: number;
}

export class AudioLooperEngine {
  private readonly audioCtx: AudioContext;
  private readonly loopDeck: BeatLoopDeck;
  private readonly syncEngine: Vdj8StyleSyncEngine;

  private loopTrack: TrackData | null = null;
  private syncedTo: 'A' | 'B' | null = null;
  private selectedBeatCount: BeatLoopLength = 4;

  constructor(
    audioCtx: AudioContext,
    syncEngine: Vdj8StyleSyncEngine
  ) {
    this.audioCtx = audioCtx;
    this.syncEngine = syncEngine;
    this.loopDeck = new BeatLoopDeck('A', audioCtx);
  }

  public getOutputNode(): AudioNode {
    return this.loopDeck.outputNode;
  }

  public hasLoop(): boolean {
    return this.loopTrack !== null;
  }

  public getTrack(): TrackData | null {
    return this.loopTrack;
  }

  public isPlaying(): boolean {
    return this.loopDeck.getTelemetry().isPlaying;
  }

  private getPreferredLoopStartSample(track: TrackData): number {
    const anchor = track.beatGrid.discDjAnchor;

    // Prefer the ACTUAL observed occurrence of the corrected
    // repeating phase near the active rhythmic section.
    if (
      anchor &&
      Number.isFinite(anchor.rawBeatPhaseSeconds)
    ) {
      const s = Math.round(anchor.rawBeatPhaseSeconds * track.sampleRate);

      if (s >= 0 && s < track.duration * track.sampleRate) {
        return s;
      }
    }

    // Fallback to canonical phase anchor.
    return (
      track.beatGrid.beatStartSample ??
      track.beatGrid.firstDownbeatSample ??
      0
    );
  }

  private chooseAutoBeatCount(
    track: TrackData,
    startSample: number
  ): BeatLoopLength {
    const samplesPerBeat = track.beatGrid.samplesPerBeat;

    const totalSamples = track.audioBuffer
      ? track.audioBuffer.length
      : Math.round(track.duration * track.sampleRate);

    const availableBeats = Math.floor(
      (totalSamples - startSample) / samplesPerBeat
    );

    const choices: BeatLoopLength[] = [32, 16, 8, 4, 2, 1];

    for (const value of choices) {
      if (value <= availableBeats) {
        return value;
      }
    }

    return 1;
  }

  public loadLoop(
    track: TrackData,
    beatCount: BeatLoopLength | 'AUTO' = 'AUTO'
  ): void {
    this.stop();

    this.loopTrack = track;

    this.loopDeck.loadTrack(track);

    const startSample = this.getPreferredLoopStartSample(track);

    const chosen =
      beatCount === 'AUTO'
        ? this.chooseAutoBeatCount(track, startSample)
        : beatCount;

    this.selectedBeatCount = chosen;

    this.loopDeck.configureMusicalLoop(startSample, chosen);

    this.loopDeck.setSync(true);
    this.loopDeck.setJogPitchNudge(0);
    this.loopDeck.setPLLMultiplier(1.0);

    this.syncedTo = null;
  }

  public setLoopBeatCount(beatCount: BeatLoopLength): void {
    if (!this.loopTrack) {
      return;
    }

    const startSample = this.loopDeck.getLoopStartSample();

    this.selectedBeatCount = beatCount;

    this.loopDeck.configureMusicalLoop(startSample, beatCount);
  }

  public setLoopStartSample(sample: number): void {
    if (!this.loopTrack) {
      return;
    }

    // Manual loop start must be snapped to the nearest
    // existing straight BeatGrid line.
    const grid = this.loopTrack.beatGrid;

    const anchor =
      grid.beatStartSample ??
      grid.firstDownbeatSample ??
      0;

    const P = grid.samplesPerBeat;

    const beatIndex = Math.round((sample - anchor) / P);

    const snapped = Math.max(
      0,
      Math.round(anchor + beatIndex * P)
    );

    this.loopDeck.configureMusicalLoop(snapped, this.selectedBeatCount);
  }

  public stop(): void {
    this.loopDeck.stop();
    this.loopDeck.setSync(false);
    this.syncedTo = null;
  }

  public setVolume(volume: number): void {
    this.loopDeck.setVolume(volume);
  }

  public getState(): LooperSyncState {
    this.loopDeck.updateCurrentPosition();
    return {
      loaded: this.loopTrack !== null,

      playing: this.loopDeck.getTelemetry().isPlaying,

      syncedTo: this.syncedTo,

      loopBeatCount: this.selectedBeatCount,

      loopStartSample: this.loopDeck.getLoopStartSample(),

      loopEndSample: this.loopDeck.getLoopEndSample(),

      baseTempoMultiplier: this.loopDeck.getBaseTempoMultiplier(),

      currentSourceSample: this.loopDeck.getCurrentSourceSample()
    };
  }

  public syncToMaster(
    masterId: 'A' | 'B',
    masterDeck: DjDeck
  ): boolean {
    if (!this.loopTrack) {
      return false;
    }

    const masterTrack = masterDeck.getTrack();

    if (!masterTrack) {
      return false;
    }

    const masterTelemetry = masterDeck.getTelemetry();

    if (!masterTelemetry.isPlaying) {
      return false;
    }

    if (
      !this.syncEngine.isGridValid(masterTrack.beatGrid) ||
      !this.syncEngine.isGridValid(this.loopTrack.beatGrid)
    ) {
      return false;
    }

    masterDeck.updateCurrentPosition();
    this.loopDeck.updateCurrentPosition();

    const loopTelemetry = this.loopDeck.getTelemetry();

    const masterEffectiveBpm =
      masterTelemetry.effectiveBpm > 20
        ? masterTelemetry.effectiveBpm
        : masterTrack.bpm;

    const plan = this.syncEngine.createLaunchPlan({
      audioContextCurrentTime: this.audioCtx.currentTime,
      outputSampleRate: this.audioCtx.sampleRate,
      masterTrack,
      slaveTrack: this.loopTrack,
      masterCurrentSourceSample: masterDeck.getCurrentSourceSample(),
      slaveCurrentSourceSample: this.loopDeck.getCurrentSourceSample(),
      masterEffectiveBpm,
      slaveIsPlaying: loopTelemetry.isPlaying,
      quantizeMode: 'beat'
    });

    this.loopDeck.setSync(true);
    this.loopDeck.setJogPitchNudge(0);
    this.loopDeck.setPLLMultiplier(1.0);

    this.loopDeck.setTempoFamilyLock(plan.baseTempoMultiplier);
    this.loopDeck.setBaseTempoMultiplier(plan.baseTempoMultiplier);

    // createLaunchPlan may return a mathematically correct beat
    // anywhere in the uploaded audio.
    // Fold it into the configured musical loop interval.
    const loopStart = this.loopDeck.getLoopStartSample();
    const loopEnd = this.loopDeck.getLoopEndSample();
    const loopLength = loopEnd - loopStart;

    if (loopLength <= 0) {
      return false;
    }

    const foldedSourceSample =
      loopStart +
      (((plan.slaveSourceSample - loopStart) % loopLength) + loopLength) %
        loopLength;

    // One clean scheduled play or re-anchor using the pitch-preserved prepared loop at playbackRate = 1.0
    this.loopDeck.playPrepared(
      plan.targetOutputTime,
      foldedSourceSample,
      plan.baseTempoMultiplier
    );

    this.syncedTo = masterId;

    return true;
  }
}
