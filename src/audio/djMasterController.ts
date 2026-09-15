/**
 * MASAVU master controller with VirtualDJ-8-style synchronization behaviour.
 *
 * CLEAN-ROOM IMPLEMENTATION: no VirtualDJ proprietary source code is present.
 * The original MASAVU controller remains unchanged in djMasterControllerBase.ts.
 */

import { SlaveStartPlan } from '../types/dj';
import { DjMasterController as BaseDjMasterController } from './djMasterControllerBase';
import { Vdj8StyleLaunchPlan, Vdj8StyleSyncEngine } from './vdj8StyleSyncEngine';
import { MasavuPhaseController, MasavuPhaseTelemetry } from './masavuPhaseController';

export class DjMasterController extends BaseDjMasterController {
  public readonly vdj8StyleSyncEngine = new Vdj8StyleSyncEngine();
  public readonly masavuPhaseController = new MasavuPhaseController();
  private vdj8LastSlaveStartPlan: Vdj8StyleLaunchPlan | null = null;

  /**
   * Tempo family -> beat/bar target -> kick-preferred source position ->
   * exact AudioContext scheduled launch. Stable tempo is then left alone.
   */
  public override triggerBeatPerfectSlaveStart(
    quantizeMode: 'beat' | 'bar' = 'beat'
  ): SlaveStartPlan | null {
    const masterDeck = this.getMasterDeckId() === 'A' ? this.deckA : this.deckB;
    const slaveDeck = this.getMasterDeckId() === 'A' ? this.deckB : this.deckA;

    const masterTrack = masterDeck.getTrack();
    const slaveTrack = slaveDeck.getTrack();
    if (!masterTrack || !slaveTrack) return null;

    masterDeck.updateCurrentPosition();
    slaveDeck.updateCurrentPosition();

    const masterTelemetry = masterDeck.getTelemetry();
    const slaveTelemetry = slaveDeck.getTelemetry();

    // If there is no running reference clock, retain the original MASAVU cue behaviour.
    if (!masterTelemetry.isPlaying) {
      slaveDeck.setTempoFamilyLock(null);
      const fallback = super.triggerBeatPerfectSlaveStart(quantizeMode);
      this.vdj8LastSlaveStartPlan = null;
      return fallback;
    }

    const masterBpm = masterTelemetry.effectiveBpm > 20
      ? masterTelemetry.effectiveBpm
      : masterTrack.bpm;

    const plan = this.vdj8StyleSyncEngine.createLaunchPlan({
      audioContextCurrentTime: this.audioCtx.currentTime,
      outputSampleRate: this.audioCtx.sampleRate,
      masterTrack,
      slaveTrack,
      masterCurrentSourceSample: masterDeck.getCurrentSourceSample(),
      slaveCurrentSourceSample: slaveDeck.getCurrentSourceSample(),
      masterEffectiveBpm: masterBpm,
      slaveIsPlaying: slaveTelemetry.isPlaying,
      quantizeMode
    });

    // The master is never tempo-family constrained by its slave.
    masterDeck.setTempoFamilyLock(null);

    // Prepare stable slave tempo before any start/re-anchor operation.
    slaveDeck.setSync(true);
    slaveDeck.setJogPitchNudge(0);
    slaveDeck.setPLLMultiplier(1.0);
    slaveDeck.setTempoFamilyLock(plan.baseTempoMultiplier);

    // Keep the pitch control display coherent without allowing it to override sync tempo.
    const neededPitchDelta = Math.abs(plan.baseTempoMultiplier - 1.0);
    const currentRange = slaveDeck.getPitchRange();
    if (neededPitchDelta > currentRange) {
      slaveDeck.setPitchRange(Math.min(1.0, Math.max(0.16, neededPitchDelta * 1.05)));
    }
    const effectiveRange = slaveDeck.getPitchRange();
    if (Number.isFinite(effectiveRange) && Math.abs(effectiveRange) > 1e-6) {
      const pitchPct = (plan.baseTempoMultiplier - 1.0) / effectiveRange;
      slaveDeck.setPitchPercentage(Math.max(-1.0, Math.min(1.0, pitchPct)));
    }
    slaveDeck.setTempoFamilyLock(plan.baseTempoMultiplier);
    slaveDeck.setBaseTempoMultiplier(plan.baseTempoMultiplier);

    if (slaveTelemetry.isPlaying) {
      // One controlled re-anchor at a future master beat. No repeated seek loop.
      slaveDeck.syncAlignToMaster(
        plan.targetOutputTime,
        plan.slaveSourceSample,
        plan.baseTempoMultiplier
      );
    } else {
      // Critical fix: start from the SELECTED matching slave beat/kick, not the
      // arbitrary current read-head sample.
      slaveDeck.play(plan.targetOutputTime, plan.slaveSourceSample);
    }

    this.syncEngine.resetController();
    this.masavuPhaseController.reset();
    this.masavuPhaseController.setDesiredGrooveOffsetMs(plan.desiredGrooveOffsetMs ?? 0);
    this.vdj8LastSlaveStartPlan = plan;
    return plan;
  }

  public updatePhaseController(): MasavuPhaseTelemetry {
    const masterDeck = this.getMasterDeckId() === 'A' ? this.deckA : this.deckB;
    const slaveDeck = this.getMasterDeckId() === 'A' ? this.deckB : this.deckA;

    const masterTrack = masterDeck.getTrack();
    const slaveTrack = slaveDeck.getTrack();

    masterDeck.updateCurrentPosition();
    slaveDeck.updateCurrentPosition();

    const masterTelemetry = masterDeck.getTelemetry();
    const slaveTelemetry = slaveDeck.getTelemetry();

    if (!masterTrack || !slaveTrack) {
      return {
        phaseErrorMs: 0,
        phaseErrorDegrees: 0,
        masterBpm: masterTrack ? masterTrack.bpm : 120,
        slaveEffectiveBpm: slaveTrack ? slaveTrack.bpm : 120,
        baseTempoMultiplier: slaveDeck.getBaseTempoMultiplier(),
        temporaryCorrectionPercent: 0,
        numberOfPersistentBadBeats: 0,
        syncState: 'LOCKED',
        reanchorCount: 0
      };
    }

    const masterBpm = masterTelemetry.effectiveBpm > 20 ? masterTelemetry.effectiveBpm : masterTrack.bpm;
    const slaveBpm = slaveTrack.bpm;

    const result = this.masavuPhaseController.update({
      currentTimeSec: this.audioCtx.currentTime,
      isMasterPlaying: masterTelemetry.isPlaying,
      isSlavePlaying: slaveTelemetry.isPlaying,
      masterBpm,
      slaveBpm,
      masterCurrentSample: masterDeck.getCurrentSourceSample(),
      slaveCurrentSample: slaveDeck.getCurrentSourceSample(),
      masterSampleRate: masterTrack.sampleRate,
      slaveSampleRate: slaveTrack.sampleRate,
      masterGrid: masterTrack.beatGrid,
      slaveGrid: slaveTrack.beatGrid,
      baseTempoMultiplier: slaveDeck.getBaseTempoMultiplier(),
      slaveEffectiveBpm: slaveTelemetry.effectiveBpm,
      onScheduleReanchor: () => {
        // Schedule ONE click-free phase re-anchor on the next suitable master beat
        this.triggerBeatPerfectSlaveStart('beat');
      }
    });

    // Only apply PLL multiplier to slave deck when sync is active and both are playing
    if (slaveDeck.getSync() && masterTelemetry.isPlaying && slaveTelemetry.isPlaying) {
      slaveDeck.setPLLMultiplier(result.pllMultiplier);
    } else {
      slaveDeck.setPLLMultiplier(1.0);
    }

    return result.telemetry;
  }

  public override getLastSlaveStartPlan(): SlaveStartPlan | null {
    return this.vdj8LastSlaveStartPlan ?? super.getLastSlaveStartPlan();
  }

  public getLastVdj8Plan(): Vdj8StyleLaunchPlan | null {
    return this.vdj8LastSlaveStartPlan;
  }

  /**
   * Explicitly triggers downbeat alignment (quantizeMode = 'bar').
   * Guarantees that Beat 1.1 of the slave starts on Beat 1.1 of the master.
   */
  public triggerDownbeatAlignment(): SlaveStartPlan | null {
    return this.triggerBeatPerfectSlaveStart('bar');
  }

  /**
   * Performs soft micro-phase correction (jog pitch nudge) to smoothly steer
   * any residual phase error back to 0 ms without cutting the audio.
   */
  public applySoftPhaseCorrection(targetDurationSec = 0.4): { nudgeApplied: number; phaseErrorMs: number } | null {
    const masterDeck = this.getMasterDeckId() === 'A' ? this.deckA : this.deckB;
    const slaveDeck = this.getMasterDeckId() === 'A' ? this.deckB : this.deckA;

    const masterTrack = masterDeck.getTrack();
    const slaveTrack = slaveDeck.getTrack();
    if (!masterTrack || !slaveTrack) return null;

    masterDeck.updateCurrentPosition();
    slaveDeck.updateCurrentPosition();

    const masterTelemetry = masterDeck.getTelemetry();
    const masterBpm = masterTelemetry.effectiveBpm > 20 ? masterTelemetry.effectiveBpm : masterTrack.bpm;

    const errorMs = this.vdj8StyleSyncEngine.measureWrappedPhaseErrorMs({
      masterCurrentSourceSample: masterDeck.getCurrentSourceSample(),
      masterGrid: masterTrack.beatGrid,
      masterBpm,
      slaveCurrentSourceSample: slaveDeck.getCurrentSourceSample(),
      slaveGrid: slaveTrack.beatGrid
    });

    const nudge = this.vdj8StyleSyncEngine.calculateSoftPhaseNudge(errorMs, targetDurationSec);
    slaveDeck.setJogPitchNudge(nudge);

    // Auto-release nudge back to 0 after targetDurationSec
    setTimeout(() => {
      slaveDeck.setJogPitchNudge(0);
    }, targetDurationSec * 1000);

    return {
      nudgeApplied: nudge,
      phaseErrorMs: errorMs
    };
  }

  /**
   * Intentionally shifts the slave read-head by offsetMs to simulate drift,
   * allowing direct observation of phase correction in action.
   */
  public injectPhaseDrift(offsetMs: number): void {
    const slaveDeck = this.getMasterDeckId() === 'A' ? this.deckB : this.deckA;
    const slaveTrack = slaveDeck.getTrack();
    if (!slaveTrack) return;

    const sampleOffset = Math.round((offsetMs / 1000) * slaveTrack.sampleRate);
    const currentSample = slaveDeck.getCurrentSourceSample();
    const newSample = Math.max(0, currentSample + sampleOffset);
    slaveDeck.seek(newSample);
  }

  /**
   * Matches the slave deck's tempo to the master deck's tempo family
   * without altering its playback phase or seeking position.
   */
  public matchSlaveTempoToMaster(): { matchedBpm: number; multiplier: number } | null {
    const masterDeck = this.getMasterDeckId() === 'A' ? this.deckA : this.deckB;
    const slaveDeck = this.getMasterDeckId() === 'A' ? this.deckB : this.deckA;

    const masterTrack = masterDeck.getTrack();
    const slaveTrack = slaveDeck.getTrack();
    if (!masterTrack || !slaveTrack) return null;

    masterDeck.updateCurrentPosition();
    slaveDeck.updateCurrentPosition();

    const masterTelemetry = masterDeck.getTelemetry();
    const masterBpm = masterTelemetry.effectiveBpm > 20 ? masterTelemetry.effectiveBpm : masterTrack.bpm;
    const slaveBpm = slaveTrack.bpm;

    const tempo = this.vdj8StyleSyncEngine.matchTempoFamily(masterBpm, slaveBpm);
    slaveDeck.setTempoFamilyLock(tempo.playbackMultiplier);
    slaveDeck.setBaseTempoMultiplier(tempo.playbackMultiplier);
    slaveDeck.setSync(true);

    return {
      matchedBpm: tempo.equivalentSlaveBpm,
      multiplier: tempo.playbackMultiplier
    };
  }

  /**
   * Intentionally triggers the legacy/defective behavior for side-by-side comparison:
   * schedules slave on master clock, but starts from arbitrary slave current read-head!
   */
  public triggerLegacyDefectiveSlaveStart(): SlaveStartPlan | null {
    return super.triggerBeatPerfectSlaveStart('beat');
  }
}
