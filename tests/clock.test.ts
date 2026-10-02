import { describe, expect, it } from 'vitest';
import { advanceClock, createClock } from '../src/sim/clock';
import { MAX_FRAME_SEC, SIM_DT } from '../src/sim/constants';
import { createGame } from '../src/sim/state';
import { tick } from '../src/sim/step';

describe('fixed-timestep clock', () => {
  it('runs whole 60 Hz ticks and returns the leftover as alpha', () => {
    const clock = createClock();
    let ticks = 0;
    const alpha = advanceClock(clock, SIM_DT * 2.5, () => ticks++);
    expect(ticks).toBe(2);
    expect(alpha).toBeCloseTo(0.5);
  });

  it('clamps long frames so the sim never spirals', () => {
    const clock = createClock();
    let ticks = 0;
    advanceClock(clock, 10, () => ticks++);
    expect(ticks).toBe(Math.floor(MAX_FRAME_SEC / SIM_DT + 1e-9));
  });

  it('2× speed doubles the number of steps, not dt', () => {
    const one = createGame(1);
    const two = createGame(1);
    two.speed = 2;
    for (let i = 0; i < 60; i++) {
      tick(one);
      tick(two);
    }
    expect(one.time).toBeCloseTo(1);
    expect(two.time).toBeCloseTo(2);
  });

  it('does not step while paused', () => {
    const state = createGame(1);
    state.paused = true;
    tick(state);
    expect(state.time).toBe(0);
  });
});
