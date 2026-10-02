import { INK_JITTER, LINE, PALETTE } from '../data/art';
import { HUD, SLOT_RADIUS } from '../data/layout';
import type { MapDef } from '../data/map01';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../sim/constants';
import { closestPoint } from '../sim/path';
import { createRng, nextFloat, nextRange } from '../sim/rng';
import type { Path } from '../sim/types';
import {
  currentInkVariant,
  inkArc,
  inkDashed,
  inkDashedCircle,
  inkLine,
  inkPolyline,
  setInkVariant,
  strokeInk,
} from './ink';

/** Offscreen map caches are capped at this many device px per logical px (memory on 3× phones). */
const MAX_CACHE_PIXEL_SCALE = 2;

/** Scenery fills are slightly see-through so they sit in the paper instead of on it. */
const SCENERY_FILL = 'rgba(236, 222, 184, 0.7)';

type DecorKind = 'tree' | 'pine' | 'rock' | 'tuft' | 'bush';

interface Decor {
  kind: DecorKind;
  x: number;
  y: number;
  size: number;
  seed: number;
}

export interface MapArt {
  pixelScale: number;
  /** One fully rendered static layer per jitter variant. */
  layers: HTMLCanvasElement[];
}

let cached: MapArt | null = null;

/** Static map art for the given device pixel scale (rebuilt only when the scale changes). */
export function mapArt(pixelScale: number, path: Path, map: MapDef): MapArt {
  const ps = Math.min(pixelScale, MAX_CACHE_PIXEL_SCALE);
  if (cached && Math.abs(cached.pixelScale - ps) < 1e-3) return cached;
  cached = buildMapArt(ps, path, map);
  return cached;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function context(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  return ctx;
}

function buildMapArt(ps: number, path: Path, map: MapDef): MapArt {
  const w = Math.ceil(LOGICAL_WIDTH * ps);
  const h = Math.ceil(LOGICAL_HEIGHT * ps);
  const base = makeCanvas(w, h);
  const bctx = context(base);
  bctx.setTransform(ps, 0, 0, ps, 0, 0);
  drawParchment(bctx);
  drawRoadBed(bctx, path, map);

  const decor = generateDecor(path, map);
  const previous = currentInkVariant();
  const layers: HTMLCanvasElement[] = [];
  for (let v = 0; v < INK_JITTER.variants; v++) {
    const layer = makeCanvas(w, h);
    const ctx = context(layer);
    ctx.drawImage(base, 0, 0);
    ctx.setTransform(ps, 0, 0, ps, 0, 0);
    setInkVariant(v);
    drawRoadEdges(ctx, path, map);
    for (const d of decor) drawDecor(ctx, d);
    drawCastle(ctx, map);
    layers.push(layer);
  }
  setInkVariant(previous);
  return { pixelScale: ps, layers };
}

// ---------------------------------------------------------------- parchment

function noiseCanvas(w: number, h: number, seed: number, maxAlpha: number): HTMLCanvasElement {
  const c = makeCanvas(w, h);
  const ctx = context(c);
  const img = ctx.createImageData(w, h);
  const rng = createRng(seed);
  for (let i = 0; i < w * h; i++) {
    const v = nextFloat(rng);
    img.data[i * 4] = 110;
    img.data[i * 4 + 1] = 78;
    img.data[i * 4 + 2] = 40;
    img.data[i * 4 + 3] = Math.floor(v * v * maxAlpha);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function drawParchment(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PALETTE.parchment;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(noiseCanvas(64, 36, 11, 40), 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.drawImage(noiseCanvas(240, 135, 23, 18), 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.drawImage(noiseCanvas(480, 270, 37, 12), 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Paper fibres.
  const rng = createRng(41);
  ctx.strokeStyle = 'rgba(120, 88, 50, 0.10)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i < 160; i++) {
    const x = nextRange(rng, 0, LOGICAL_WIDTH);
    const y = nextRange(rng, 0, LOGICAL_HEIGHT);
    const a = nextRange(rng, 0, Math.PI);
    const l = nextRange(rng, 6, 22);
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 2, y + Math.sin(a) * l * 0.5 - 2, x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  ctx.stroke();

  // A couple of faint tea stains.
  for (const [x, y, r] of [
    [150, 470, 70],
    [640, 330, 46],
    [470, 110, 54],
  ] as const) {
    const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r);
    g.addColorStop(0, 'rgba(150, 110, 60, 0)');
    g.addColorStop(0.85, 'rgba(150, 110, 60, 0.07)');
    g.addColorStop(1, 'rgba(150, 110, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Vignette.
  const v = ctx.createRadialGradient(480, 290, 220, 480, 270, 620);
  v.addColorStop(0, 'rgba(90, 58, 26, 0)');
  v.addColorStop(1, 'rgba(90, 58, 26, 0.3)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

// ---------------------------------------------------------------- road

function centreline(path: Path): Float64Array {
  const out = new Float64Array(path.xs.length * 2);
  for (let i = 0; i < path.xs.length; i++) {
    out[2 * i] = path.xs[i]!;
    out[2 * i + 1] = path.ys[i]!;
  }
  return out;
}

/** Polyline offset sideways from the centreline (positive = left of travel). */
function offsetLine(path: Path, offset: number): Float64Array {
  const n = path.xs.length;
  const out = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(n - 1, i + 1);
    const tx = path.xs[i1]! - path.xs[i0]!;
    const ty = path.ys[i1]! - path.ys[i0]!;
    const len = Math.hypot(tx, ty) || 1;
    out[2 * i] = path.xs[i]! + (ty / len) * offset;
    out[2 * i + 1] = path.ys[i]! - (tx / len) * offset;
  }
  return out;
}

function tracePolyline(ctx: CanvasRenderingContext2D, pts: Float64Array): void {
  ctx.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
}

function drawRoadBed(ctx: CanvasRenderingContext2D, path: Path, map: MapDef): void {
  const line = centreline(path);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  tracePolyline(ctx, line);
  ctx.strokeStyle = PALETTE.dirt;
  ctx.lineWidth = map.pathHalfWidth * 2;
  ctx.stroke();

  // Wheel ruts.
  for (const off of [-7, 7]) {
    ctx.beginPath();
    tracePolyline(ctx, offsetLine(path, off));
    ctx.strokeStyle = 'rgba(140, 104, 58, 0.28)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Pebbles.
  const rng = createRng(53);
  ctx.fillStyle = 'rgba(27, 20, 16, 0.28)';
  for (let i = 0; i < 140; i++) {
    const d = nextRange(rng, 0, path.length);
    const off = nextRange(rng, -map.pathHalfWidth + 4, map.pathHalfWidth - 4);
    const idx = Math.min(path.xs.length - 2, Math.floor((d / path.length) * (path.xs.length - 1)));
    const tx = path.xs[idx + 1]! - path.xs[idx]!;
    const ty = path.ys[idx + 1]! - path.ys[idx]!;
    const len = Math.hypot(tx, ty) || 1;
    const x = path.xs[idx]! + (ty / len) * off;
    const y = path.ys[idx]! - (tx / len) * off;
    ctx.beginPath();
    ctx.arc(x, y, nextRange(rng, 0.6, 1.5), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoadEdges(ctx: CanvasRenderingContext2D, path: Path, map: MapDef): void {
  ctx.beginPath();
  inkDashed(ctx, offsetLine(path, map.pathHalfWidth), 11, 5, 101);
  inkDashed(ctx, offsetLine(path, -map.pathHalfWidth), 9, 6, 211);
  strokeInk(ctx, 2);
}

// ---------------------------------------------------------------- scenery

function generateDecor(path: Path, map: MapDef): Decor[] {
  const rng = createRng(0xdec0);
  const out: Decor[] = [];
  const castleLeft = map.gate.x - 60;

  const place = (kind: DecorKind, count: number, minSize: number, maxSize: number, roadGap: number, spacing: number) => {
    let placed = 0;
    for (let attempt = 0; attempt < count * 80 && placed < count; attempt++) {
      const size = nextRange(rng, minSize, maxSize);
      const x = nextRange(rng, 8, LOGICAL_WIDTH - 8);
      const y = nextRange(rng, HUD.height + 18, LOGICAL_HEIGHT - 6);
      if (x > castleLeft - 20 && y > map.gate.y - 150 && y < map.gate.y + 30) continue;
      // Tall things are checked at their base and their top so canopies don't cover the road.
      const top = kind === 'tree' || kind === 'pine' ? y - size * 2.2 : y;
      if (top < HUD.height + 4) continue;
      const roadClear = Math.min(closestPoint(path, x, y).distance, closestPoint(path, x, top).distance);
      if (roadClear < map.pathHalfWidth + roadGap) continue;
      const slotClear = map.slots.every(
        (s) => Math.hypot(s.x - x, s.y - y) > SLOT_RADIUS + spacing + 10 && Math.hypot(s.x - x, s.y - top) > SLOT_RADIUS + spacing + 6,
      );
      if (!slotClear) continue;
      if (out.some((d) => Math.hypot(d.x - x, d.y - y) < spacing + d.size * 0.6)) continue;
      out.push({ kind, x, y, size, seed: 300 + out.length * 17 });
      placed++;
    }
  };

  place('tree', 13, 9, 14, 16, 16);
  place('pine', 11, 8, 12, 14, 14);
  place('rock', 12, 5, 10, 8, 10);
  place('bush', 10, 6, 9, 8, 10);
  place('tuft', 60, 4, 7, 4, 6);
  out.sort((a, b) => a.y - b.y);
  return out;
}

function drawDecor(ctx: CanvasRenderingContext2D, d: Decor): void {
  switch (d.kind) {
    case 'tree':
      drawTree(ctx, d);
      break;
    case 'pine':
      drawPine(ctx, d);
      break;
    case 'rock':
      drawRock(ctx, d);
      break;
    case 'bush':
      drawBush(ctx, d);
      break;
    case 'tuft':
      drawTuft(ctx, d);
      break;
  }
}

function blob(cx: number, cy: number, r: number, lobes: number, seed: number, squash = 1): number[] {
  const pts: number[] = [];
  const n = 18;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const rr = r * (1 + 0.13 * Math.sin(a * lobes + seed));
    pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash);
  }
  return pts;
}

function fillPoly(ctx: CanvasRenderingContext2D, pts: number[], fill: string): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function groundShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.28, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(80, 55, 25, 0.16)';
  ctx.fill();
}

function drawTree(ctx: CanvasRenderingContext2D, d: Decor): void {
  const { x, y, size: s, seed } = d;
  groundShadow(ctx, x + 2, y, s * 0.9);
  const cy = y - s * 1.5;
  ctx.beginPath();
  inkLine(ctx, x - 1.8, y, x - 1.2, cy + s * 0.5, seed);
  inkLine(ctx, x + 1.8, y, x + 1.2, cy + s * 0.5, seed + 1);
  strokeInk(ctx, LINE.detail);
  const canopy = blob(x, cy, s, 5, seed);
  fillPoly(ctx, canopy, SCENERY_FILL);
  ctx.beginPath();
  inkPolyline(ctx, canopy, seed + 2, true);
  strokeInk(ctx, 2);
  // Hatch shading on the lower right.
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const hx = x + s * 0.15 + k * s * 0.17;
    inkLine(ctx, hx, cy + s * 0.15, hx - s * 0.22, cy + s * 0.65, seed + 5 + k);
  }
  strokeInk(ctx, 1, PALETTE.inkFaint);
}

function drawPine(ctx: CanvasRenderingContext2D, d: Decor): void {
  const { x, y, size: s, seed } = d;
  groundShadow(ctx, x + 2, y, s * 0.8);
  ctx.beginPath();
  inkLine(ctx, x, y, x, y - s * 0.5, seed);
  strokeInk(ctx, LINE.detail);
  for (let tier = 0; tier < 3; tier++) {
    const base = y - s * 0.4 - tier * s * 0.62;
    const half = s * (0.85 - tier * 0.2);
    const tri = [x - half, base, x, base - s * 1.05, x + half, base];
    fillPoly(ctx, tri, SCENERY_FILL);
    ctx.beginPath();
    inkPolyline(ctx, tri, seed + tier * 5, true);
    strokeInk(ctx, 1.8);
  }
}

function drawRock(ctx: CanvasRenderingContext2D, d: Decor): void {
  const { x, y, size: s, seed } = d;
  const rng = createRng(seed);
  const pts: number[] = [];
  const n = 7;
  for (let k = 0; k < n; k++) {
    const a = Math.PI + (k / (n - 1)) * Math.PI;
    const rr = s * nextRange(rng, 0.75, 1.05);
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75);
  }
  fillPoly(ctx, pts, 'rgba(200, 176, 128, 0.55)');
  ctx.beginPath();
  inkPolyline(ctx, pts, seed, true);
  inkLine(ctx, x - s * 0.2, y - s * 0.5, x + s * 0.1, y - s * 0.15, seed + 9);
  strokeInk(ctx, LINE.detail);
}

function drawBush(ctx: CanvasRenderingContext2D, d: Decor): void {
  const { x, y, size: s, seed } = d;
  const pts = blob(x, y - s * 0.5, s, 4, seed, 0.62);
  fillPoly(ctx, pts, SCENERY_FILL);
  ctx.beginPath();
  inkPolyline(ctx, pts, seed, true);
  strokeInk(ctx, LINE.detail);
}

function drawTuft(ctx: CanvasRenderingContext2D, d: Decor): void {
  const { x, y, size: s, seed } = d;
  ctx.beginPath();
  inkLine(ctx, x, y, x - s * 0.5, y - s, seed);
  inkLine(ctx, x, y, x, y - s * 1.2, seed + 1);
  inkLine(ctx, x, y, x + s * 0.5, y - s * 0.9, seed + 2);
  strokeInk(ctx, 1.1, PALETTE.inkFaint);
}

// ---------------------------------------------------------------- castle

/** The castle is drawn upright with its gate arch where the road ends. */
function drawCastle(ctx: CanvasRenderingContext2D, map: MapDef): void {
  const gx = map.gate.x;
  const ground = map.gate.y + 4;
  const gateHalf = 21;
  const archTop = ground - 50;
  const wallTop = ground - 96;
  const towerTop = ground - 136;
  const towerW = 30;
  const leftTowerX = gx - gateHalf - towerW;
  const rightTowerX = gx + gateHalf;
  const seed = 900;

  // Curtain wall behind the towers, running off the right edge.
  const wall = [leftTowerX - 26, ground, leftTowerX - 26, wallTop, LOGICAL_WIDTH + 10, wallTop, LOGICAL_WIDTH + 10, ground];
  fillPoly(ctx, wall, '#E3CF9F');
  ctx.beginPath();
  inkLine(ctx, leftTowerX - 26, ground, leftTowerX - 26, wallTop, seed);
  crenellations(ctx, leftTowerX - 26, LOGICAL_WIDTH + 10, wallTop, seed + 3);
  strokeInk(ctx, LINE.outline);

  // Brick hints on the wall.
  ctx.beginPath();
  const rng = createRng(seed);
  for (let i = 0; i < 26; i++) {
    const bx = nextRange(rng, leftTowerX - 22, LOGICAL_WIDTH - 6);
    const by = nextRange(rng, wallTop + 10, ground - 6);
    if (bx > gx - gateHalf - 4 && bx < gx + gateHalf + 4) continue;
    inkLine(ctx, bx, by, bx + 9, by, seed + 20 + i);
  }
  strokeInk(ctx, 1, PALETTE.inkFaint);

  for (const tx of [leftTowerX, rightTowerX]) {
    const body = [tx, ground, tx, towerTop, tx + towerW, towerTop, tx + towerW, ground];
    fillPoly(ctx, body, '#E8D6A8');
    ctx.beginPath();
    inkLine(ctx, tx, ground, tx, towerTop, seed + tx);
    inkLine(ctx, tx + towerW, ground, tx + towerW, towerTop, seed + tx + 1);
    crenellations(ctx, tx - 3, tx + towerW + 3, towerTop, seed + tx + 2);
    // Arrow slit.
    inkLine(ctx, tx + towerW / 2, towerTop + 28, tx + towerW / 2, towerTop + 42, seed + tx + 4);
    strokeInk(ctx, LINE.outline);
    // Flagpole + red pennant.
    ctx.beginPath();
    inkLine(ctx, tx + towerW / 2, towerTop - 8, tx + towerW / 2, towerTop - 34, seed + tx + 5);
    strokeInk(ctx, LINE.detail);
    const fx = tx + towerW / 2;
    const fy = towerTop - 34;
    const pennant = [fx, fy, fx + 18, fy + 5, fx, fy + 10];
    fillPoly(ctx, pennant, PALETTE.blood);
    ctx.beginPath();
    inkPolyline(ctx, pennant, seed + tx + 6, true);
    strokeInk(ctx, 1.2);
  }

  // Gate arch with a dark opening and portcullis.
  ctx.beginPath();
  ctx.moveTo(gx - gateHalf, ground);
  ctx.lineTo(gx - gateHalf, archTop + gateHalf);
  ctx.arc(gx, archTop + gateHalf, gateHalf, Math.PI, 0);
  ctx.lineTo(gx + gateHalf, ground);
  ctx.closePath();
  ctx.fillStyle = 'rgba(27, 20, 16, 0.78)';
  ctx.fill();
  ctx.beginPath();
  inkLine(ctx, gx - gateHalf, ground, gx - gateHalf, archTop + gateHalf, seed + 40);
  inkArc(ctx, gx, archTop + gateHalf, gateHalf, Math.PI, Math.PI * 2, seed + 41);
  inkLine(ctx, gx + gateHalf, archTop + gateHalf, gx + gateHalf, ground, seed + 42);
  strokeInk(ctx, LINE.outline);
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) inkLine(ctx, gx + i * 7, archTop + 8, gx + i * 7, archTop + 30, seed + 50 + i);
  inkLine(ctx, gx - gateHalf + 2, archTop + 18, gx + gateHalf - 2, archTop + 18, seed + 56);
  strokeInk(ctx, 1.4, PALETTE.parchmentShade);
}

function crenellations(ctx: CanvasRenderingContext2D, x0: number, x1: number, top: number, seed: number): void {
  const merlon = 9;
  const pts: number[] = [];
  let up = true;
  for (let x = x0; x < x1; x += merlon) {
    const y = up ? top - 7 : top;
    pts.push(x, top, x, y, Math.min(x + merlon, x1), y, Math.min(x + merlon, x1), top);
    up = !up;
  }
  inkPolyline(ctx, pts, seed);
}

// ---------------------------------------------------------------- slots (dynamic)

/** Empty build slots as dashed circles. `highlight` is the slot whose radial menu is open. */
export function drawSlots(
  ctx: CanvasRenderingContext2D,
  map: MapDef,
  occupied: ReadonlySet<number>,
  highlight: number | null,
  hover: number | null,
): void {
  for (const [i, s] of map.slots.entries()) {
    if (occupied.has(i)) continue;
    const active = i === highlight;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 3, SLOT_RADIUS - 2, (SLOT_RADIUS - 2) * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = active ? 'rgba(201, 162, 39, 0.28)' : 'rgba(140, 104, 58, 0.16)';
    ctx.fill();
    ctx.beginPath();
    inkDashedCircle(ctx, s.x, s.y, SLOT_RADIUS - 3, 12, 600 + i * 11);
    strokeInk(ctx, active || i === hover ? 2.4 : 1.6, active ? PALETTE.gold : PALETTE.inkFaint);
    if (!active) {
      // A tiny "+" invites a tap.
      ctx.beginPath();
      inkLine(ctx, s.x - 4, s.y, s.x + 4, s.y, 640 + i);
      inkLine(ctx, s.x, s.y - 4, s.x, s.y + 4, 660 + i);
      strokeInk(ctx, 1.4, PALETTE.inkFaint);
    }
  }
}
