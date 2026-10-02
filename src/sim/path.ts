import type { Path, Vec } from './types';

/**
 * Samples a Catmull-Rom spline through the control points into a dense polyline,
 * then records cumulative arc length so positions can be looked up by distance.
 */
export function buildPath(control: readonly Vec[], samplesPerSegment = 16): Path {
  if (control.length < 2) throw new Error('path needs at least 2 control points');
  const xs: number[] = [];
  const ys: number[] = [];
  const at = (i: number): Vec => control[Math.max(0, Math.min(control.length - 1, i))]!;

  for (let i = 0; i < control.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      xs.push(
        0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      );
      ys.push(
        0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      );
    }
  }
  const last = at(control.length - 1);
  xs.push(last.x);
  ys.push(last.y);

  const cumulative = new Float64Array(xs.length);
  for (let i = 1; i < xs.length; i++) {
    cumulative[i] = cumulative[i - 1]! + Math.hypot(xs[i]! - xs[i - 1]!, ys[i]! - ys[i - 1]!);
  }
  return {
    xs: Float64Array.from(xs),
    ys: Float64Array.from(ys),
    cumulative,
    length: cumulative[cumulative.length - 1]!,
  };
}

/** Index i such that cumulative[i] <= dist < cumulative[i+1] (clamped). */
function segmentIndex(path: Path, dist: number): number {
  const c = path.cumulative;
  let lo = 0;
  let hi = c.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (c[mid]! <= dist) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export interface PathPose {
  x: number;
  y: number;
  /** Tangent angle in radians. */
  angle: number;
}

/** Position and tangent at a distance along the path (clamped to [0, length]). */
export function poseAt(path: Path, dist: number, out: PathPose = { x: 0, y: 0, angle: 0 }): PathPose {
  const d = Math.max(0, Math.min(path.length, dist));
  const i = segmentIndex(path, d);
  const x0 = path.xs[i]!;
  const y0 = path.ys[i]!;
  const x1 = path.xs[i + 1]!;
  const y1 = path.ys[i + 1]!;
  const segLen = path.cumulative[i + 1]! - path.cumulative[i]!;
  const t = segLen > 0 ? (d - path.cumulative[i]!) / segLen : 0;
  out.x = x0 + (x1 - x0) * t;
  out.y = y0 + (y1 - y0) * t;
  out.angle = Math.atan2(y1 - y0, x1 - x0);
  return out;
}

/** Position at a distance along the path, shifted sideways by `offset` (positive = left of travel). */
export function offsetPointAt(path: Path, dist: number, offset: number, out: PathPose = { x: 0, y: 0, angle: 0 }): PathPose {
  poseAt(path, dist, out);
  out.x += Math.sin(out.angle) * offset;
  out.y -= Math.cos(out.angle) * offset;
  return out;
}

export interface ClosestPoint {
  x: number;
  y: number;
  /** Distance along the path of the closest point. */
  dist: number;
  /** Euclidean distance from the query point to the path. */
  distance: number;
}

/** Closest point on the path centreline to (px, py). */
export function closestPoint(path: Path, px: number, py: number): ClosestPoint {
  let best: ClosestPoint = { x: path.xs[0]!, y: path.ys[0]!, dist: 0, distance: Infinity };
  for (let i = 0; i < path.xs.length - 1; i++) {
    const ax = path.xs[i]!;
    const ay = path.ys[i]!;
    const dx = path.xs[i + 1]! - ax;
    const dy = path.ys[i + 1]! - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    const distance = Math.hypot(px - cx, py - cy);
    if (distance < best.distance) {
      best = { x: cx, y: cy, dist: path.cumulative[i]! + Math.sqrt(len2) * t, distance };
    }
  }
  return best;
}
