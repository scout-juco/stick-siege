import { describe, expect, it } from 'vitest';
import { ECONOMY, waves } from '../src/data/waves';
import { createGame } from '../src/sim/state';
import type { EnemyKind } from '../src/sim/types';
import { callNextWave, canCallWave, startWave } from '../src/sim/waves';
import { runFor } from './helpers';

const count = (state: ReturnType<typeof createGame>, kind?: EnemyKind) =>
  state.enemies.filter((e) => kind === undefined || e.kind === kind).length;

describe('wave spawner', () => {
  it('matches the spec composition for every wave', () => {
    const spec: Record<number, Partial<Record<EnemyKind, number>>> = {
      1: { peasant: 8 },
      2: { peasant: 12 },
      3: { peasant: 8, squire: 6 },
      4: { peasant: 10, tinCan: 3 },
      5: { squire: 14, peasant: 4 },
      6: { peasant: 8, bard: 2 },
      7: { tinCan: 8, squire: 6 },
      8: { peasant: 12, squire: 6, tinCan: 4, bard: 2 },
      9: { bard: 6, squire: 10 },
      10: { tinCan: 10, bard: 4 },
      11: { peasant: 20, squire: 12, tinCan: 6, bard: 4 },
      12: { reginald: 1, peasant: 10, tinCan: 6 },
    };
    expect(waves).toHaveLength(12);
    for (const [i, wave] of waves.entries()) {
      const totals: Partial<Record<EnemyKind, number>> = {};
      for (const g of wave.groups) totals[g.enemy] = (totals[g.enemy] ?? 0) + g.count;
      expect(totals, `wave ${i + 1}`).toEqual(spec[i + 1]);
    }
  });

  it('spawns the first enemy at once, then one per spacingSec', () => {
    const state = createGame(1);
    startWave(state); // wave 1: 8 peasants, 1.5 s apart
    runFor(state, 1 / 60);
    expect(count(state)).toBe(1);
    runFor(state, 1.5);
    expect(count(state)).toBe(2);
    runFor(state, 1.5 * 6);
    expect(count(state)).toBe(8);
    runFor(state, 5);
    expect(count(state)).toBe(8);
  });

  it('starts each group after its delay, running groups in parallel', () => {
    const state = createGame(1);
    state.waveNumber = 2; // next is wave 3: 8 peasants (1.4 s) + 6 squires from 5 s (1.2 s)
    startWave(state);
    runFor(state, 4.9);
    expect(count(state, 'squire')).toBe(0);
    expect(count(state, 'peasant')).toBe(4);
    runFor(state, 0.2);
    expect(count(state, 'squire')).toBe(1);
    runFor(state, 1.2 * 5);
    expect(count(state, 'squire')).toBe(6);
  });

  it('counts down 10 s after the last spawn, then auto-starts the next wave', () => {
    const state = createGame(1);
    startWave(state);
    runFor(state, 1.5 * 7 + 1 / 60); // just past the last of 8 peasants
    expect(state.countdown).toBeCloseTo(ECONOMY.waveCountdownSec, 1);
    runFor(state, ECONOMY.waveCountdownSec - 0.2);
    expect(state.waveNumber).toBe(1);
    runFor(state, 0.3);
    expect(state.waveNumber).toBe(2);
  });

  it('waits for the player before wave 1 and cannot be called mid-spawn', () => {
    const state = createGame(1);
    runFor(state, 30);
    expect(state.waveNumber).toBe(0);
    expect(canCallWave(state)).toBe(true);
    callNextWave(state);
    expect(state.waveNumber).toBe(1);
    expect(canCallWave(state)).toBe(false);
  });
});
