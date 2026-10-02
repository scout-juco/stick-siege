import { describe, expect, it } from 'vitest';
import { enemies } from '../src/data/enemies';
import { ECONOMY } from '../src/data/waves';
import { damageEnemy } from '../src/sim/combat';
import { corpseDuration } from '../src/sim/corpses';
import { spawnEnemy } from '../src/sim/enemies';
import { createGame } from '../src/sim/state';
import { runFor, runUntil } from './helpers';

function playing(seed = 1) {
  const state = createGame(seed);
  state.phase = 'playing';
  return state;
}

describe('leaks and lives', () => {
  it('a regular enemy reaching the gate costs 1 life and pays nothing', () => {
    const state = playing();
    spawnEnemy(state, 'peasant');
    const gold = state.gold;
    runUntil(state, (s) => s.enemies.length === 0);
    expect(state.lives).toBe(ECONOMY.startLives - 1);
    expect(state.gold).toBe(gold);
    expect(state.stats.leaks).toBe(1);
    expect(state.phase).toBe('playing');
  });

  it('every regular type costs exactly 1', () => {
    for (const kind of ['peasant', 'squire', 'tinCan', 'bard'] as const) {
      expect(enemies[kind].leakCost).toBe(1);
    }
  });

  it('the boss leaking costs 20 lives, which is always a loss', () => {
    const state = playing();
    spawnEnemy(state, 'reginald');
    runUntil(state, (s) => s.enemies.length === 0, 400);
    expect(state.lives).toBe(0);
    expect(state.phase).toBe('lost');
  });

  it('losing the last life ends the game', () => {
    const state = playing();
    state.lives = 1;
    spawnEnemy(state, 'squire');
    runUntil(state, (s) => s.phase !== 'playing');
    expect(state.phase).toBe('lost');
    expect(state.lives).toBe(0);
  });
});

describe('kills', () => {
  it('pay the bounty and leave a corpse that eventually fades', () => {
    const state = playing();
    const squire = spawnEnemy(state, 'squire');
    const gold = state.gold;
    expect(damageEnemy(state, squire, 1000, 'magic')).toBe(true);
    expect(state.gold).toBe(gold + enemies.squire.bounty);
    runFor(state, 1 / 60);
    expect(state.enemies).toHaveLength(0);
    expect(state.corpses).toHaveLength(1);
    runFor(state, corpseDuration(state.corpses[0]!) + 0.1);
    expect(state.corpses).toHaveLength(0);
  });

  it('quips about a quarter of the time, at most two at once', () => {
    const state = playing(7);
    let quips = 0;
    const deaths = 400;
    for (let i = 0; i < deaths; i++) {
      const p = spawnEnemy(state, 'peasant');
      damageEnemy(state, p, 1000, 'magic');
      expect(state.corpses.filter((c) => c.quip).length).toBeLessThanOrEqual(2);
      if (state.corpses.at(-1)!.quip) quips++;
      runFor(state, 2.5); // let corpses clear so the on-screen cap doesn't skew the rate
    }
    expect(quips / deaths).toBeGreaterThan(0.18);
    expect(quips / deaths).toBeLessThan(0.32);
  });
});
