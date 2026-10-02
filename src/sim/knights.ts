import { enemyDef } from '../data/enemies';
import { towers } from '../data/towers';
import { WALK_PHASE_PER_PX } from './constants';
import { addCorpse, damageEnemy } from './combat';
import { poseAt } from './path';
import { newId } from './state';
import type { Enemy, GameState, Knight, Tower } from './types';

/** Distance at which a walking knight counts as having arrived. */
const ARRIVE = 0.75;

/** Puts a barracks' knights on the field. They walk out of the barracks to their posts. */
export function spawnKnights(state: GameState, tower: Tower, rallyDist: number): void {
  const def = towers.barracks;
  const road = poseAt(state.path, rallyDist);
  const ax = Math.cos(road.angle);
  const ay = Math.sin(road.angle);
  const guardFacing: 1 | -1 = ax >= 0 ? -1 : 1;
  for (let i = 0; i < def.knight.count; i++) {
    const post = def.formation[i % def.formation.length]!;
    state.knights.push({
      id: newId(state),
      towerId: tower.id,
      index: i,
      x: tower.x,
      y: tower.y,
      prevX: tower.x,
      prevY: tower.y,
      homeX: tower.rallyX + ax * post.ahead + ay * post.side,
      homeY: tower.rallyY + ay * post.ahead - ax * post.side,
      hp: def.knight.hp,
      maxHp: def.knight.hp,
      alive: true,
      respawnTimer: 0,
      targetId: null,
      attackCooldown: 0,
      walkPhase: 0,
      facing: guardFacing,
      guardFacing,
      swungAt: -1e9,
    });
  }
}

/** Moves toward a point; returns the distance actually walked. */
function walkToward(k: Knight, x: number, y: number, maxStep: number): number {
  const dx = x - k.x;
  const dy = y - k.y;
  const d = Math.hypot(dx, dy);
  if (d <= ARRIVE) return 0;
  const stepLen = Math.min(d, maxStep);
  k.x += (dx / d) * stepLen;
  k.y += (dy / d) * stepLen;
  k.walkPhase += stepLen * WALK_PHASE_PER_PX;
  if (Math.abs(dx) > 0.5) k.facing = dx > 0 ? 1 : -1;
  return stepLen;
}

/** First-along-the-road blockable enemy near the rally point that no other knight has claimed. */
function findTarget(state: GameState, x: number, y: number, radius: number): Enemy | null {
  let best: Enemy | null = null;
  for (const e of state.enemies) {
    if (e.hp <= 0 || e.blockerId !== null || !enemyDef(e.kind).blockable) continue;
    if (Math.hypot(e.x - x, e.y - y) > radius) continue;
    if (!best || e.dist > best.dist) best = e;
  }
  return best;
}

function letGo(state: GameState, k: Knight): void {
  if (k.targetId === null) return;
  const e = state.enemies.find((en) => en.id === k.targetId);
  if (e && e.blockerId === k.id) {
    e.blockerId = null;
    e.blocked = false;
  }
  k.targetId = null;
}

export function killKnight(state: GameState, k: Knight, squashed: boolean): void {
  letGo(state, k);
  k.alive = false;
  k.hp = 0;
  k.respawnTimer = towers.barracks.knight.respawnSec;
  addCorpse(state, 'knight', k.x, k.y, k.facing, squashed);
}

function respawn(state: GameState, k: Knight): void {
  const tower = state.towers.find((t) => t.id === k.towerId);
  if (!tower) return;
  k.alive = true;
  k.hp = k.maxHp;
  k.x = k.prevX = tower.x;
  k.y = k.prevY = tower.y;
  k.attackCooldown = 0;
  k.targetId = null;
}

/** Bosses ignore blocking and flatten any knight they walk through. */
function trample(state: GameState): void {
  for (const e of state.enemies) {
    const def = enemyDef(e.kind);
    if (e.hp <= 0 || def.trampleDamage <= 0) continue;
    for (const k of state.knights) {
      if (!k.alive || Math.hypot(k.x - e.x, k.y - e.y) > def.radius + 6) continue;
      k.hp -= def.trampleDamage;
      if (k.hp <= 0) killKnight(state, k, true);
    }
  }
}

function fight(state: GameState, k: Knight, e: Enemy, dt: number): void {
  const kd = towers.barracks.knight;
  const reach = kd.contactRange;
  // Stand in the enemy's way: just ahead of it along the road.
  walkToward(k, e.x + Math.cos(e.heading) * reach, e.y + Math.sin(e.heading) * reach, kd.speed * dt);
  if (Math.hypot(e.x - k.x, e.y - k.y) > reach + 3) {
    e.blocked = false;
    return;
  }
  k.facing = e.x >= k.x ? 1 : -1;
  e.blocked = true;
  k.attackCooldown -= dt;
  if (k.attackCooldown <= 0) {
    k.attackCooldown += 1 / kd.rate;
    k.swungAt = state.time;
    if (damageEnemy(state, e, kd.damage, kd.damageType)) return;
  }
  k.hp -= enemyDef(e.kind).meleeDps * dt;
  if (k.hp <= 0) killKnight(state, k, false);
}

export function updateKnights(state: GameState, dt: number): void {
  const def = towers.barracks;
  trample(state);
  for (const k of state.knights) {
    if (!k.alive) {
      k.respawnTimer -= dt;
      if (k.respawnTimer <= 0) respawn(state, k);
      continue;
    }
    const tower = state.towers.find((t) => t.id === k.towerId);
    if (!tower) continue;

    let target = k.targetId === null ? null : (state.enemies.find((e) => e.id === k.targetId && e.hp > 0) ?? null);
    if (k.targetId !== null && (!target || Math.hypot(target.x - tower.rallyX, target.y - tower.rallyY) > def.leashRadius)) {
      letGo(state, k);
      target = null;
    }
    if (!target) {
      target = findTarget(state, tower.rallyX, tower.rallyY, def.engageRadius);
      if (target) {
        k.targetId = target.id;
        target.blockerId = k.id;
        k.attackCooldown = Math.max(0, k.attackCooldown);
      }
    }

    if (target) {
      fight(state, k, target, dt);
    } else {
      k.attackCooldown = Math.max(0, k.attackCooldown - dt);
      if (walkToward(k, k.homeX, k.homeY, def.knight.speed * dt) === 0) k.facing = k.guardFacing;
    }
  }
}
