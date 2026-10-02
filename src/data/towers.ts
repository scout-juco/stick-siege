import type { DamageType, TowerKind } from '../sim/types';

/** Tower stats from docs/game-design.md. Ranges in logical px, rate in attacks per second. */

export interface HomingShot {
  kind: 'arrow' | 'bolt';
  speed: number;
}

export interface LobbedShot {
  kind: 'boulder';
  /** Fixed flight time; the landing point is predicted this far ahead. */
  flightSec: number;
  arcHeight: number;
  splashRadius: number;
  /** Damage multiplier at the very edge of the splash (linear from 1 at the centre). */
  splashEdgeFactor: number;
}

export interface RangedTowerDef {
  kind: 'archer' | 'catapult' | 'wizard';
  name: string;
  cost: number;
  damage: number;
  damageType: DamageType;
  rate: number;
  range: number;
  /** Targets closer than this can't be hit. */
  minRange: number;
  /** Height above the slot centre that shots leave from. */
  muzzleHeight: number;
  projectile: HomingShot | LobbedShot;
  slow: { factor: number; durationSec: number } | null;
}

export interface BarracksTowerDef {
  kind: 'barracks';
  name: string;
  cost: number;
  /** The rally point (closest road point) must lie within this radius of the barracks. */
  rallyRadius: number;
  /** Knights engage enemies within this distance of the rally point. */
  engageRadius: number;
  /** A knight gives up on a target that gets this far from the rally point. */
  leashRadius: number;
  /** Guard posts around the rally point: `ahead` toward the castle along the road, `side` across it. */
  formation: readonly { ahead: number; side: number }[];
  knight: {
    count: number;
    hp: number;
    damage: number;
    damageType: DamageType;
    rate: number;
    respawnSec: number;
    speed: number;
    /** Melee reach between knight and enemy centres (scaled by the enemy's size). */
    contactRange: number;
  };
}

export type TowerDef = RangedTowerDef | BarracksTowerDef;

export const towers = {
  archer: {
    kind: 'archer',
    name: 'Archer Post',
    cost: 70,
    damage: 8,
    damageType: 'physical',
    rate: 1.6,
    range: 150,
    minRange: 0,
    muzzleHeight: 30,
    projectile: { kind: 'arrow', speed: 560 },
    slow: null,
  },
  catapult: {
    kind: 'catapult',
    name: 'Catapult',
    cost: 120,
    damage: 22,
    damageType: 'physical',
    rate: 0.35,
    range: 190,
    minRange: 60,
    muzzleHeight: 18,
    projectile: { kind: 'boulder', flightSec: 0.9, arcHeight: 70, splashRadius: 45, splashEdgeFactor: 0.5 },
    slow: null,
  },
  wizard: {
    kind: 'wizard',
    name: 'Wizard Hut',
    cost: 100,
    damage: 14,
    damageType: 'magic',
    rate: 0.8,
    range: 130,
    minRange: 0,
    muzzleHeight: 40,
    projectile: { kind: 'bolt', speed: 360 },
    slow: { factor: 0.4, durationSec: 1.5 },
  },
  barracks: {
    kind: 'barracks',
    name: 'Barracks',
    cost: 90,
    rallyRadius: 100,
    engageRadius: 52,
    leashRadius: 78,
    formation: [
      { ahead: 0, side: 0 },
      { ahead: 12, side: 10 },
      { ahead: 12, side: -10 },
    ],
    knight: {
      count: 3,
      hp: 60,
      damage: 6,
      damageType: 'physical',
      rate: 1.0,
      respawnSec: 8,
      speed: 70,
      contactRange: 13,
    },
  },
} as const satisfies Record<TowerKind, TowerDef>;

/** Radial-menu order. */
export const TOWER_ORDER = ['archer', 'catapult', 'wizard', 'barracks'] as const satisfies readonly TowerKind[];

export function towerDef(kind: TowerKind): TowerDef {
  return towers[kind];
}

/** Range shown on the selection ring. */
export function displayRange(kind: TowerKind): number {
  const def = towerDef(kind);
  return def.kind === 'barracks' ? def.rallyRadius : def.range;
}
