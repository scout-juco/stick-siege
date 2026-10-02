import { damageEnemy, splashFactor } from './combat';
import { applySlow } from './enemies';
import { aimPoint } from './towers';
import type { GameState, HomingProjectile, LobbedProjectile } from './types';
import { compact } from './util';

/** How long a boulder's thud ring lingers (seconds). */
export const IMPACT_SEC = 0.35;

/** Returns false when the projectile is finished. */
function updateHoming(state: GameState, p: HomingProjectile, dt: number): boolean {
  const target = state.enemies.find((e) => e.id === p.targetId && e.hp > 0);
  if (target) {
    const aim = aimPoint(target);
    p.aimX = aim.x;
    p.aimY = aim.y;
  }
  const dx = p.aimX - p.x;
  const dy = p.aimY - p.y;
  const dist = Math.hypot(dx, dy);
  const stepLen = p.speed * dt;
  if (dist <= stepLen) {
    p.x = p.aimX;
    p.y = p.aimY;
    // A target that died mid-flight means the shot just thunks into the dirt.
    if (target) {
      damageEnemy(state, target, p.damage, p.damageType);
      if (p.slowFactor > 0) applySlow(target, p.slowFactor, p.slowSec);
    }
    return false;
  }
  p.x += (dx / dist) * stepLen;
  p.y += (dy / dist) * stepLen;
  return true;
}

/** Splash damage to every living enemy around a landing point, with linear falloff. */
export function splash(
  state: GameState,
  x: number,
  y: number,
  radius: number,
  edgeFactor: number,
  damage: number,
  type: LobbedProjectile['damageType'],
): void {
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const k = splashFactor(Math.hypot(e.x - x, e.y - y), radius, edgeFactor);
    if (k > 0) damageEnemy(state, e, damage * k, type);
  }
}

function updateLobbed(state: GameState, p: LobbedProjectile, dt: number): boolean {
  p.t += dt;
  const u = Math.min(1, p.t / p.duration);
  p.x = p.fromX + (p.toX - p.fromX) * u;
  p.y = p.fromY + (p.toY - p.fromY) * u;
  // Parabola from the muzzle height down to the ground, bulging up by arcHeight.
  p.height = (1 - u) * p.launchHeight + 4 * p.arcHeight * u * (1 - u);
  if (u < 1) return true;
  p.height = 0;
  splash(state, p.toX, p.toY, p.splashRadius, p.splashEdgeFactor, p.damage, p.damageType);
  state.impacts.push({ x: p.toX, y: p.toY, radius: p.splashRadius, at: state.time });
  return false;
}

export function updateProjectiles(state: GameState, dt: number): void {
  compact(state.projectiles, (p) => (p.kind === 'boulder' ? updateLobbed(state, p, dt) : updateHoming(state, p, dt)));
  compact(state.impacts, (i) => state.time - i.at < IMPACT_SEC);
}
