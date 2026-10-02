import { DEATH_QUIPS, KNIGHT_QUIPS } from '../data/copy';
import { enemyDef } from '../data/enemies';
import { DEATH } from './constants';
import { chance, nextInt } from './rng';
import { newId } from './state';
import type { CorpseKind, DamageType, Enemy, GameState } from './types';

/** Armor reduces physical damage only: dmg × (1 − armor). */
export function mitigate(amount: number, type: DamageType, armor: number): number {
  return type === 'physical' ? amount * (1 - armor) : amount;
}

/** Splash multiplier: 1 at the centre, falling linearly to `edgeFactor` at the radius, 0 beyond. */
export function splashFactor(distance: number, radius: number, edgeFactor: number): number {
  if (distance > radius) return 0;
  return 1 - (1 - edgeFactor) * (distance / radius);
}

/** Applies damage after armor. Returns true if this hit killed the enemy. */
export function damageEnemy(state: GameState, enemy: Enemy, amount: number, type: DamageType): boolean {
  if (enemy.hp <= 0) return false;
  enemy.hp -= mitigate(amount, type, enemyDef(enemy.kind).armor);
  if (enemy.hp <= 0) {
    killEnemy(state, enemy);
    return true;
  }
  return false;
}

/** Pays the bounty and leaves a comedic corpse. The enemy is swept from the list at the end of the step. */
export function killEnemy(state: GameState, enemy: Enemy): void {
  const def = enemyDef(enemy.kind);
  enemy.hp = 0;
  state.gold += def.bounty;
  state.stats.goldEarned += def.bounty;
  state.stats.kills += 1;
  releaseBlocker(state, enemy);
  addCorpse(state, enemy.kind, enemy.x, enemy.y, enemy.facing, false);
}

/** Frees the knight that was holding this enemy. */
export function releaseBlocker(state: GameState, enemy: Enemy): void {
  if (enemy.blockerId === null) return;
  const knight = state.knights.find((k) => k.id === enemy.blockerId);
  if (knight && knight.targetId === enemy.id) knight.targetId = null;
  enemy.blockerId = null;
  enemy.blocked = false;
}

export function addCorpse(
  state: GameState,
  kind: CorpseKind,
  x: number,
  y: number,
  facing: 1 | -1,
  squashed: boolean,
): void {
  let quip: string | null = null;
  if (chance(state.rng, DEATH.quipChance)) {
    const talking = state.corpses.filter((c) => c.quip !== null).length;
    if (talking < DEATH.maxQuips) {
      const pool = kind === 'knight' ? KNIGHT_QUIPS : DEATH_QUIPS;
      quip = pool[nextInt(state.rng, pool.length)]!;
    }
  }
  state.corpses.push({ id: newId(state), kind, x, y, facing, t: 0, quip, squashed });
}
