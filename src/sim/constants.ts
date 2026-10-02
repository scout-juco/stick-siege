/** Simulation-wide constants. Balance numbers live in src/data; these are engine-level. */
export const LOGICAL_WIDTH = 960;
export const LOGICAL_HEIGHT = 540;

export const SIM_HZ = 60;
export const SIM_DT = 1 / SIM_HZ;
/** Long frames (tab switches, breakpoints) are clamped so the sim never tries to catch up minutes at once. */
export const MAX_FRAME_SEC = 0.25;

/** Speeds offered by the 1×/2× toggle. The debug hook may set others. */
export const SPEED_OPTIONS = [1, 2] as const;

/** Walk-cycle phase advanced per logical px travelled (radians), before dividing by figure scale. */
export const WALK_PHASE_PER_PX = 0.16;

/** Comedic death timeline (seconds). */
export const DEATH = {
  tipSec: 0.25,
  bounceSec: 0.22,
  holdSec: 0.35,
  quipHoldSec: 1.3,
  fadeSec: 0.6,
  quipChance: 0.25,
  /** Quip bubbles on screen at once; extra deaths stay quiet so big waves stay readable. */
  maxQuips: 2,
} as const;

/** Enemies walk up to this far either side of the road centreline (bosses walk the middle). */
export const LANE_SPREAD = 7;

/** Floating-point slack for "has this timer reached its mark" checks. */
export const TIME_EPSILON = 1e-9;

/** How long the boss's entry line stays on screen (sim seconds, so 3 s of real time at 2×). */
export const BOSS_LINE_SEC = 6;
