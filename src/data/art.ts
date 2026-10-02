/** Art direction constants: parchment-and-ink palette, line weights, boiling-line jitter, fonts. */
export const PALETTE = {
  parchment: '#EAD9B0',
  parchmentShade: '#C9AE78',
  dirt: '#D1B47E',
  dirtDark: '#B89A64',
  ink: '#1B1410',
  inkFaint: 'rgba(27, 20, 16, 0.35)',
  inkGhost: 'rgba(27, 20, 16, 0.12)',
  blood: '#9E1B1B',
  gold: '#C9A227',
  goldLight: '#E7C95A',
  slow: '#3E5E8C',
  letterbox: '#1E1712',
  overlay: 'rgba(30, 23, 18, 0.55)',
  panel: '#EFE2BF',
  disabled: 'rgba(27, 20, 16, 0.3)',
} as const;

/** Stroke widths in logical px. */
export const LINE = {
  figure: 2.5,
  boss: 3,
  outline: 3,
  detail: 1.5,
} as const;

/** Every ink stroke wobbles per vertex; offsets re-seed on this interval and cycle through a few cached variants. */
export const INK_JITTER = {
  amplitude: 0.6,
  intervalMs: 120,
  variants: 3,
  /** Long lines are subdivided so the wobble reads along their length. */
  subdivideEvery: 14,
} as const;

/** Stick-figure bone lengths at scale 1 (logical px). Feet sit at the origin. */
export const RIG = {
  thigh: 6,
  shin: 6,
  torso: 9,
  neck: 1.2,
  head: 4,
  upperArm: 4.6,
  forearm: 4.4,
  /** Hip drop at full stride, |sin(phase)|-shaped. */
  bob: 1.2,
} as const;

/** Per-type gait and posture (radians). `elbow` bends the forearm forward. */
export const FIGURE_STYLE = {
  peasant: { lean: 0.08, stride: 0.55, armSwing: 0.5, elbow: 0.5 },
  squire: { lean: 0.45, stride: 0.8, armSwing: 1.0, elbow: 1.4 },
  tinCan: { lean: 0.02, stride: 0.38, armSwing: 0.28, elbow: 0.4 },
  bard: { lean: 0.12, stride: 0.5, armSwing: 0.45, elbow: 0.5 },
  reginald: { lean: -0.05, stride: 0.34, armSwing: 0.3, elbow: 0.6 },
  knight: { lean: 0.05, stride: 0.5, armSwing: 0.4, elbow: 0.6 },
} as const;

export const FONTS = {
  title: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  hand: '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive',
} as const;
