/**
 * Base MASAVU DJ Deck Implementation
 *
 * Implements sample-accurate Web Audio playback, beatgrid telemetry,
 * 3-band EQ, DJ filter, pitch shifting, and cue management.
 */

import { BeatGrid, DeckTelemetry, DiscDjDeckTelemetry, PreparedTrack, TrackData } from '../types/dj';

export class DjDeck {
  public readonly deckId: 'A' | 'B';
  protected audioCtx: AudioContext;

  // Audio Nodes
  protected sourceNode: AudioBufferSourceNode | null = null;
  protected gainNode: GainNode;
  protected eqLowNode: BiquadFilterNode;
  protected eqMidNode: BiquadFilterNode;
  protected eqHighNode: BiquadFilterNode;
  protected filterNode: BiquadFilterNode;
  public readonly outputNode: GainNode;

  // State
  protected track: TrackData | null = null;
  protected isPlaying = false;
  protected isPaused = true;
  protected isSync = false;
  protected isMaster = false;

  // Clocks and position tracking
  protected currentSourceSample = 0;
  protected playStartTime = 0;
  protected playStartSample = 0;
  protected cueSample = 0;

  // Pitch and tempo
  protected baseTempoMultiplier = 1.0;
  protected jogPitchNudge = 0;
  protected pllMultiplier = 1.0;
  protected pitchRange = 0.08; // +/- 8%
  protected pitchPercentage = 0; // -1.0 to 1.0

  // Audio controls
  protected volume = 0.85;
  protected lowEqVal = 0; // dB
  protected midEqVal = 0; // dB
  protected highEqVal = 0; // dB
  protected filterVal = 0; // -1 (lowpass) to +1 (highpass), 0 neutral

  constructor(deckId: 'A' | 'B', audioCtx: AudioContext) {
    this.deckId = deckId;
    this.audioCtx = audioCtx;

    // Build audio routing chain:
    // Source -> LowEQ -> MidEQ -> HighEQ -> Filter -> Gain -> OutputNode
    this.eqLowNode = this.audioCtx.createBiquadFilter();
    this.eqLowNode.type = 'lowshelf';
    this.eqLowNode.frequency.value = 250;
    this.eqLowNode.gain.value = 0;

    this.eqMidNode = this.audioCtx.createBiquadFilter();
    this.eqMidNode.type = 'peaking';
    this.eqMidNode.frequency.value = 1000;
    this.eqMidNode.Q.value = 1.0;
    this.eqMidNode.gain.value = 0;

    this.eqHighNode = this.audioCtx.createBiquadFilter();
    this.eqHighNode.type = 'highshelf';
    this.eqHighNode.frequency.value = 3500;
    this.eqHighNode.gain.value = 0;

    this.filterNode = this.audioCtx.createBiquadFilter();
    this.filterNode.type = 'allpass';
    this.filterNode.frequency.value = 1000;

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = this.volume;

    this.outputNode = this.audioCtx.createGain();
    this.outputNode.gain.value = 1.0;

    // Connect node chain
    this.eqLowNode.connect(this.eqMidNode);
    this.eqMidNode.connect(this.eqHighNode);
    this.eqHighNode.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(this.outputNode);
  }

  public getTrack(): TrackData | null {
    return this.track;
  }

  public getCurrentSourceSample(): number {
    this.updateCurrentPosition();
    return this.currentSourceSample;
  }

  public getEffectivePlaybackRate(): number {
    const mult = this.baseTempoMultiplier * (1 + this.jogPitchNudge) * this.pllMultiplier;
    if (!Number.isFinite(mult) || mult <= 0.05) return 1.0;
    return Math.max(0.1, Math.min(4.0, mult));
  }

  public getEffectiveBpm(): number {
    if (!this.track) return 120;
    return this.track.bpm * this.getEffectivePlaybackRate();
  }

  public setBaseTempoMultiplier(multiplier: number): void {
    const safe = Number.isFinite(multiplier) && multiplier > 0.1 && multiplier < 4.0
      ? multiplier
      : 1.0;

    if (Math.abs(this.baseTempoMultiplier - safe) < 1e-6) return;

    this.updateCurrentPosition();
    this.baseTempoMultiplier = safe;
    this.reanchorActivePlayback();
  }

  public getBaseTempoMultiplier(): number {
    return this.baseTempoMultiplier;
  }

  public setSync(isSync: boolean): void {
    this.isSync = isSync;
  }

  public getSync(): boolean {
    return this.isSync;
  }

  public setIsMaster(isMaster: boolean): void {
    this.isMaster = isMaster;
  }

  public getIsMaster(): boolean {
    return this.isMaster;
  }

  public setJogPitchNudge(nudge: number): void {
    const safe = Number.isFinite(nudge) ? Math.max(-0.5, Math.min(0.5, nudge)) : 0.0;
    if (Math.abs(this.jogPitchNudge - safe) < 1e-6) return;

    this.updateCurrentPosition();
    this.jogPitchNudge = safe;
    this.reanchorActivePlayback();
  }

  public setPLLMultiplier(multiplier: number): void {
    const safe = Number.isFinite(multiplier) ? Math.max(0.8, Math.min(1.2, multiplier)) : 1.0;
    if (Math.abs(this.pllMultiplier - safe) < 1e-6) return;

    this.updateCurrentPosition();
    this.pllMultiplier = safe;
    this.reanchorActivePlayback();
  }

  public getPitchRange(): number {
    return this.pitchRange;
  }

  public setPitchRange(range: number): void {
    this.pitchRange = Math.max(0.04, Math.min(0.5, range));
  }

  public getPitchPercentage(): number {
    return this.pitchPercentage;
  }

  public setPitchPercentage(percentage: number): void {
    this.pitchPercentage = Math.max(-1.0, Math.min(1.0, percentage));
    const targetMultiplier = 1.0 + this.pitchPercentage * this.pitchRange;
    this.setBaseTempoMultiplier(targetMultiplier);
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
  }

  public getVolume(): number {
    return this.volume;
  }

  public setEQ(lowDb: number, midDb: number, highDb: number): void {
    this.lowEqVal = Math.max(-24, Math.min(6, lowDb));
    this.midEqVal = Math.max(-24, Math.min(6, midDb));
    this.highEqVal = Math.max(-24, Math.min(6, highDb));

    const now = this.audioCtx.currentTime;
    this.eqLowNode.gain.setValueAtTime(this.lowEqVal, now);
    this.eqMidNode.gain.setValueAtTime(this.midEqVal, now);
    this.eqHighNode.gain.setValueAtTime(this.highEqVal, now);
  }

  public setFilter(amount: number): void {
    // amount: -1 (LowPass) -> 0 (Neutral) -> +1 (HighPass)
    this.filterVal = Math.max(-1, Math.min(1, amount));
    const now = this.audioCtx.currentTime;

    if (Math.abs(this.filterVal) < 0.02) {
      this.filterNode.type = 'allpass';
      this.filterNode.frequency.setValueAtTime(1000, now);
    } else if (this.filterVal < 0) {
      // Low pass: from 20000Hz down to 200Hz
      this.filterNode.type = 'lowpass';
      const freq = 20000 * Math.pow(0.01, -this.filterVal);
      this.filterNode.frequency.setValueAtTime(Math.max(100, freq), now);
    } else {
      // High pass: from 20Hz up to 5000Hz
      this.filterNode.type = 'highpass';
      const freq = 20 * Math.pow(250, this.filterVal);
      this.filterNode.frequency.setValueAtTime(Math.min(12000, freq), now);
    }
  }

  public loadTrack(track: TrackData, targetBpm?: number): PreparedTrack {
    this.stop();
    this.track = track;
    this.currentSourceSample = 0;
    this.cueSample = 0;
    this.playStartSample = 0;
    this.pitchPercentage = 0;
    this.baseTempoMultiplier = 1.0;
    this.jogPitchNudge = 0;
    this.pllMultiplier = 1.0;

    const chosenBpm = targetBpm ?? track.bpm;
    return {
      track,
      sampleRate: track.sampleRate,
      totalSamples: Math.round(track.duration * track.sampleRate),
      targetBpm: chosenBpm
    };
  }

  public play(scheduledTime?: number, offsetSample?: number): void {
    if (!this.track || !this.track.audioBuffer) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const startTime = scheduledTime ?? this.audioCtx.currentTime;
    let sample = offsetSample ?? this.currentSourceSample;

    const totalSamples = this.track.audioBuffer.length;
    let safeSample = Math.max(0, Math.min(totalSamples - 1, sample));

    this.stopSource();

    this.sourceNode = this.audioCtx.createBufferSource();
    this.sourceNode.buffer = this.track.audioBuffer;
    this.sourceNode.loop = true;
    this.sourceNode.connect(this.eqLowNode);

    const rate = this.getEffectivePlaybackRate();
    const when = Math.max(this.audioCtx.currentTime, startTime);
    try {
      this.sourceNode.playbackRate.setValueAtTime(rate, when);
    } catch {
      // fallback
    }

    const offsetSeconds = Math.max(0, Math.min(this.track.audioBuffer.duration - 0.001, safeSample / this.track.sampleRate));

    try {
      this.sourceNode.start(when, offsetSeconds);
    } catch (err) {
      console.warn('Playback start error:', err);
      return;
    }

    this.playStartTime = when;
    this.playStartSample = safeSample;
    this.currentSourceSample = safeSample;
    this.isPlaying = true;
    this.isPaused = false;
  }

  public pause(): void {
    if (!this.isPlaying) return;
    this.updateCurrentPosition();
    this.stopSource();
    this.isPlaying = false;
    this.isPaused = true;
  }

  public stop(): void {
    this.stopSource();
    this.isPlaying = false;
    this.isPaused = true;
    this.currentSourceSample = this.cueSample;
    this.playStartSample = this.cueSample;
  }

  public cue(): void {
    if (this.isPlaying) {
      this.pause();
      this.currentSourceSample = this.cueSample;
      this.playStartSample = this.cueSample;
    } else {
      this.cueSample = this.currentSourceSample;
      this.playStartSample = this.cueSample;
    }
  }

  public seek(sample: number): void {
    if (!this.track) return;
    const safeSample = Math.max(0, Math.min(sample, this.track.duration * this.track.sampleRate));
    this.currentSourceSample = safeSample;
    if (this.isPlaying) {
      this.play(this.audioCtx.currentTime, safeSample);
    }
  }

  public syncAlignToMaster(
    targetOutputTime: number,
    slaveSourceSample: number,
    baseTempoMultiplier: number
  ): void {
    this.baseTempoMultiplier = baseTempoMultiplier;
    this.play(targetOutputTime, slaveSourceSample);
  }

  public updateCurrentPosition(): void {
    if (!this.isPlaying || !this.track || !this.track.audioBuffer) return;

    const now = this.audioCtx.currentTime;
    if (now < this.playStartTime) {
      // Scheduled in the future; position has not started progressing yet
      this.currentSourceSample = this.playStartSample;
      return;
    }

    const elapsedSeconds = now - this.playStartTime;
    const rate = this.getEffectivePlaybackRate();
    const sourceSamplesElapsed = elapsedSeconds * rate * this.track.sampleRate;
    let sample = Math.round(this.playStartSample + sourceSamplesElapsed);

    const totalSamples = this.track.audioBuffer.length;
    if (sample >= totalSamples) {
      // Loop or stop
      sample = sample % totalSamples;
    }

    this.currentSourceSample = sample;
  }

  protected reanchorActivePlayback(): void {
    if (!this.isPlaying || !this.sourceNode) return;
    const now = this.audioCtx.currentTime;
    const rate = this.getEffectivePlaybackRate();
    if (!Number.isFinite(rate) || rate <= 0) return;
    try {
      if (now >= this.playStartTime) {
        this.sourceNode.playbackRate.setValueAtTime(rate, now);
        this.playStartTime = now;
        this.playStartSample = this.currentSourceSample;
      } else {
        this.sourceNode.playbackRate.setValueAtTime(rate, this.playStartTime);
      }
    } catch {
      // guard
    }
  }

  protected stopSource(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // ignore already stopped source
      }
      this.sourceNode = null;
    }
  }

  public getTelemetry(): DeckTelemetry {
    this.updateCurrentPosition();

    const sampleRate = this.track ? this.track.sampleRate : 44100;
    const duration = this.track ? this.track.duration : 0;
    const currentTimeSeconds = duration > 0 ? this.currentSourceSample / sampleRate : 0;

    let currentBeatFloat = 0;
    let currentBeatInBar = 0;
    let currentBarIndex = 0;
    let isDownbeat = false;

    const analyzedBpm = this.track ? (this.track.beatGrid?.discDjAnchor?.analyzedBpm ?? this.track.bpm) : 120;
    const beatPeriodSeconds = 60.0 / Math.max(1, analyzedBpm);
    const rawBeatPhaseSeconds = this.track?.beatGrid?.discDjAnchor?.rawBeatPhaseSeconds ?? (
      this.track ? ((this.track.beatGrid.beatStartSample ?? this.track.beatGrid.firstDownbeatSample ?? 0) / sampleRate) : 0
    );
    const normalizedBeatStartSeconds = this.track?.beatGrid?.discDjAnchor?.normalizedBeatStartSeconds ?? (
      ((rawBeatPhaseSeconds % beatPeriodSeconds) + beatPeriodSeconds) % beatPeriodSeconds
    );
    const beatStartSample = this.track?.beatGrid?.beatStartSample ?? (
      this.track ? Math.round(normalizedBeatStartSeconds * sampleRate) : 0
    );

    // Waveform and Sync use the exact same canonical beatStartSample geometry
    const waveformGridStartSample = beatStartSample;
    const syncGridStartSample = beatStartSample;
    const currentEffectiveSpeed = this.getEffectivePlaybackRate();
    const samplesPerBeat = this.track?.beatGrid?.samplesPerBeat || (sampleRate * 60 / Math.max(1, analyzedBpm));

    // Next 4-beat boundary in source sample domain
    const currentBeatIndex = Math.floor((this.currentSourceSample - beatStartSample) / samplesPerBeat);
    const nextFourBeatIndex = (Math.floor(currentBeatIndex / 4) + 1) * 4;
    const nextFourBeatBoundarySource = Math.max(0, Math.round(beatStartSample + nextFourBeatIndex * samplesPerBeat));

    // Audio buffer latency in ms
    const audioBufferLatencyMs = ((this.audioCtx.baseLatency || (128 / this.audioCtx.sampleRate)) + (this.audioCtx.outputLatency || 0)) * 1000;
    const parityValid = waveformGridStartSample === syncGridStartSample;

    const discDjTelemetry: DiscDjDeckTelemetry = {
      analyzedBpm,
      rawBeatPhaseSeconds,
      beatPeriodSeconds,
      normalizedBeatStartSeconds,
      beatStartSample,
      waveformGridStartSample,
      syncGridStartSample,
      currentSourceSample: this.currentSourceSample,
      currentEffectiveSpeed,
      nextFourBeatBoundarySource,
      audioBufferLatencyMs,
      gridMode: 'DISCDJ_STRAIGHT',
      parityValid
    };

    if (this.track && this.track.beatGrid && this.track.beatGrid.samplesPerBeat > 0) {
      const grid: BeatGrid = this.track.beatGrid;
      const phaseAnchor = grid.beatStartSample ?? grid.firstDownbeatSample ?? 0;
      currentBeatFloat = (this.currentSourceSample - phaseAnchor) / grid.samplesPerBeat;
      const beatInt = Math.floor(currentBeatFloat);
      const beatsPerBar = Math.max(1, grid.beatsPerBar || 4);
      currentBeatInBar = ((beatInt % beatsPerBar) + beatsPerBar) % beatsPerBar;
      currentBarIndex = Math.floor(beatInt / beatsPerBar);
      isDownbeat = currentBeatInBar === 0;
    }

    return {
      deckId: this.deckId,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentSourceSample: this.currentSourceSample,
      currentTimeSeconds,
      totalDurationSeconds: duration,
      currentBeatFloat,
      currentBeatInBar,
      currentBarIndex,
      isDownbeat,
      baseBpm: this.track ? this.track.bpm : 120,
      effectiveBpm: this.getEffectiveBpm(),
      baseTempoMultiplier: this.baseTempoMultiplier,
      jogPitchNudge: this.jogPitchNudge,
      pllMultiplier: this.pllMultiplier,
      pitchPercentage: this.pitchPercentage,
      isSync: this.isSync,
      isMaster: this.isMaster,
      volume: this.volume,
      cueSample: this.cueSample,
      lowEq: this.lowEqVal,
      midEq: this.midEqVal,
      highEq: this.highEqVal,
      filter: this.filterVal,
      discDjTelemetry
    };
  }
}
