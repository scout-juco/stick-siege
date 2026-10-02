import type { Rng } from './rng';

export interface Vec {
  x: number;
  y: number;
}

export type EnemyKind = 'peasant' | 'squire' | 'tinCan' | 'bard' | 'reginald';
export type TowerKind = 'archer' | 'catapult' | 'wizard' | 'barracks';
export type DamageType = 'physical' | 'magic';
export type Phase = 'ready' | 'playing' | 'won' | 'lost';

/** Sampled polyline with cumulative arc length, for distance-along-path queries. */
export interface Path {
  xs: Float64Array;
  ys: Float64Array;
  /** cumulative[i] = arc length from the start to point i. */
  cumulative: Float64Array;
  length: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  /** Distance travelled along the path centreline. */
  dist: number;
  /** Perpendicular offset from the centreline so crowds don't walk single file. */
  laneOffset: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  /** Path tangent angle at the enemy's position (radians). */
  heading: number;
  /** Which way the figure faces; only flips when the road clearly turns (no flicker on vertical stretches). */
  facing: 1 | -1;
  walkPhase: number;
  /** Seconds of slow remaining; refreshed (not stacked) by each hit. */
  slowTimer: number;
  slowFactor: number;
  /** Knight assigned to this enemy, if any. */
  blockerId: number | null;
  /** True while in melee contact with its knight (stands still). */
  blocked: boolean;
}

export type CorpseKind = EnemyKind | 'knight';

/** A figure doing its comedic death: tip, bounce, optional quip, fade. */
export interface Corpse {
  id: number;
  kind: CorpseKind;
  x: number;
  y: number;
  facing: 1 | -1;
  t: number;
  quip: string | null;
  /** Knights flattened by the boss squash instead of tipping. */
  squashed: boolean;
}

export interface Tower {
  id: number;
  kind: TowerKind;
  slot: number;
  x: number;
  y: number;
  cooldown: number;
  /** Angle towards the most recent target, for aiming art. */
  aim: number;
  /** Sim time of the last shot (−Infinity if never), for firing animations. */
  firedAt: number;
  /** Barracks only: where its knights stand guard. */
  rallyX: number;
  rallyY: number;
}

export interface Knight {
  id: number;
  towerId: number;
  /** Formation slot 0..n-1. */
  index: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  targetId: number | null;
  attackCooldown: number;
  walkPhase: number;
  facing: 1 | -1;
  /** Facing while standing guard: towards the enemies coming down the road. */
  guardFacing: 1 | -1;
  /** Sim time of the last swing, for the 2-frame bonk. */
  swungAt: number;
}

interface ProjectileBase {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  damage: number;
  damageType: DamageType;
}

/** Arrows and bolts fly straight at their target, re-aiming every step. */
export interface HomingProjectile extends ProjectileBase {
  kind: 'arrow' | 'bolt';
  targetId: number;
  /** Last known target position, used if the target dies mid-flight. */
  aimX: number;
  aimY: number;
  speed: number;
  /** Fraction of speed removed, and duration, applied on hit (0 = none). */
  slowFactor: number;
  slowSec: number;
}

/** Boulders follow a fixed arc to a predicted landing point and splash. */
export interface LobbedProjectile extends ProjectileBase {
  kind: 'boulder';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  duration: number;
  arcHeight: number;
  splashRadius: number;
  splashEdgeFactor: number;
  /** Height above the ground at launch (the muzzle). */
  launchHeight: number;
  /** Current height above the ground, for drawing; x/y track the ground point. */
  height: number;
  prevHeight: number;
}

export type Projectile = HomingProjectile | LobbedProjectile;

export interface Impact {
  x: number;
  y: number;
  radius: number;
  /** Sim time of the landing. */
  at: number;
}

/** A spawn group of the current wave, running in parallel with the others. */
export interface SpawnGroup {
  enemy: EnemyKind;
  remaining: number;
  spacingSec: number;
  /** Wave-relative time of the next spawn. */
  nextAt: number;
}

export interface GameState {
  seed: number;
  rng: Rng;
  /** Sim seconds since the game was created (only advances while playing). */
  time: number;
  phase: Phase;
  paused: boolean;
  speed: number;
  gold: number;
  lives: number;
  /** Number of waves started so far (0 before the first). */
  waveNumber: number;
  /** Sim time the current wave started. */
  waveStartedAt: number;
  /** Groups still spawning for the current wave. */
  spawning: SpawnGroup[];
  /** Seconds until the next wave auto-starts, or null when no countdown is running. */
  countdown: number | null;
  path: Path;
  /** Build slot centres for this map. */
  slots: readonly Vec[];
  enemies: Enemy[];
  towers: Tower[];
  knights: Knight[];
  projectiles: Projectile[];
  corpses: Corpse[];
  /** Boulder landings, kept briefly so the renderer can draw a thud ring. */
  impacts: Impact[];
  /** Shown above the boss on entry. */
  bossLine: { text: string; until: number } | null;
  /** Sim time the game ended (won/lost), for end-screen animation. */
  endedAt: number;
  nextId: number;
  stats: { kills: number; leaks: number; goldEarned: number; earlyBonus: number };
}
