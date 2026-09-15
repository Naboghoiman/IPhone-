/**
 * MASAVU SYNCHRONIZATION PHASE CONTROLLER
 *
 * Dedicated phase controller for maintaining beat lock after kick-to-kick launch.
 *
 * SPECIFICATION CONSTRAINTS:
 * - Does not replace the kick-to-kick slave-start system.
 * - Does not continuously auto-nudge the slave.
 * - Does not repeatedly seek every beat.
 * - Deadband: abs(error) <= 10ms -> PLL multiplier exactly 1.000000
 * - Small persistent error (10-35ms, >=2 beats) -> max ±0.6% rate over 2-4 beats.
 * - Medium error (35-80ms, >=2 beats) -> max ±1.0% rate over ~2 beats.
 * - Large error (>80ms or >0.20 beat, >=2 beats) -> ONE scheduled click-free re-anchor.
 * - Integral anti-windup: clamped, cleared in deadband & after re-anchor.
 */

import { BeatGrid } from '../types/dj';

export type MasavuSyncState =
  | 'ACQUIRING'
  | 'LOCKED'
  | 'CORRECTING'
  | 'REANCHOR_PENDING'
  | 'REANCHORING';

export interface MasavuPhaseTelemetry {
  phaseErrorMs: number;
  gridPhaseErrorMs?: number;
  desiredGrooveOffsetMs?: number;
  isGrooveLocked?: boolean;
  phaseErrorDegrees: number;
  masterBpm: number;
  slaveEffectiveBpm: number;
  baseTempoMultiplier: number;
  temporaryCorrectionPercent: number; // e.g. +0.45% or -0.60%
  numberOfPersistentBadBeats: number;
  syncState: MasavuSyncState;
  reanchorCount: number;
}

export interface PhaseControllerUpdateParams {
  currentTimeSec: number;
  isMasterPlaying: boolean;
  isSlavePlaying: boolean;
  masterBpm: number;
  slaveBpm: number;
  masterCurrentSample: number;
  slaveCurrentSample: number;
  masterSampleRate: number;
  slaveSampleRate: number;
  masterGrid: BeatGrid;
  slaveGrid: BeatGrid;
  baseTempoMultiplier: number;
  slaveEffectiveBpm: number;
  desiredGrooveOffsetMs?: number;
  onScheduleReanchor: () => void;
}

export class MasavuPhaseController {
  private syncState: MasavuSyncState = 'ACQUIRING';
  private reanchorCount = 0;
  private numberOfPersistentBadBeats = 0;

  private lastMasterBeatIndex: number | null = null;
  private currentCorrectionRate = 0.0; // e.g. +0.005 (+0.5%)
  private integralAccumulator = 0.0;
  private lastUpdateTimeSec = 0;

  private reanchorScheduledUntilTime = 0;
  private desiredGrooveOffsetMs = 0.0;

  public setDesiredGrooveOffsetMs(offsetMs: number): void {
    this.desiredGrooveOffsetMs = Number.isFinite(offsetMs) ? offsetMs : 0.0;
  }

  public getDesiredGrooveOffsetMs(): number {
    return this.desiredGrooveOffsetMs;
  }

  /**
   * Reset all phase controller state on manual play, cue, or new launch
   */
  public reset(): void {
    this.syncState = 'ACQUIRING';
    this.numberOfPersistentBadBeats = 0;
    this.currentCorrectionRate = 0.0;
    this.integralAccumulator = 0.0;
    this.lastMasterBeatIndex = null;
    this.reanchorScheduledUntilTime = 0;
  }

  /**
   * Resets the reanchor count if desired (e.g. on new track load)
   */
  public resetReanchorCount(): void {
    this.reanchorCount = 0;
  }

  /**
   * Main synchronization update call.
   * Calculates phase error, checks persistence, applies deadband, smooth rate correction,
   * or triggers a single click-free re-anchor when error is large.
   *
   * Returns the exact PLL multiplier to apply (1.000000 in deadband) and full telemetry.
   */
  public update(params: PhaseControllerUpdateParams): {
    pllMultiplier: number;
    telemetry: MasavuPhaseTelemetry;
  } {
    const {
      currentTimeSec,
      isMasterPlaying,
      isSlavePlaying,
      masterBpm,
      slaveBpm: _slaveBpm,
      masterCurrentSample,
      slaveCurrentSample,
      masterGrid,
      slaveGrid,
      baseTempoMultiplier,
      slaveEffectiveBpm,
      onScheduleReanchor
    } = params;

    const dt = this.lastUpdateTimeSec > 0
      ? Math.max(0.001, Math.min(0.2, currentTimeSec - this.lastUpdateTimeSec))
      : 0.016;
    this.lastUpdateTimeSec = currentTimeSec;

    // Default locked/idle telemetry when not actively playing both decks
    if (!isMasterPlaying || !isSlavePlaying || masterBpm <= 20 || !masterGrid || !slaveGrid) {
      this.syncState = isMasterPlaying || isSlavePlaying ? 'ACQUIRING' : 'LOCKED';
      this.numberOfPersistentBadBeats = 0;
      this.currentCorrectionRate = 0.0;
      this.integralAccumulator = 0.0;

      return {
        pllMultiplier: 1.0,
        telemetry: {
          phaseErrorMs: 0,
          gridPhaseErrorMs: 0,
          desiredGrooveOffsetMs: this.desiredGrooveOffsetMs,
          isGrooveLocked: false,
          phaseErrorDegrees: 0,
          masterBpm: masterBpm > 0 ? masterBpm : 120,
          slaveEffectiveBpm: slaveEffectiveBpm > 0 ? slaveEffectiveBpm : 120,
          baseTempoMultiplier,
          temporaryCorrectionPercent: 0.0,
          numberOfPersistentBadBeats: 0,
          syncState: this.syncState,
          reanchorCount: this.reanchorCount
        }
      };
    }

    // Check if we are currently waiting for a scheduled re-anchor to complete
    if (this.syncState === 'REANCHORING' || this.syncState === 'REANCHOR_PENDING') {
      if (currentTimeSec < this.reanchorScheduledUntilTime) {
        // Still executing scheduled re-anchor
        return {
          pllMultiplier: 1.0,
          telemetry: {
            phaseErrorMs: 0,
            gridPhaseErrorMs: 0,
            desiredGrooveOffsetMs: this.desiredGrooveOffsetMs,
            isGrooveLocked: false,
            phaseErrorDegrees: 0,
            masterBpm,
            slaveEffectiveBpm,
            baseTempoMultiplier,
            temporaryCorrectionPercent: 0.0,
            numberOfPersistentBadBeats: 0,
            syncState: this.syncState,
            reanchorCount: this.reanchorCount
          }
        };
      } else {
        // Re-anchor complete: transition cleanly into LOCKED
        this.syncState = 'LOCKED';
        this.numberOfPersistentBadBeats = 0;
        this.integralAccumulator = 0;
        this.currentCorrectionRate = 0;
      }
    }

    // 1. Calculate beat positions
    const masterSamplesPerBeat = masterGrid.samplesPerBeat > 0 ? masterGrid.samplesPerBeat : 22050;
    const slaveSamplesPerBeat = slaveGrid.samplesPerBeat > 0 ? slaveGrid.samplesPerBeat : 22050;

    const masterBeatFloat = (masterCurrentSample - masterGrid.firstDownbeatSample) / masterSamplesPerBeat;
    const slaveBeatFloat = (slaveCurrentSample - slaveGrid.firstDownbeatSample) / slaveSamplesPerBeat;

    // 1 & 2. Calculate phase error: slaveBeatTime - masterBeatTime wrapped to [-0.5 beat, +0.5 beat]
    const rawBeatError = slaveBeatFloat - masterBeatFloat;
    const wrappedBeatError = rawBeatError - Math.round(rawBeatError);

    const masterBeatPeriodSec = 60 / masterBpm;
    const masterBeatPeriodMs = masterBeatPeriodSec * 1000;

    const gridPhaseErrorMs = wrappedBeatError * masterBeatPeriodMs;

    if (params.desiredGrooveOffsetMs !== undefined) {
      this.desiredGrooveOffsetMs = params.desiredGrooveOffsetMs;
    }

    // SECTION 9: Maintain actualRhythmicOffset ≈ desiredGrooveOffsetMs
    // rather than assuming every correct mix must have kick offset = 0 ms.
    const rawRhythmicErrorMs = gridPhaseErrorMs - this.desiredGrooveOffsetMs;
    const wrappedRhythmicBeatError =
      rawRhythmicErrorMs / masterBeatPeriodMs - Math.round(rawRhythmicErrorMs / masterBeatPeriodMs);
    const phaseErrorMs = wrappedRhythmicBeatError * masterBeatPeriodMs;
    const phaseErrorDegrees = wrappedRhythmicBeatError * 360;
    const absErrorMs = Math.abs(phaseErrorMs);
    const absBeatError = Math.abs(wrappedRhythmicBeatError);

    // Track beat crossings to measure persistence in units of musical beats
    const currentMasterBeatIndex = Math.floor(masterBeatFloat);
    if (this.lastMasterBeatIndex === null) {
      this.lastMasterBeatIndex = currentMasterBeatIndex;
    } else if (currentMasterBeatIndex !== this.lastMasterBeatIndex) {
      // Crossed one or more master beats
      const beatsPassed = Math.abs(currentMasterBeatIndex - this.lastMasterBeatIndex);
      this.lastMasterBeatIndex = currentMasterBeatIndex;

      if (absErrorMs > 10.0) {
        this.numberOfPersistentBadBeats = Math.min(20, this.numberOfPersistentBadBeats + beatsPassed);
      } else {
        this.numberOfPersistentBadBeats = 0;
      }
    }

    // 3. DEADBAND: abs(error) <= 10 ms
    // = LOCKED
    // = correction 0
    // = PLL multiplier exactly 1.000000
    if (absErrorMs <= 10.0) {
      this.syncState = 'LOCKED';
      this.numberOfPersistentBadBeats = 0;
      this.integralAccumulator = 0.0; // Rule 8: clear integral inside deadband

      // Smoothly return any remaining correction to 0
      this.currentCorrectionRate *= 0.85;
      if (Math.abs(this.currentCorrectionRate) < 0.0001) {
        this.currentCorrectionRate = 0.0;
      }

      return {
        pllMultiplier: 1.0,
        telemetry: {
          phaseErrorMs,
          gridPhaseErrorMs,
          desiredGrooveOffsetMs: this.desiredGrooveOffsetMs,
          isGrooveLocked: Math.abs(this.desiredGrooveOffsetMs) > 0.5 && absErrorMs <= 10.0,
          phaseErrorDegrees,
          masterBpm,
          slaveEffectiveBpm,
          baseTempoMultiplier,
          temporaryCorrectionPercent: 0.0,
          numberOfPersistentBadBeats: 0,
          syncState: 'LOCKED',
          reanchorCount: this.reanchorCount
        }
      };
    }

    // 6. LARGE ERROR: > 80 ms OR > 0.20 beat
    // Only if persistent across at least 2 beats:
    // Do NOT chase it with repeated rate changes.
    // Schedule ONE phase re-anchor on the next suitable master beat.
    const isLargeError = absErrorMs > 80.0 || absBeatError > 0.20;
    if (isLargeError) {
      if (this.numberOfPersistentBadBeats >= 2) {
        this.syncState = 'REANCHOR_PENDING';

        // Perform ONE click-free scheduled re-anchor
        this.reanchorCount++;
        this.syncState = 'REANCHORING';
        this.reanchorScheduledUntilTime = currentTimeSec + masterBeatPeriodSec + 0.15;

        // Rule 8: clear integral after re-anchor
        this.integralAccumulator = 0.0;
        this.currentCorrectionRate = 0.0;
        this.numberOfPersistentBadBeats = 0;

        try {
          onScheduleReanchor();
        } catch (err) {
          console.warn('MasavuPhaseController reanchor error:', err);
        }

        return {
          pllMultiplier: 1.0,
          telemetry: {
            phaseErrorMs,
            gridPhaseErrorMs,
            desiredGrooveOffsetMs: this.desiredGrooveOffsetMs,
            isGrooveLocked: false,
            phaseErrorDegrees,
            masterBpm,
            slaveEffectiveBpm,
            baseTempoMultiplier,
            temporaryCorrectionPercent: 0.0,
            numberOfPersistentBadBeats: 0,
            syncState: 'REANCHORING',
            reanchorCount: this.reanchorCount
          }
        };
      } else {
        // Not yet persistent across 2 beats; hold steady at 1.0 without chasing
        this.syncState = 'LOCKED';
        return {
          pllMultiplier: 1.0,
          telemetry: {
            phaseErrorMs,
            gridPhaseErrorMs,
            desiredGrooveOffsetMs: this.desiredGrooveOffsetMs,
            isGrooveLocked: Math.abs(this.desiredGrooveOffsetMs) > 0.5 && absErrorMs <= 10.0,
            phaseErrorDegrees,
            masterBpm,
            slaveEffectiveBpm,
            baseTempoMultiplier,
            temporaryCorrectionPercent: 0.0,
            numberOfPersistentBadBeats: this.numberOfPersistentBadBeats,
            syncState: 'LOCKED',
            reanchorCount: this.reanchorCount
          }
        };
      }
    }

    // Check persistence requirement for small and medium errors
    // Must persist for at least 2 consecutive beats before correction
    if (this.numberOfPersistentBadBeats < 2) {
      // Do not apply correction yet
      this.syncState = 'LOCKED';
      this.currentCorrectionRate *= 0.9;
      if (Math.abs(this.currentCorrectionRate) < 0.0001) {
        this.currentCorrectionRate = 0.0;
      }

      return {
        pllMultiplier: 1.0,
        telemetry: {
          phaseErrorMs,
          gridPhaseErrorMs,
          desiredGrooveOffsetMs: this.desiredGrooveOffsetMs,
          isGrooveLocked: Math.abs(this.desiredGrooveOffsetMs) > 0.5 && absErrorMs <= 10.0,
          phaseErrorDegrees,
          masterBpm,
          slaveEffectiveBpm,
          baseTempoMultiplier,
          temporaryCorrectionPercent: 0.0,
          numberOfPersistentBadBeats: this.numberOfPersistentBadBeats,
          syncState: 'LOCKED',
          reanchorCount: this.reanchorCount
        }
      };
    }

    // 7. CORRECTION SIGN:
    // slave late (phaseErrorMs < 0) -> temporarily speed slave up (positive correction)
    // slave early (phaseErrorMs > 0) -> temporarily slow slave down (negative correction)
    const sign = phaseErrorMs < 0 ? 1 : -1;

    let maxRateLimit = 0.006; // Small error limit: 0.6%
    let spreadBeats = 3.0;     // Spread over 2-4 beats

    if (absErrorMs > 35.0 && absErrorMs <= 80.0) {
      // 5. MEDIUM ERROR: 35–80 ms
      // Maximum temporary rate correction = ±1.0%
      // Correct smoothly over approximately 2 beats.
      maxRateLimit = 0.010;
      spreadBeats = 2.0;
    } else {
      // 4. SMALL PERSISTENT ERROR: 10–35 ms
      // Maximum correction = ±0.6%
      // Spread correction smoothly over 2–4 beats.
      maxRateLimit = 0.006;
      spreadBeats = 3.0;
    }

    // 8. INTEGRAL PROTECTION:
    // Proportional + anti-windup Integral
    // target proportional correction scales down toward 0 as error approaches deadband
    const normalizedError = Math.min(1.0, (absErrorMs - 10.0) / 70.0);
    const targetProportional = sign * (normalizedError * maxRateLimit);

    this.integralAccumulator += sign * normalizedError * (dt / (spreadBeats * masterBeatPeriodSec)) * 0.002;
    // Clamp integral accumulated correction
    this.integralAccumulator = Math.max(-0.003, Math.min(0.003, this.integralAccumulator));

    const targetCorrection = Math.max(-maxRateLimit, Math.min(maxRateLimit, targetProportional + this.integralAccumulator));

    // Smooth transition filter to spread correction over beats without sudden rate jumps
    const filterTimeConstantSec = Math.max(0.1, spreadBeats * masterBeatPeriodSec * 0.4);
    const alpha = Math.min(1.0, dt / filterTimeConstantSec);
    this.currentCorrectionRate += alpha * (targetCorrection - this.currentCorrectionRate);

    // Hard clamp to prevent exceeding allowed limits
    this.currentCorrectionRate = Math.max(-maxRateLimit, Math.min(maxRateLimit, this.currentCorrectionRate));

    this.syncState = 'CORRECTING';
    const pllMultiplier = 1.0 + this.currentCorrectionRate;

    return {
      pllMultiplier,
      telemetry: {
        phaseErrorMs,
        gridPhaseErrorMs,
        desiredGrooveOffsetMs: this.desiredGrooveOffsetMs,
        isGrooveLocked: false,
        phaseErrorDegrees,
        masterBpm,
        slaveEffectiveBpm,
        baseTempoMultiplier,
        temporaryCorrectionPercent: Number((this.currentCorrectionRate * 100).toFixed(3)),
        numberOfPersistentBadBeats: this.numberOfPersistentBadBeats,
        syncState: 'CORRECTING',
        reanchorCount: this.reanchorCount
      }
    };
  }
}
