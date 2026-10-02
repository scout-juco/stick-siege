import { describe, expect, it } from 'vitest';
import { towers } from '../src/data/towers';
import { spawnEnemy } from '../src/sim/enemies';
import { createGame } from '../src/sim/state';
import { buildTower } from '../src/sim/towers';
import type { GameState } from '../src/sim/types';
import { runFor, runUntil } from './helpers';

function withBarracks(seed = 1): GameState {
  const state = createGame(seed);
  state.phase = 'playing';
  state.gold = 10_000;
  // Slot 1 sits beside the first bend, early on the road.
  buildTower(state, 1, 'barracks');
  runFor(state, 3); // knights walk out to their posts
  return state;
}

describe('barracks knights', () => {
  it('spawns 3 knights with 60 HP that take up posts near the road', () => {
    const state = withBarracks();
    const tower = state.towers[0]!;
    expect(state.knights).toHaveLength(towers.barracks.knight.count);
    for (const k of state.knights) {
      expect(k.hp).toBe(60);
      expect(Math.hypot(k.x - k.homeX, k.y - k.homeY)).toBeLessThan(1);
      expect(Math.hypot(tower.rallyX - tower.x, tower.rallyY - tower.y)).toBeLessThanOrEqual(towers.barracks.rallyRadius);
    }
  });

  it('block a peasant at the rally point and fight it', () => {
    const state = withBarracks();
    const peasant = spawnEnemy(state, 'peasant');
    runUntil(state, () => peasant.blocked, 60);
    expect(peasant.blocked).toBe(true);
    const held = peasant.dist;
    runFor(state, 2);
    expect(peasant.dist).toBe(held);
    expect(peasant.hp).toBeLessThan(peasant.maxHp);
  });

  it('each knight holds at most one enemy; extras walk past', () => {
    const state = withBarracks();
    for (let i = 0; i < 6; i++) spawnEnemy(state, 'tinCan');
    runFor(state, 20);
    const blocked = state.enemies.filter((e) => e.blocked);
    expect(blocked.length).toBeLessThanOrEqual(3);
    expect(new Set(blocked.map((e) => e.blockerId)).size).toBe(blocked.length);
  });

  it('dead knights respawn after 8 s', () => {
    const state = withBarracks();
    const knight = state.knights[0]!;
    knight.hp = 0.01;
    const bard = spawnEnemy(state, 'bard');
    bard.hp = 1e6; // a bard that will not die, so the fight goes on
    bard.maxHp = 1e6;
    runUntil(state, () => !knight.alive, 120);
    expect(knight.alive).toBe(false);
    runFor(state, towers.barracks.knight.respawnSec - 0.1);
    expect(knight.alive).toBe(false);
    runFor(state, 0.2);
    expect(knight.alive).toBe(true);
    expect(knight.hp).toBe(60);
  });

  it('the boss is never blocked and tramples knights flat', () => {
    const state = withBarracks();
    const boss = spawnEnemy(state, 'reginald');
    runUntil(state, () => state.knights.some((k) => !k.alive), 200);
    expect(boss.blocked).toBe(false);
    expect(boss.blockerId).toBeNull();
    const flattened = state.corpses.filter((c) => c.kind === 'knight' && c.squashed);
    expect(flattened.length).toBeGreaterThan(0);
    // He keeps walking.
    const d = boss.dist;
    runFor(state, 1);
    expect(boss.dist).toBeGreaterThan(d);
  });
});
