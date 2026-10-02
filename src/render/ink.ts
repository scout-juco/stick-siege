import { INK_JITTER, PALETTE } from '../data/art';
import { createRng, nextRange } from '../sim/rng';

/**
 * Boiling-line ink. Every stroke vertex gets a small offset from a precomputed jitter table;
 * the active table switches every INK_JITTER.intervalMs, cycling through a few variants.
 * Static art is rendered once per variant (see map.ts); dynamic art jitters through the same tables.
 */

const TABLE_SIZE = 1024; // power of two

const tables: Float32Array[] = [];
for (let v = 0; v < INK_JITTER.variants; v++) {
  const rng = createRng(0xb011 + v * 7717);
  const t = new Float32Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) t[i] = nextRange(rng, -1, 1) * INK_JITTER.amplitude;
  tables.push(t);
}

let table = tables[0]!;
let variant = 0;

export function inkVariantForTime(ms: number): number {
  return Math.floor(ms / INK_JITTER.intervalMs) % INK_JITTER.variants;
}

export function setInkVariant(v: number): void {
  variant = v % INK_JITTER.variants;
  table = tables[variant]!;
}

export function currentInkVariant(): number {
  return variant;
}

/** Jitter for vertex component `i` of a stroke identified by `seed`. */
export function jitter(seed: number, i: number): number {
  return table[((seed | 0) * 97 + i * 13) & (TABLE_SIZE - 1)]!;
}

/** Adds a wobbly straight line to the current path. */
export function inkLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, seed: number): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(1, Math.ceil(len / INK_JITTER.subdivideEvery));
  ctx.moveTo(x1 + jitter(seed, 0), y1 + jitter(seed, 1));
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    ctx.lineTo(x1 + (x2 - x1) * t + jitter(seed, 2 * k), y1 + (y2 - y1) * t + jitter(seed, 2 * k + 1));
  }
}

/** Adds a wobbly polyline (flat [x0, y0, x1, y1, ...]) to the current path. */
export function inkPolyline(ctx: CanvasRenderingContext2D, pts: ArrayLike<number>, seed: number, closed = false): void {
  const count = pts.length >> 1;
  if (count < 2) return;
  let j = 0;
  const x0 = pts[0]!;
  const y0 = pts[1]!;
  ctx.moveTo(x0 + jitter(seed, j++), y0 + jitter(seed, j++));
  const segs = closed ? count : count - 1;
  for (let s = 0; s < segs; s++) {
    const ax = pts[2 * s]!;
    const ay = pts[2 * s + 1]!;
    const bi = (s + 1) % count;
    const bx = pts[2 * bi]!;
    const by = pts[2 * bi + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / INK_JITTER.subdivideEvery));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      // Close exactly on the starting vertex so closed shapes don't leave a gap.
      if (closed && bi === 0 && k === n) {
        ctx.closePath();
        break;
      }
      ctx.lineTo(ax + (bx - ax) * t + jitter(seed, j++), ay + (by - ay) * t + jitter(seed, j++));
    }
  }
}

/** Adds a wobbly circle to the current path. */
export function inkCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number): void {
  const n = Math.max(8, Math.min(32, Math.ceil(r * 0.9) + 6));
  const start = (seed % 7) * 0.9;
  for (let k = 0; k < n; k++) {
    const a = start + (k / n) * Math.PI * 2;
    const rr = r + jitter(seed, k);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Adds a wobbly arc (open) to the current path. */
export function inkArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  seed: number,
): void {
  const n = Math.max(4, Math.ceil((Math.abs(a1 - a0) * r) / 6));
  for (let k = 0; k <= n; k++) {
    const a = a0 + ((a1 - a0) * k) / n;
    const rr = r + jitter(seed, k);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

/** Adds dashes along a polyline (flat coords) to the current path. */
export function inkDashed(
  ctx: CanvasRenderingContext2D,
  pts: ArrayLike<number>,
  dash: number,
  gap: number,
  seed: number,
): void {
  const count = pts.length >> 1;
  let drawing = true;
  let left = dash;
  let j = 0;
  let px = pts[0]!;
  let py = pts[1]!;
  ctx.moveTo(px + jitter(seed, j++), py + jitter(seed, j++));
  for (let i = 1; i < count; i++) {
    const tx = pts[2 * i]!;
    const ty = pts[2 * i + 1]!;
    let segLen = Math.hypot(tx - px, ty - py);
    while (segLen > 0) {
      const stepLen = Math.min(left, segLen);
      const t = stepLen / segLen;
      px += (tx - px) * t;
      py += (ty - py) * t;
      segLen -= stepLen;
      left -= stepLen;
      if (left <= 1e-6) {
        if (drawing) ctx.lineTo(px + jitter(seed, j++), py + jitter(seed, j++));
        else ctx.moveTo(px + jitter(seed, j++), py + jitter(seed, j++));
        drawing = !drawing;
        left = drawing ? dash : gap;
      }
    }
  }
  if (drawing) ctx.lineTo(px, py);
}

/** Adds a dashed wobbly circle to the current path. */
export function inkDashedCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  dashes: number,
  seed: number,
): void {
  const step = (Math.PI * 2) / dashes;
  const on = step * 0.6;
  for (let k = 0; k < dashes; k++) {
    const a0 = k * step;
    const a1 = a0 + on;
    const am = (a0 + a1) / 2;
    ctx.moveTo(cx + Math.cos(a0) * (r + jitter(seed, 3 * k)), cy + Math.sin(a0) * (r + jitter(seed, 3 * k)));
    ctx.lineTo(cx + Math.cos(am) * (r + jitter(seed, 3 * k + 1)), cy + Math.sin(am) * (r + jitter(seed, 3 * k + 1)));
    ctx.lineTo(cx + Math.cos(a1) * (r + jitter(seed, 3 * k + 2)), cy + Math.sin(a1) * (r + jitter(seed, 3 * k + 2)));
  }
}

/** Adds a wobbly rounded rectangle to the current path. */
export function inkRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  seed: number,
): void {
  const pts: number[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let k = 0; k <= 2; k++) {
      const a = a0 + (k / 2) * (Math.PI / 2);
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  inkPolyline(ctx, pts, seed, true);
}

/** Strokes the current path as ink. */
export function strokeInk(ctx: CanvasRenderingContext2D, width: number, color: string = PALETTE.ink): void {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
