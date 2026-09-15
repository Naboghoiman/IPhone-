/**
 * MASAVU deck compatibility layer for tempo-family synchronization.
 *
 * The original deck implementation lives unchanged in djDeckBase.ts. This
 * subclass only adds a stable tempo-family lock so the controller's normal
 * sync tick cannot overwrite a 0.5x/1x/2x tempo interpretation after launch.
 */

import { PreparedTrack, TrackData } from '../types/dj';
import { DjDeck as BaseDjDeck } from './djDeckBase';

export class DjDeck extends BaseDjDeck {
  private tempoFamilyLock: number | null = null;

  public setTempoFamilyLock(multiplier: number | null): void {
    if (multiplier === null) {
      this.tempoFamilyLock = null;
      return;
    }

    const safe = Number.isFinite(multiplier) && multiplier > 0.1 && multiplier < 4.0
      ? multiplier
      : 1.0;
    this.tempoFamilyLock = safe;
    super.setBaseTempoMultiplier(safe);
  }

  public getTempoFamilyLock(): number | null {
    return this.tempoFamilyLock;
  }

  public override setBaseTempoMultiplier(multiplier: number): void {
    super.setBaseTempoMultiplier(this.tempoFamilyLock ?? multiplier);
  }

  public override setSync(isSync: boolean): void {
    if (!isSync) {
      this.tempoFamilyLock = null;
    }
    super.setSync(isSync);
  }

  public override loadTrack(track: TrackData, targetBpm?: number): PreparedTrack {
    this.tempoFamilyLock = null;
    return super.loadTrack(track, targetBpm);
  }
}
