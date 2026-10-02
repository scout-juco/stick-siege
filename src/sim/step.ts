import { SIM_DT } from './constants';
import { updateCorpses } from './corpses';
import { removeDeadEnemies, updateEnemies } from './enemies';
import { updateKnights } from './knights';
import { updateProjectiles } from './projectiles';
import { updateTowers } from './towers';
import type { GameState } from './types';
import { checkVictory, updateWaves } from './waves';

/** Records positions at the start of a tick so the renderer can interpolate. */
export function snapshotPrev(state: GameState): void {
  for (const e of state.enemies) {
    e.prevX = e.x;
    e.prevY = e.y;
  }
  for (const k of state.knights) {
    k.prevX = k.x;
    k.prevY = k.y;
  }
  for (const p of state.projectiles) {
    p.prevX = p.x;
    p.prevY = p.y;
    if (p.kind === 'boulder') p.prevHeight = p.height;
  }
}

/**
 * One fixed tick: snapshot, then `state.speed` sim steps of SIM_DT.
 * Game speed multiplies steps, never dt.
 */
export function tick(state: GameState, beforeStep?: (state: GameState) => void): void {
  snapshotPrev(state);
  if (state.paused) return;
  if (isOver(state)) {
    // The battle is frozen, but the last casualties still finish falling over.
    updateCorpses(state, SIM_DT);
    return;
  }
  for (let i = 0; i < state.speed && !isOver(state); i++) {
    beforeStep?.(state);
    step(state, SIM_DT);
  }
}

export function isOver(state: GameState): boolean {
  return state.phase === 'won' || state.phase === 'lost';
}

/** Advances the simulation by dt seconds. */
export function step(state: GameState, dt: number): void {
  state.time += dt;
  updateWaves(state, dt);
  updateEnemies(state, dt);
  updateKnights(state, dt);
  updateTowers(state, dt);
  updateProjectiles(state, dt);
  removeDeadEnemies(state);
  updateCorpses(state, dt);
  if (state.bossLine && state.time >= state.bossLine.until) state.bossLine = null;
  checkVictory(state);
}
