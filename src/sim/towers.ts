import { enemyDef } from '../data/enemies';
import { towers, type RangedTowerDef } from '../data/towers';
import { enemySpeed } from './enemies';
import { spawnKnights } from './knights';
import { closestPoint, offsetPointAt } from './path';
import { newId } from './state';
import type { Enemy, GameState, Tower, TowerKind } from './types';

/** Height of an enemy's body centre above its feet at scale 1 (where shots aim). */
const BODY_HEIGHT = 12;

export function canAfford(state: GameState, kind: TowerKind): boolean {
  return state.gold >= towers[kind].cost;
}

export function isSlotFree(state: GameState, slot: number): boolean {
  return slot >= 0 && slot < state.slots.length && !state.towers.some((t) => t.slot === slot);
}

export function canBuild(state: GameState, slot: number, kind: TowerKind): boolean {
  return (state.phase === 'ready' || state.phase === 'playing') && isSlotFree(state, slot) && canAfford(state, kind);
}

/** Builds a tower if the slot is free and the player can afford it. Returns the tower, or null. */
export function buildTower(state: GameState, slot: number, kind: TowerKind): Tower | null {
  if (!canBuild(state, slot, kind)) return null;
  const pos = state.slots[slot]!;
  state.gold -= towers[kind].cost;
  const tower: Tower = {
    id: newId(state),
    kind,
    slot,
    x: pos.x,
    y: pos.y,
    cooldown: 0,
    aim: 0,
    firedAt: -1e9,
    rallyX: 0,
    rallyY: 0,
  };
  state.towers.push(tower);
  if (kind === 'barracks') {
    const rally = closestPoint(state.path, pos.x, pos.y);
    tower.rallyX = rally.x;
    tower.rallyY = rally.y;
    spawnKnights(state, tower, rally.dist);
  }
  return tower;
}

/** "First" targeting: the living enemy furthest along the road within [minRange, range]. */
export function selectTarget(
  enemies: readonly Enemy[],
  x: number,
  y: number,
  range: number,
  minRange: number,
): Enemy | null {
  let best: Enemy | null = null;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d > range || d < minRange) continue;
    if (!best || e.dist > best.dist) best = e;
  }
  return best;
}

export function aimPoint(enemy: Enemy): { x: number; y: number } {
  return { x: enemy.x, y: enemy.y - BODY_HEIGHT * enemyDef(enemy.kind).scale };
}

/** Where an enemy will be after `seconds` at its current speed (standing still if blocked). */
export function predictPosition(state: GameState, enemy: Enemy, seconds: number): { x: number; y: number } {
  const ahead = enemy.blocked ? 0 : enemySpeed(enemy) * seconds;
  const p = offsetPointAt(state.path, Math.min(state.path.length, enemy.dist + ahead), enemy.laneOffset);
  return { x: p.x, y: p.y };
}

function fire(state: GameState, tower: Tower, def: RangedTowerDef, target: Enemy): void {
  const mx = tower.x;
  const my = tower.y - def.muzzleHeight;
  tower.firedAt = state.time;
  const shot = def.projectile;
  if (shot.kind === 'boulder') {
    const land = predictPosition(state, target, shot.flightSec);
    tower.aim = Math.atan2(land.y - tower.y, land.x - tower.x);
    state.projectiles.push({
      id: newId(state),
      kind: 'boulder',
      x: tower.x,
      y: tower.y,
      prevX: tower.x,
      prevY: tower.y,
      damage: def.damage,
      damageType: def.damageType,
      fromX: tower.x,
      fromY: tower.y,
      toX: land.x,
      toY: land.y,
      t: 0,
      duration: shot.flightSec,
      arcHeight: shot.arcHeight,
      splashRadius: shot.splashRadius,
      splashEdgeFactor: shot.splashEdgeFactor,
      launchHeight: def.muzzleHeight,
      height: def.muzzleHeight,
      prevHeight: def.muzzleHeight,
    });
    return;
  }
  const aim = aimPoint(target);
  tower.aim = Math.atan2(aim.y - my, aim.x - mx);
  state.projectiles.push({
    id: newId(state),
    kind: shot.kind,
    x: mx,
    y: my,
    prevX: mx,
    prevY: my,
    damage: def.damage,
    damageType: def.damageType,
    targetId: target.id,
    aimX: aim.x,
    aimY: aim.y,
    speed: shot.speed,
    slowFactor: def.slow?.factor ?? 0,
    slowSec: def.slow?.durationSec ?? 0,
  });
}

/** Ranged towers reload, pick the first enemy in range, and shoot. Barracks act through their knights. */
export function updateTowers(state: GameState, dt: number): void {
  for (const tower of state.towers) {
    const def = towers[tower.kind];
    if (def.kind === 'barracks') continue;
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;
    const target = selectTarget(state.enemies, tower.x, tower.y, def.range, def.minRange);
    if (!target) {
      tower.cooldown = 0; // ready the moment something walks into range
      continue;
    }
    fire(state, tower, def, target);
    tower.cooldown += 1 / def.rate;
  }
}
