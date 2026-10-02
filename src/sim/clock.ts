import { MAX_FRAME_SEC, SIM_DT } from './constants';

/** Fixed-timestep accumulator. Real frame time goes in; whole 60 Hz ticks come out. */
export interface Clock {
  accumulator: number;
}

export function createClock(): Clock {
  return { accumulator: 0 };
}

/**
 * Adds real elapsed time and runs as many fixed ticks as fit.
 * Returns the interpolation alpha in [0, 1) for rendering between the last two ticks.
 */
export function advanceClock(clock: Clock, frameSec: number, tick: () => void): number {
  clock.accumulator += Math.max(0, Math.min(frameSec, MAX_FRAME_SEC));
  while (clock.accumulator >= SIM_DT) {
    tick();
    clock.accumulator -= SIM_DT;
  }
  return clock.accumulator / SIM_DT;
}
