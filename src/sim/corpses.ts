import { DEATH } from './constants';
import type { Corpse, GameState } from './types';
import { compact } from './util';

/** Total time a corpse stays: tip + bounce + hold (longer with a quip) + fade. */
export function corpseDuration(corpse: Corpse): number {
  return DEATH.tipSec + DEATH.bounceSec + (corpse.quip ? DEATH.quipHoldSec : DEATH.holdSec) + DEATH.fadeSec;
}

export function updateCorpses(state: GameState, dt: number): void {
  for (const c of state.corpses) c.t += dt;
  compact(state.corpses, (c) => c.t < corpseDuration(c));
}
