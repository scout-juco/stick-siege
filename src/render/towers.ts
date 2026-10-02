import { LINE, PALETTE } from '../data/art';
import type { Tower, TowerKind } from '../sim/types';
import { inkCircle, inkLine, inkPolyline, strokeInk } from './ink';

const WOOD = '#D8BE8A';
const CANVAS = '#E8D9B4';

interface TowerPose {
  /** Angle towards the current/last target. */
  aim: number;
  /** Seconds since the last shot (large if never). */
  sinceShot: number;
  time: number;
}

function fillPoly(ctx: CanvasRenderingContext2D, pts: number[], fill: string): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function inkShape(ctx: CanvasRenderingContext2D, pts: number[], fill: string, seed: number, width: number = LINE.outline): void {
  fillPoly(ctx, pts, fill);
  ctx.beginPath();
  inkPolyline(ctx, pts, seed, true);
  strokeInk(ctx, width);
}

/** Draws a built tower standing on its slot. */
export function drawTower(ctx: CanvasRenderingContext2D, tower: Tower, time: number): void {
  const pose: TowerPose = { aim: tower.aim, sinceShot: time - tower.firedAt, time };
  ctx.save();
  ctx.translate(tower.x, tower.y);
  ctx.beginPath();
  ctx.ellipse(0, 6, 21, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(90, 60, 25, 0.22)';
  ctx.fill();
  drawTowerArt(ctx, tower.kind, pose, tower.id * 7);
  ctx.restore();
}

/** Small sketch for the build menu, centred at (x, y), fitting in roughly `size` px. */
export function drawTowerIcon(ctx: CanvasRenderingContext2D, kind: TowerKind, x: number, y: number, size: number, time: number): void {
  const s = size / 46;
  ctx.save();
  ctx.translate(x, y + 9 * s);
  ctx.scale(s, s);
  drawTowerArt(ctx, kind, { aim: -0.4, sinceShot: 99, time }, 900 + kind.length);
  ctx.restore();
}

function drawTowerArt(ctx: CanvasRenderingContext2D, kind: TowerKind, pose: TowerPose, seed: number): void {
  switch (kind) {
    case 'archer':
      drawArcherPost(ctx, pose, seed);
      break;
    case 'catapult':
      drawCatapult(ctx, pose, seed);
      break;
    case 'wizard':
      drawWizardHut(ctx, pose, seed);
      break;
    case 'barracks':
      drawBarracks(ctx, pose, seed);
      break;
  }
}

/** Wooden watchtower with a little archer on top who turns to face the target. */
function drawArcherPost(ctx: CanvasRenderingContext2D, pose: TowerPose, seed: number): void {
  const top = -22;
  ctx.beginPath();
  inkLine(ctx, -12, 6, -8, top, seed);
  inkLine(ctx, 12, 6, 8, top, seed + 1);
  inkLine(ctx, -11, 0, 9, top + 8, seed + 2);
  inkLine(ctx, 11, 0, -9, top + 8, seed + 3);
  strokeInk(ctx, LINE.outline);
  // Platform with railing.
  inkShape(ctx, [-14, top, 14, top, 14, top - 5, -14, top - 5], WOOD, seed + 4);
  ctx.beginPath();
  inkLine(ctx, -13, top - 5, -13, top - 11, seed + 5);
  inkLine(ctx, 13, top - 5, 13, top - 11, seed + 6);
  inkLine(ctx, -13, top - 11, 13, top - 11, seed + 7);
  strokeInk(ctx, LINE.detail);

  // Archer: head and shoulders above the rail, bow pointing at the target.
  const facing = Math.cos(pose.aim) >= 0 ? 1 : -1;
  const hx = -2 * facing;
  ctx.beginPath();
  inkCircle(ctx, hx, top - 17, 3.4, seed + 8);
  ctx.fillStyle = PALETTE.parchment;
  ctx.fill();
  strokeInk(ctx, LINE.figure);
  ctx.beginPath();
  inkLine(ctx, hx, top - 13.5, hx, top - 8, seed + 9);
  const ax = Math.cos(pose.aim);
  const ay = Math.sin(pose.aim);
  const bx = hx + ax * 7;
  const by = top - 11 + ay * 7;
  inkLine(ctx, hx, top - 11, bx, by, seed + 10);
  strokeInk(ctx, LINE.figure);
  // Bow: an arc across the aim direction, string drawn back after a shot.
  const pull = pose.sinceShot < 0.12 ? 0 : 2.5;
  ctx.beginPath();
  ctx.arc(bx - ax * 2, by - ay * 2, 6, pose.aim - 1.3, pose.aim + 1.3);
  strokeInk(ctx, LINE.detail);
  ctx.beginPath();
  const sx1 = bx - ax * 2 + Math.cos(pose.aim - 1.3) * 6;
  const sy1 = by - ay * 2 + Math.sin(pose.aim - 1.3) * 6;
  const sx2 = bx - ax * 2 + Math.cos(pose.aim + 1.3) * 6;
  const sy2 = by - ay * 2 + Math.sin(pose.aim + 1.3) * 6;
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(bx - ax * (2 + pull), by - ay * (2 + pull));
  ctx.lineTo(sx2, sy2);
  strokeInk(ctx, 1, PALETTE.inkFaint);
}

/** Wheeled catapult whose arm snaps forward when it fires, then cranks back. */
function drawCatapult(ctx: CanvasRenderingContext2D, pose: TowerPose, seed: number): void {
  const facing = Math.cos(pose.aim) >= 0 ? 1 : -1;
  ctx.save();
  ctx.scale(facing, 1);
  // Base and uprights.
  inkShape(ctx, [-16, -2, 16, -2, 16, -7, -16, -7], WOOD, seed);
  ctx.beginPath();
  inkLine(ctx, -6, -7, 0, -20, seed + 1);
  inkLine(ctx, 6, -7, 0, -20, seed + 2);
  strokeInk(ctx, LINE.outline);
  // Arm angle: cocked back, flung forward on firing, winding back over ~1.5 s.
  const fling = pose.sinceShot < 0.12 ? pose.sinceShot / 0.12 : Math.max(0, 1 - (pose.sinceShot - 0.12) / 1.4);
  const angle = -2.6 + fling * 1.7;
  const px = 0;
  const py = -18;
  const ex = px + Math.cos(angle) * 18;
  const ey = py + Math.sin(angle) * 18;
  const bx = px - Math.cos(angle) * 6;
  const by = py - Math.sin(angle) * 6;
  ctx.beginPath();
  inkLine(ctx, bx, by, ex, ey, seed + 3);
  strokeInk(ctx, LINE.outline + 0.5);
  ctx.beginPath();
  ctx.arc(ex, ey, 4.5, angle + Math.PI * 0.2, angle + Math.PI * 1.2);
  strokeInk(ctx, LINE.detail);
  if (fling < 0.05) {
    // Loaded boulder in the bucket.
    ctx.beginPath();
    inkCircle(ctx, ex - Math.cos(angle) * 0.5, ey - 1.5, 3.2, seed + 4);
    ctx.fillStyle = '#B9A88A';
    ctx.fill();
    strokeInk(ctx, LINE.detail);
  }
  // Wheels.
  for (const wx of [-10, 10]) {
    ctx.beginPath();
    inkCircle(ctx, wx, 1, 5, seed + 5 + wx);
    ctx.fillStyle = WOOD;
    ctx.fill();
    strokeInk(ctx, LINE.outline);
    ctx.beginPath();
    inkLine(ctx, wx - 3.5, 1, wx + 3.5, 1, seed + 8 + wx);
    inkLine(ctx, wx, -2.5, wx, 4.5, seed + 9 + wx);
    strokeInk(ctx, 1);
  }
  ctx.restore();
}

/** Round hut with a pointy wizard hat for a roof; the hat's star glows when it casts. */
function drawWizardHut(ctx: CanvasRenderingContext2D, pose: TowerPose, seed: number): void {
  // Walls.
  inkShape(ctx, [-12, 5, -12, -14, 12, -14, 12, 5], CANVAS, seed);
  // Door.
  ctx.beginPath();
  inkLine(ctx, -4, 5, -4, -4, seed + 1);
  ctx.arc(0, -4, 4, Math.PI, 0);
  inkLine(ctx, 4, -4, 4, 5, seed + 2);
  strokeInk(ctx, LINE.detail);
  // Hat roof with a floppy tip.
  const wobble = Math.sin(pose.time * 2) * 1.2;
  const hat = [-17, -13, -5, -28, 1 + wobble, -42, 6, -30, 17, -13];
  inkShape(ctx, hat, '#C9C2D8', seed + 3);
  ctx.beginPath();
  inkLine(ctx, -18, -13, 18, -13, seed + 4);
  strokeInk(ctx, LINE.outline);
  // Stars.
  const glow = pose.sinceShot < 0.25;
  for (const [sx, sy, r] of [
    [-4, -20, 2.4],
    [5, -24, 1.8],
  ] as const) {
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * 4 * Math.PI) / 5;
      const x = sx + Math.cos(a) * r;
      const y = sy + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = glow ? PALETTE.goldLight : PALETTE.gold;
    ctx.fill();
  }
  if (glow) {
    ctx.beginPath();
    ctx.arc(1 + wobble, -42, 6 * (1 - pose.sinceShot / 0.25) + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(62, 94, 140, 0.35)';
    ctx.fill();
  }
}

/** Striped army tent with a pennant; knights live here between shifts. */
function drawBarracks(ctx: CanvasRenderingContext2D, pose: TowerPose, seed: number): void {
  inkShape(ctx, [-18, 5, 0, -24, 18, 5], CANVAS, seed);
  ctx.beginPath();
  inkLine(ctx, -7, 5, 0, -24, seed + 1);
  inkLine(ctx, 7, 5, 0, -24, seed + 2);
  strokeInk(ctx, LINE.detail);
  // Door flap.
  inkShape(ctx, [-5, 5, 0, -8, 5, 5], 'rgba(27, 20, 16, 0.75)', seed + 3, LINE.detail);
  // Pole and pennant.
  ctx.beginPath();
  inkLine(ctx, 0, -24, 0, -36, seed + 4);
  strokeInk(ctx, LINE.detail);
  const flap = Math.sin(pose.time * 5) * 1.5;
  const flag = [0, -36, 12, -33 + flap, 0, -30];
  fillPoly(ctx, flag, PALETTE.blood);
  ctx.beginPath();
  inkPolyline(ctx, flag, seed + 5, true);
  strokeInk(ctx, 1.2);
}
