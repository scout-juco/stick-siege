import { describe, expect, it } from 'vitest';
import { autopilotStep, createAutopilot } from '../src/sim/autopilot';
import { SIM_DT } from '../src/sim/constants';
import { createGame } from '../src/sim/state';
import { step } from '../src/sim/step';
import type { GameState } from '../src/sim/types';

/** Plays a whole game with the scripted decent player. Speed doesn't matter: 2× is just two steps per tick. */
function autoplay(seed: number): GameState {
  const state = createGame(seed);
  const pilot = createAutopilot();
  for (let i = 0; i < 60 * 60 * 30 && (state.phase === 'ready' || state.phase === 'playing'); i++) {
    autopilotStep(state, pilot);
    step(state, SIM_DT);
  }
  return state;
}

describe('balance harness (scripted decent player)', () => {
  it('plays a full game to an ending', () => {
    const state = autoplay(1);
    expect(['won', 'lost']).toContain(state.phase);
  });

  it('is deterministic for a seed', () => {
    const a = autoplay(11);
    const b = autoplay(11);
    expect(a.phase).toBe(b.phase);
    expect(a.lives).toBe(b.lives);
    expect(a.time).toBe(b.time);
    expect(a.stats).toEqual(b.stats);
  });

  it('reports lives remaining across seeds', () => {
    const results = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => {
      const s = autoplay(seed);
      return { seed, phase: s.phase, lives: s.lives, wave: s.waveNumber, kills: s.stats.kills, leaks: s.stats.leaks };
    });
    console.log('[balance]', JSON.stringify(results));
    expect(results).toHaveLength(8);
  });
});
