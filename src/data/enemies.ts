import type { EnemyKind } from '../sim/types';
import { ENEMY_NAMES } from './copy';

/** Enemy stats from docs/game-design.md. Speed in logical px/s; armor reduces physical damage only. */
export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number;
  armor: number;
  bounty: number;
  /** Lives lost when it reaches the gate. */
  leakCost: number;
  /** Render scale of the stick-figure rig (also scales contact size). */
  scale: number;
  /** Body radius for splash hits and melee contact. */
  radius: number;
  /** Damage per second dealt to the knight blocking it. */
  meleeDps: number;
  /** Speeds up below a fraction of max HP. */
  enrage: { belowHpFraction: number; speedMultiplier: number } | null;
  /** Bosses ignore blocking and flatten knights they walk through. */
  blockable: boolean;
  trampleDamage: number;
}

export const enemies = {
  peasant: {
    kind: 'peasant',
    name: ENEMY_NAMES.peasant,
    hp: 30,
    speed: 45,
    armor: 0,
    bounty: 5,
    leakCost: 1,
    scale: 1,
    radius: 8,
    meleeDps: 4,
    enrage: null,
    blockable: true,
    trampleDamage: 0,
  },
  squire: {
    kind: 'squire',
    name: ENEMY_NAMES.squire,
    hp: 22,
    speed: 85,
    armor: 0,
    bounty: 6,
    leakCost: 1,
    scale: 1,
    radius: 8,
    meleeDps: 3,
    enrage: null,
    blockable: true,
    trampleDamage: 0,
  },
  tinCan: {
    kind: 'tinCan',
    name: ENEMY_NAMES.tinCan,
    hp: 90,
    speed: 32,
    armor: 0.5,
    bounty: 12,
    leakCost: 1,
    scale: 1,
    radius: 9,
    meleeDps: 6,
    enrage: null,
    blockable: true,
    trampleDamage: 0,
  },
  bard: {
    kind: 'bard',
    name: ENEMY_NAMES.bard,
    hp: 140,
    speed: 38,
    armor: 0,
    bounty: 16,
    leakCost: 1,
    scale: 1.1,
    radius: 9,
    meleeDps: 7,
    enrage: { belowHpFraction: 0.5, speedMultiplier: 1.3 },
    blockable: true,
    trampleDamage: 0,
  },
  reginald: {
    kind: 'reginald',
    name: ENEMY_NAMES.reginald,
    hp: 2400,
    speed: 20,
    armor: 0.25,
    bounty: 250,
    leakCost: 20,
    scale: 3,
    radius: 22,
    meleeDps: 0,
    enrage: null,
    blockable: false,
    trampleDamage: 60,
  },
} as const satisfies Record<EnemyKind, EnemyDef>;

export function enemyDef(kind: EnemyKind): EnemyDef {
  return enemies[kind];
}
