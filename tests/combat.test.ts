import { describe, expect, it } from 'vitest';
import { enemies } from '../src/data/enemies';
import { towers } from '../src/data/towers';
import { damageEnemy, mitigate, splashFactor } from '../src/sim/combat';
import { applySlow, enemySpeed, placeOnPath, spawnEnemy } from '../src/sim/enemies';
import { splash } from '../src/sim/projectiles';
import { createGame } from '../src/sim/state';
import { buildTower, predictPosition, selectTarget } from '../src/sim/towers';
import type { EnemyKind, GameState } from '../src/sim/types';
import { runFor } from './helpers';

function playing(seed = 1): GameState {
  const state = createGame(seed);
  state.phase = 'playing';
  return state;
}

/** Spawns an enemy at a given distance along the road, on the centreline. */
function enemyAt(state: GameState, kind: EnemyKind, dist: number) {
  const e = spawnEnemy(state, kind);
  e.laneOffset = 0;
  e.dist = dist;
  placeOnPath(state, e);
  return e;
}

describe('armor', () => {
  it('reduces physical damage by dmg × (1 − armor)', () => {
    expect(mitigate(8, 'physical', 0)).toBe(8);
    expect(mitigate(8, 'physical', enemies.tinCan.armor)).toBe(4);
    expect(mitigate(22, 'physical', enemies.reginald.armor)).toBeCloseTo(16.5);
  });

  it('never reduces magic', () => {
    expect(mitigate(14, 'magic', enemies.tinCan.armor)).toBe(14);
    expect(mitigate(14, 'magic', enemies.reginald.armor)).toBe(14);
  });

  it('applies through damageEnemy', () => {
    const state = playing();
    const can = spawnEnemy(state, 'tinCan');
    damageEnemy(state, can, 8, 'physical');
    expect(can.hp).toBe(enemies.tinCan.hp - 4);
    damageEnemy(state, can, 14, 'magic');
    expect(can.hp).toBe(enemies.tinCan.hp - 18);
  });
});

describe('splash falloff', () => {
  const r = towers.catapult.projectile.splashRadius;
  const edge = towers.catapult.projectile.splashEdgeFactor;

  it('is full at the centre, falls linearly to the edge factor, and stops outside', () => {
    expect(splashFactor(0, r, edge)).toBe(1);
    expect(splashFactor(r / 2, r, edge)).toBeCloseTo(0.75);
    expect(splashFactor(r, r, edge)).toBeCloseTo(edge);
    expect(splashFactor(r + 0.01, r, edge)).toBe(0);
  });

  it('hits every enemy in the radius by its distance', () => {
    const state = playing();
    const centre = enemyAt(state, 'peasant', 400);
    const near = enemyAt(state, 'peasant', 420);
    const far = enemyAt(state, 'peasant', 470);
    const dNear = Math.hypot(near.x - centre.x, near.y - centre.y);
    splash(state, centre.x, centre.y, r, edge, 22, 'physical');
    expect(centre.hp).toBeCloseTo(30 - 22);
    expect(near.hp).toBeCloseTo(30 - 22 * splashFactor(dNear, r, edge));
    expect(far.hp).toBe(30);
  });

  it('boulders land where the target is predicted to be', () => {
    const state = playing();
    const peasant = enemyAt(state, 'peasant', 300);
    const flight = towers.catapult.projectile.flightSec;
    const predicted = predictPosition(state, peasant, flight);
    runFor(state, flight);
    expect(Math.hypot(peasant.x - predicted.x, peasant.y - predicted.y)).toBeLessThan(1);
  });
});

describe('wizard slow', () => {
  it('slows by 40% for 1.5 s', () => {
    const state = playing();
    const peasant = spawnEnemy(state, 'peasant');
    applySlow(peasant, 0.4, 1.5);
    expect(enemySpeed(peasant)).toBeCloseTo(enemies.peasant.speed * 0.6);
    runFor(state, 1.6);
    expect(peasant.slowTimer).toBe(0);
    expect(enemySpeed(peasant)).toBe(enemies.peasant.speed);
  });

  it('refreshes rather than stacks', () => {
    const state = playing();
    const peasant = spawnEnemy(state, 'peasant');
    applySlow(peasant, 0.4, 1.5);
    runFor(state, 1);
    applySlow(peasant, 0.4, 1.5);
    expect(peasant.slowTimer).toBeCloseTo(1.5);
    expect(enemySpeed(peasant)).toBeCloseTo(enemies.peasant.speed * 0.6);
    applySlow(peasant, 0.4, 1.5);
    applySlow(peasant, 0.4, 1.5);
    expect(peasant.slowTimer).toBeCloseTo(1.5);
    expect(enemySpeed(peasant)).toBeCloseTo(enemies.peasant.speed * 0.6);
  });

  it('bards enrage 30% faster below half HP, and the slow still applies on top', () => {
    const state = playing();
    const bard = spawnEnemy(state, 'bard');
    expect(enemySpeed(bard)).toBe(enemies.bard.speed);
    bard.hp = bard.maxHp * 0.49;
    expect(enemySpeed(bard)).toBeCloseTo(enemies.bard.speed * 1.3);
    applySlow(bard, 0.4, 1.5);
    expect(enemySpeed(bard)).toBeCloseTo(enemies.bard.speed * 1.3 * 0.6);
  });
});

describe('targeting', () => {
  it('picks the enemy furthest along the road ("first")', () => {
    const state = playing();
    const behind = enemyAt(state, 'peasant', 200);
    const ahead = enemyAt(state, 'peasant', 230);
    const x = (behind.x + ahead.x) / 2;
    const y = (behind.y + ahead.y) / 2;
    expect(selectTarget(state.enemies, x, y, 150, 0)).toBe(ahead);
  });

  it('ignores enemies out of range and dead ones', () => {
    const state = playing();
    const a = enemyAt(state, 'peasant', 200);
    enemyAt(state, 'peasant', 600); // far down the road
    expect(selectTarget(state.enemies, a.x, a.y, 50, 0)).toBe(a);
    a.hp = 0;
    expect(selectTarget(state.enemies, a.x, a.y, 50, 0)).toBeNull();
  });

  it('the catapult cannot hit within its 60 px minimum range', () => {
    const state = playing();
    const close = enemyAt(state, 'peasant', 300);
    const far = enemyAt(state, 'peasant', 150);
    const tx = close.x + 30;
    const ty = close.y;
    const def = towers.catapult;
    const farD = Math.hypot(far.x - tx, far.y - ty);
    const picked = selectTarget(state.enemies, tx, ty, def.range, def.minRange);
    expect(farD).toBeGreaterThan(def.minRange);
    expect(picked).toBe(farD <= def.range ? far : null);
    expect(picked).not.toBe(close);
  });

  it('towers shoot what they target and kill it', () => {
    const state = playing();
    const archer = buildTower(state, 2, 'archer')!;
    const peasant = spawnEnemy(state, 'peasant');
    const gold = state.gold;
    runFor(state, 60);
    expect(peasant.hp).toBeLessThanOrEqual(0);
    expect(state.gold).toBe(gold + enemies.peasant.bounty);
    expect(archer.firedAt).toBeGreaterThan(0);
  });
});
