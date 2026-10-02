import { SIM_DT } from '../src/sim/constants';
import { step } from '../src/sim/step';
import type { GameState } from '../src/sim/types';

/** Steps the sim for `seconds` of game time at the fixed timestep. */
export function runFor(state: GameState, seconds: number, beforeStep?: (s: GameState) => void): void {
  const steps = Math.round(seconds / SIM_DT);
  for (let i = 0; i < steps; i++) {
    beforeStep?.(state);
    step(state, SIM_DT);
  }
}

/** Steps until the predicate holds or the time limit passes. Returns seconds elapsed. */
export function runUntil(state: GameState, done: (s: GameState) => boolean, maxSeconds = 600): number {
  const start = state.time;
  while (!done(state) && state.time - start < maxSeconds) step(state, SIM_DT);
  return state.time - start;
}
