/**
 * Base MASAVU DJ Master Controller Implementation
 *
 * Coordinates Deck A and Deck B audio nodes, crossfader curve, master deck assignment,
 * and baseline slave synchronization scheduler.
 */

import { SlaveStartPlan } from '../types/dj';
import { DjDeck } from './djDeck';

export class DjMasterController {
  public readonly audioCtx: AudioContext;
  public readonly deckA: DjDeck;
  public readonly deckB: DjDeck;

  protected masterDeckId: 'A' | 'B' = 'A';
  protected crossfader = 0; // -1 (Deck A) to +1 (Deck B)

  // Crossfader and Master routing nodes
  public readonly crossfaderGainA: GainNode;
  public readonly crossfaderGainB: GainNode;
  public readonly masterGain: GainNode;

  protected lastSlaveStartPlan: SlaveStartPlan | null = null;

  public readonly syncEngine = {
    resetController: () => {
      // resets PLL or internal sync states
    }
  };

  constructor(audioCtx?: AudioContext) {
    this.audioCtx = audioCtx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    this.deckA = new DjDeck('A', this.audioCtx);
    this.deckB = new DjDeck('B', this.audioCtx);

    this.deckA.setIsMaster(true);
    this.deckB.setIsMaster(false);

    // Create crossfader gain nodes
    this.crossfaderGainA = this.audioCtx.createGain();
    this.crossfaderGainB = this.audioCtx.createGain();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 1.0;

    // Connect Deck A output -> crossfaderGainA -> masterGain -> destination
    this.deckA.outputNode.connect(this.crossfaderGainA);
    this.deckB.outputNode.connect(this.crossfaderGainB);

    this.crossfaderGainA.connect(this.masterGain);
    this.crossfaderGainB.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);

    this.updateCrossfaderGains();
  }

  public getMasterDeckId(): 'A' | 'B' {
    return this.masterDeckId;
  }

  public setMasterDeckId(deckId: 'A' | 'B'): void {
    this.masterDeckId = deckId;
    this.deckA.setIsMaster(deckId === 'A');
    this.deckB.setIsMaster(deckId === 'B');
  }

  public getCrossfader(): number {
    return this.crossfader;
  }

  public setCrossfader(val: number): void {
    this.crossfader = Math.max(-1, Math.min(1, val));
    this.updateCrossfaderGains();
  }

  protected updateCrossfaderGains(): void {
    // Constant power crossfader curve
    // val goes from -1 (Deck A) to +1 (Deck B)
    // normalise to 0 to 1
    const x = (this.crossfader + 1) / 2;
    const gainA = Math.cos(x * 0.5 * Math.PI);
    const gainB = Math.sin(x * 0.5 * Math.PI);

    const now = this.audioCtx.currentTime;
    this.crossfaderGainA.gain.setValueAtTime(gainA, now);
    this.crossfaderGainB.gain.setValueAtTime(gainB, now);
  }

  public setMasterVolume(vol: number): void {
    const safe = Math.max(0, Math.min(1, vol));
    this.masterGain.gain.setValueAtTime(safe, this.audioCtx.currentTime);
  }

  public getMasterVolume(): number {
    return this.masterGain.gain.value;
  }

  /**
   * Baseline MASAVU trigger: starts slave at future master beat,
   * but uses current read-head sample. (Used as fallback or baseline comparison)
   */
  public triggerBeatPerfectSlaveStart(
    _quantizeMode: 'beat' | 'bar' = 'beat'
  ): SlaveStartPlan | null {
    const masterDeck = this.masterDeckId === 'A' ? this.deckA : this.deckB;
    const slaveDeck = this.masterDeckId === 'A' ? this.deckB : this.deckA;

    const masterTrack = masterDeck.getTrack();
    const slaveTrack = slaveDeck.getTrack();
    if (!masterTrack || !slaveTrack) return null;

    masterDeck.updateCurrentPosition();
    slaveDeck.updateCurrentPosition();

    const masterTelemetry = masterDeck.getTelemetry();
    const masterBpm = masterTelemetry.effectiveBpm > 20 ? masterTelemetry.effectiveBpm : masterTrack.bpm;
    const slaveBpm = slaveTrack.bpm;
    const baseTempoMultiplier = masterBpm / slaveBpm;

    const targetOutputTime = this.audioCtx.currentTime + 0.1;
    const targetOutputFrame = Math.round(targetOutputTime * this.audioCtx.sampleRate);

    // Old behavior used the arbitrary current source sample:
    const slaveSourceSample = slaveDeck.getCurrentSourceSample();

    const plan: SlaveStartPlan = {
      targetOutputFrame,
      targetOutputTime,
      masterBeatNumber: 1,
      masterIsDownbeat: true,
      masterBarIndex: 0,
      slaveSourceSample,
      slaveBeatNumber: 1,
      slaveIsDownbeat: true,
      baseTempoMultiplier,
      decoderLatencyFrames: 0,
      timeStretcherLatencyFrames: 0,
      audioBufferLatencyFrames: 0,
      totalLatencySeconds: 0,
      prerollOutputTime: targetOutputTime
    };

    slaveDeck.setSync(true);
    slaveDeck.setBaseTempoMultiplier(baseTempoMultiplier);
    slaveDeck.play(targetOutputTime, slaveSourceSample);

    this.lastSlaveStartPlan = plan;
    return plan;
  }

  public getLastSlaveStartPlan(): SlaveStartPlan | null {
    return this.lastSlaveStartPlan;
  }

  public dispose(): void {
    this.deckA.stop();
    this.deckB.stop();
    if (this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {
        // ignore
      }
    }
  }
}
