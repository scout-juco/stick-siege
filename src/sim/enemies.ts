import { BOSS_ENTRY_LINE } from '../data/copy';
import { enemyDef } from '../data/enemies';
import { BOSS_LINE_SEC, LANE_SPREAD, WALK_PHASE_PER_PX } from './constants';
import { releaseBlocker } from './combat';
import { offsetPointAt, type PathPose } from './path';
import { nextRange } from './rng';
import { newId } from './state';
import type { Enemy, EnemyKind, GameState } from './types';
import { compact } from './util';

/** |cos(heading)| needed before a figure turns around. */
const FACING_HYSTERESIS = 0.2;

const scratch: PathPose = { x: 0, y: 0, angle: 0 };

export function spawnEnemy(state: GameState, kind: EnemyKind): Enemy {
  const def = enemyDef(kind);
  const lane = def.blockable ? nextRange(state.rng, -LANE_SPREAD, LANE_SPREAD) : 0;
  const pose = offsetPointAt(state.path, 0, lane, scratch);
  const enemy: Enemy = {
    id: newId(state),
    kind,
    hp: def.hp,
    maxHp: def.hp,
    dist: 0,
    laneOffset: lane,
    x: pose.x,
    y: pose.y,
    prevX: pose.x,
    prevY: pose.y,
    heading: pose.angle,
    facing: 1,
    walkPhase: nextRange(state.rng, 0, Math.PI * 2),
    slowTimer: 0,
    slowFactor: 0,
    blockerId: null,
    blocked: false,
  };
  state.enemies.push(enemy);
  if (kind === 'reginald') state.bossLine = { text: BOSS_ENTRY_LINE, until: state.time + BOSS_LINE_SEC };
  return enemy;
}

/** Current walking speed: base, ×enrage below the HP threshold, ×(1 − slow) while slowed. */
export function enemySpeed(enemy: Enemy): number {
  const def = enemyDef(enemy.kind);
  let v: number = def.speed;
  if (def.enrage && enemy.hp < enemy.maxHp * def.enrage.belowHpFraction) v *= def.enrage.speedMultiplier;
  if (enemy.slowTimer > 0) v *= 1 - enemy.slowFactor;
  return v;
}

export function isEnraged(enemy: Enemy): boolean {
  const def = enemyDef(enemy.kind);
  return def.enrage !== null && enemy.hp < enemy.maxHp * def.enrage.belowHpFraction;
}

/** Applies a slow. Repeat hits refresh the duration; they never stack the factor. */
export function applySlow(enemy: Enemy, factor: number, durationSec: number): void {
  enemy.slowFactor = Math.max(enemy.slowTimer > 0 ? enemy.slowFactor : 0, factor);
  enemy.slowTimer = Math.max(enemy.slowTimer, durationSec);
}

export function placeOnPath(state: GameState, enemy: Enemy): void {
  const pose = offsetPointAt(state.path, enemy.dist, enemy.laneOffset, scratch);
  enemy.x = pose.x;
  enemy.y = pose.y;
  enemy.heading = pose.angle;
  const dx = Math.cos(pose.angle);
  if (dx > FACING_HYSTERESIS) enemy.facing = 1;
  else if (dx < -FACING_HYSTERESIS) enemy.facing = -1;
}

/** Moves every living enemy along the road and handles leaks at the gate. */
export function updateEnemies(state: GameState, dt: number): void {
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy.slowTimer > 0) {
      enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
      if (enemy.slowTimer === 0) enemy.slowFactor = 0;
    }
    if (enemy.blocked) continue;
    const v = enemySpeed(enemy);
    enemy.dist += v * dt;
    enemy.walkPhase += (v * dt * WALK_PHASE_PER_PX) / enemyDef(enemy.kind).scale;
    placeOnPath(state, enemy);
    if (enemy.dist >= state.path.length) leak(state, enemy);
  }
}

/** An enemy reached the gate: lose lives, no bounty. */
export function leak(state: GameState, enemy: Enemy): void {
  state.lives = Math.max(0, state.lives - enemyDef(enemy.kind).leakCost);
  state.stats.leaks += 1;
  releaseBlocker(state, enemy);
  enemy.hp = 0;
  if (state.lives <= 0 && state.phase === 'playing') {
    state.phase = 'lost';
    state.endedAt = state.time;
  }
}

/** Sweeps killed and leaked enemies out of the list. */
export function removeDeadEnemies(state: GameState): void {
  compact(state.enemies, (e) => e.hp > 0);
}
