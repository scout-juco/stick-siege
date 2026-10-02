import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../sim/constants';

/** UI geometry in logical px (960×540). Shared by render (drawing) and input (hit-testing). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Interactive targets must be at least this big in logical px. */
export const MIN_TARGET = 44;

export const HUD = {
  height: 48,
  gold: { x: 14, y: 24 },
  lives: { x: 120, y: 24 },
  wave: { x: 214, y: 24 },
  callWave: { x: 604, y: 2, w: 236, h: 44 } satisfies Rect,
  speed: { x: 846, y: 2, w: 50, h: 44 } satisfies Rect,
  pause: { x: 902, y: 2, w: 50, h: 44 } satisfies Rect,
} as const;

export const SLOT_RADIUS = 24;

export const RADIAL = {
  /** Distance from slot centre to each option's centre. */
  radius: 64,
  /** Each option is a circle this big (diameter 52 ≥ MIN_TARGET). */
  optionRadius: 26,
  /** Keep options at least this far inside the screen / below the HUD. */
  margin: 4,
} as const;

export const BOSS_BAR = { x: 300, y: 58, w: 360, h: 14 } as const;

export const BANNER = { y: 92, w: 420, h: 58, slideSec: 0.45, holdSec: 2.2 } as const;

export const END_SCREEN = {
  panel: { x: 230, y: 110, w: 500, h: 320 } satisfies Rect,
  restart: { x: 390, y: 350, w: 180, h: 52 } satisfies Rect,
} as const;

export const PAUSE_SCREEN = {
  resume: { x: 390, y: 290, w: 180, h: 52 } satisfies Rect,
} as const;

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Hit box for a built tower (its body rises above the slot centre). */
export function towerHitRect(x: number, y: number): Rect {
  return { x: x - 24, y: y - 42, w: 48, h: 56 };
}

export interface RadialOption<K> {
  kind: K;
  x: number;
  y: number;
}

/** Diagonal angles for the four build options, clockwise from top-left. */
const RADIAL_ANGLES = [-0.75 * Math.PI, -0.25 * Math.PI, 0.25 * Math.PI, 0.75 * Math.PI] as const;

/** Space below each option for its cost label. */
const COST_LABEL_DROP = 16;

/**
 * Positions the build menu around a slot. The whole ring shifts inward if any option
 * (plus its cost label) would leave the screen or tuck under the HUD.
 */
export function radialLayout<K>(slotX: number, slotY: number, kinds: readonly K[]): { cx: number; cy: number; options: RadialOption<K>[] } {
  const reach = RADIAL.radius * Math.SQRT1_2 + RADIAL.optionRadius + RADIAL.margin;
  const cx = Math.max(reach, Math.min(LOGICAL_WIDTH - reach, slotX));
  const cy = Math.max(HUD.height + reach, Math.min(LOGICAL_HEIGHT - reach - COST_LABEL_DROP, slotY));
  const options = kinds.map((kind, i) => {
    const a = RADIAL_ANGLES[i % RADIAL_ANGLES.length]!;
    return { kind, x: cx + Math.cos(a) * RADIAL.radius, y: cy + Math.sin(a) * RADIAL.radius };
  });
  return { cx, cy, options };
}
