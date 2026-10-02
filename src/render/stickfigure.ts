import { FIGURE_STYLE, LINE, PALETTE, RIG } from '../data/art';
import { DEATH } from '../sim/constants';
import type { CorpseKind } from '../sim/types';
import { inkArc, inkCircle, inkLine, inkPolyline, strokeInk } from './ink';

export type FigureKind = CorpseKind;
export type FigurePose = 'walk' | 'idle' | 'fight';

export interface FigureOptions {
  kind: FigureKind;
  /** Feet position (logical px). */
  x: number;
  y: number;
  scale: number;
  /** Walk phase (radians) for 'walk'; any running value for 'idle'. */
  phase: number;
  facing: 1 | -1;
  pose: FigurePose;
  /** Stable per-entity number so each figure boils differently. */
  seed: number;
  /** Two-frame swing for the 'fight' pose (the knight's bonk). */
  swing?: 0 | 1;
  /** Bard below half HP. */
  enraged?: boolean;
  /** Death tip in radians around the feet; positive falls backwards. */
  tip?: number;
  /** Vertical squash (1 = none), for knights flattened by the boss. */
  squash?: number;
  alpha?: number;
}

const TIN = '#E2DACB';
const WOOD = '#D8BE8A';

/**
 * Draws a stick figure: circle head, neck-to-hip spine, two-bone arms and legs, plus per-type props.
 * Bones are computed facing right in unscaled units, then mirrored/scaled on output so line weights stay constant.
 */
export function drawStickFigure(ctx: CanvasRenderingContext2D, o: FigureOptions): void {
  const style = FIGURE_STYLE[o.kind];
  const f = o.facing;
  const s = o.scale;
  const X = (v: number) => v * f * s;
  const Y = (v: number) => v * s;
  const lw = o.kind === 'reginald' ? LINE.boss : LINE.figure;
  const seed = o.seed * 37;

  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.alpha !== undefined && o.alpha < 1) ctx.globalAlpha *= Math.max(0, o.alpha);
  if (!o.tip) {
    ctx.beginPath();
    ctx.ellipse(0, 0.5, 6.5 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(60, 40, 20, 0.2)';
    ctx.fill();
  } else {
    ctx.rotate(-o.tip * f);
  }
  if (o.squash !== undefined && o.squash !== 1) ctx.scale(1, o.squash);

  // ---- pose angles (from straight down, positive = forward)
  const ph = o.phase;
  let thighA: number;
  let thighB: number;
  let bendA: number;
  let bendB: number;
  let armA: number;
  let armB: number;
  let foreA: number = style.elbow;
  let foreB: number = style.elbow;
  let bob: number;
  let lean: number = style.lean;
  if (o.pose === 'walk') {
    thighA = Math.sin(ph) * style.stride;
    thighB = Math.sin(ph + Math.PI) * style.stride;
    bendA = Math.max(0, Math.cos(ph)) * 0.75;
    bendB = Math.max(0, -Math.cos(ph)) * 0.75;
    armA = Math.sin(ph + Math.PI) * style.armSwing;
    armB = Math.sin(ph) * style.armSwing;
    bob = Math.abs(Math.sin(ph)) * RIG.bob;
  } else if (o.pose === 'idle') {
    thighA = 0.14;
    thighB = -0.12;
    bendA = 0.05;
    bendB = 0.05;
    armA = 0.15;
    armB = -0.1;
    foreA = 0.3;
    foreB = 0.3;
    bob = (Math.sin(ph) * 0.5 + 0.5) * 0.45;
    lean = Math.min(lean, 0.1);
  } else {
    thighA = 0.38;
    thighB = -0.32;
    bendA = 0.2;
    bendB = 0.08;
    armA = o.swing ? 2.6 : 1.1;
    foreA = o.swing ? 0.2 : 0.35;
    armB = -0.15;
    foreB = 0.9;
    bob = o.swing ? 0 : 0.6;
    lean = Math.min(lean, 0.15) + (o.swing ? -0.05 : 0.12);
  }
  if (o.kind === 'reginald') {
    // Club held aloft, wobbling with each step.
    armA = 2.35 + Math.sin(ph) * 0.12;
    foreA = 0.45;
  }

  // ---- bones
  const hipY = -(RIG.thigh + RIG.shin) + bob;
  const sl = Math.sin(lean);
  const cl = Math.cos(lean);
  const neckX = sl * RIG.torso;
  const neckY = hipY - cl * RIG.torso;
  const shX = sl * RIG.torso * 0.85;
  const shY = hipY - cl * RIG.torso * 0.85;
  const headX = neckX + sl * (RIG.neck + RIG.head);
  const headY = neckY - cl * (RIG.neck + RIG.head);

  const leg = (thigh: number, bend: number) => {
    const kx = Math.sin(thigh) * RIG.thigh;
    const ky = hipY + Math.cos(thigh) * RIG.thigh;
    const a = thigh - bend;
    return { kx, ky, fx: kx + Math.sin(a) * RIG.shin, fy: ky + Math.cos(a) * RIG.shin };
  };
  const arm = (upper: number, fore: number) => {
    const ex = shX + Math.sin(upper) * RIG.upperArm;
    const ey = shY + Math.cos(upper) * RIG.upperArm;
    const a = upper + fore;
    return { ex, ey, hx: ex + Math.sin(a) * RIG.forearm, hy: ey + Math.cos(a) * RIG.forearm };
  };
  const legA = leg(thighA, bendA);
  const legB = leg(thighB, bendB);
  const armFront = arm(armA, foreA);
  const armBack = arm(armB, foreB);

  // ---- props behind the body
  if (o.kind === 'bard') drawLute(ctx, X, Y, shX, shY, hipY, seed);
  if (o.kind === 'squire' && o.pose === 'walk') {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const ly = hipY - 2 - i * 4;
      const back = -8 - i * 2 - Math.abs(Math.sin(ph + i)) * 2;
      inkLine(ctx, X(back), Y(ly), X(back - 5), Y(ly), seed + 90 + i);
    }
    strokeInk(ctx, LINE.detail, PALETTE.inkFaint);
  }

  // ---- body
  ctx.beginPath();
  inkLine(ctx, 0, Y(hipY), X(legB.kx), Y(legB.ky), seed + 1);
  ctx.lineTo(X(legB.fx), Y(legB.fy));
  inkLine(ctx, X(shX), Y(shY), X(armBack.ex), Y(armBack.ey), seed + 3);
  ctx.lineTo(X(armBack.hx), Y(armBack.hy));
  inkLine(ctx, 0, Y(hipY), X(neckX), Y(neckY), seed + 5);
  inkLine(ctx, 0, Y(hipY), X(legA.kx), Y(legA.ky), seed + 7);
  ctx.lineTo(X(legA.fx), Y(legA.fy));
  strokeInk(ctx, lw);

  if (o.kind === 'reginald') {
    // Unreasonable belly.
    const bx = sl * RIG.torso * 0.45 + 2.6;
    const by = hipY - cl * RIG.torso * 0.45;
    ctx.beginPath();
    inkCircle(ctx, X(bx), Y(by), 4.4 * s, seed + 11);
    ctx.fillStyle = PALETTE.parchment;
    ctx.fill();
    strokeInk(ctx, lw);
    ctx.beginPath();
    inkArc(ctx, X(bx + 0.6), Y(by + 0.6), 1.2 * s, 0, Math.PI, seed + 12);
    strokeInk(ctx, LINE.detail);
  }

  // Front arm over the torso.
  ctx.beginPath();
  inkLine(ctx, X(shX), Y(shY), X(armFront.ex), Y(armFront.ey), seed + 9);
  ctx.lineTo(X(armFront.hx), Y(armFront.hy));
  strokeInk(ctx, lw);

  // ---- head
  if (o.kind === 'tinCan') {
    drawTinHelmet(ctx, X, Y, headX, headY, seed);
  } else {
    ctx.beginPath();
    inkCircle(ctx, X(headX), Y(headY), RIG.head * s, seed + 13);
    ctx.fillStyle = PALETTE.parchment;
    ctx.fill();
    strokeInk(ctx, lw);
    const angry = o.kind === 'peasant' || o.kind === 'reginald' || (o.kind === 'bard' && o.enraged);
    if (angry) {
      ctx.beginPath();
      inkLine(ctx, X(headX + 0.4), Y(headY - 2.1), X(headX + 2.9), Y(headY - 0.9), seed + 15);
      strokeInk(ctx, LINE.detail);
    }
  }

  // ---- props in front
  switch (o.kind) {
    case 'peasant':
      drawPitchfork(ctx, X, Y, armFront.hx, armFront.hy, seed);
      break;
    case 'squire':
      drawCap(ctx, X, Y, headX, headY, seed);
      break;
    case 'tinCan':
      drawShortSword(ctx, X, Y, armFront.hx, armFront.hy, -0.4, seed);
      break;
    case 'bard':
      drawBeret(ctx, X, Y, headX, headY, seed);
      if (o.enraged) drawRage(ctx, X, Y, headX, headY, ph, seed);
      break;
    case 'reginald':
      drawClub(ctx, X, Y, armFront.hx, armFront.hy, armA + foreA, lw, seed);
      drawCrown(ctx, X, Y, headX, headY, seed);
      break;
    case 'knight': {
      const swordAngle = o.pose === 'fight' ? (o.swing ? -1.25 : 0.35) : -1.0;
      drawShortSword(ctx, X, Y, armFront.hx, armFront.hy, swordAngle, seed);
      drawKnightHelm(ctx, X, Y, headX, headY, seed);
      drawShield(ctx, X, Y, shX + 2.2, shY + 4.2, seed);
      break;
    }
  }

  ctx.restore();
}

export interface DeathPose {
  tip: number;
  /** Bounce height in logical px. */
  lift: number;
  alpha: number;
  /** Squash factor for trampled knights. */
  squash: number;
}

/** Comedic death: tip 90° around the feet, bounce once, hold (longer with a quip), fade. */
export function deathPose(t: number, hasQuip: boolean, squashed: boolean): DeathPose {
  const { tipSec, bounceSec, holdSec, quipHoldSec, fadeSec } = DEATH;
  const fadeStart = tipSec + bounceSec + (hasQuip ? quipHoldSec : holdSec);
  const alpha = t < fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / fadeSec);
  if (squashed) {
    const k = Math.min(1, t / tipSec);
    return { tip: 0, lift: 0, alpha, squash: 1 - 0.78 * k * k };
  }
  if (t < tipSec) {
    const k = t / tipSec;
    return { tip: k * k * (Math.PI / 2), lift: 0, alpha, squash: 1 };
  }
  const b = (t - tipSec) / bounceSec;
  const lift = b < 1 ? Math.sin(b * Math.PI) * 4 : 0;
  return { tip: Math.PI / 2, lift, alpha, squash: 1 };
}

type Map1 = (v: number) => number;

function drawPitchfork(ctx: CanvasRenderingContext2D, X: Map1, Y: Map1, hx: number, hy: number, seed: number): void {
  const dx = Math.cos(-1.08);
  const dy = Math.sin(-1.08);
  const tx = hx + dx * 14;
  const ty = hy + dy * 14;
  const px = -dy;
  const py = dx;
  ctx.beginPath();
  inkLine(ctx, X(hx - dx * 6), Y(hy - dy * 6), X(tx), Y(ty), seed + 30);
  inkLine(ctx, X(tx - px * 2.6), Y(ty - py * 2.6), X(tx + px * 2.6), Y(ty + py * 2.6), seed + 31);
  for (let k = -1; k <= 1; k++) {
    const bx = tx + px * 2.6 * k;
    const by = ty + py * 2.6 * k;
    inkLine(ctx, X(bx), Y(by), X(bx + dx * 3.6), Y(by + dy * 3.6), seed + 32 + k);
  }
  strokeInk(ctx, LINE.detail);
}

function drawShortSword(
  ctx: CanvasRenderingContext2D,
  X: Map1,
  Y: Map1,
  hx: number,
  hy: number,
  angle: number,
  seed: number,
): void {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  ctx.beginPath();
  inkLine(ctx, X(hx), Y(hy), X(hx + dx * 9), Y(hy + dy * 9), seed + 40);
  inkLine(ctx, X(hx + dy * 2), Y(hy - dx * 2), X(hx - dy * 2), Y(hy + dx * 2), seed + 41);
  strokeInk(ctx, LINE.detail);
}

function drawTinHelmet(
  ctx: CanvasRenderingContext2D,
  X: Map1,
  Y: Map1,
  hx: number,
  hy: number,
  seed: number,
): void {
  const left = X(hx - 5);
  const right = X(hx + 5);
  const top = Y(hy - 6.5);
  const bottom = Y(hy + 4.6);
  const box = [left, top, right, top, right, bottom, left, bottom];
  ctx.beginPath();
  ctx.rect(Math.min(left, right), top, Math.abs(right - left), bottom - top);
  ctx.fillStyle = TIN;
  ctx.fill();
  ctx.beginPath();
  inkPolyline(ctx, box, seed + 20, true);
  strokeInk(ctx, LINE.figure);
  ctx.beginPath();
  inkLine(ctx, X(hx - 0.5), Y(hy - 1.2), X(hx + 4), Y(hy - 1.2), seed + 21);
  // Plume.
  inkLine(ctx, X(hx - 1), Y(hy - 6.5), X(hx - 3.5), Y(hy - 10), seed + 22);
  strokeInk(ctx, LINE.detail);
}

function drawKnightHelm(ctx: CanvasRenderingContext2D, X: Map1, Y: Map1, hx: number, hy: number, seed: number): void {
  ctx.beginPath();
  inkArc(ctx, X(hx), Y(hy), Math.abs(X(4.6)), Math.PI * 1.05, Math.PI * 1.95, seed + 50);
  inkLine(ctx, X(hx - 4.6), Y(hy - 0.4), X(hx + 4.6), Y(hy - 0.4), seed + 51);
  inkLine(ctx, X(hx + 1.6), Y(hy - 0.4), X(hx + 1.6), Y(hy + 2.6), seed + 52);
  strokeInk(ctx, LINE.detail);
}

function drawShield(ctx: CanvasRenderingContext2D, X: Map1, Y: Map1, cx: number, cy: number, seed: number): void {
  const pts = [
    X(cx - 2.8), Y(cy - 3.4),
    X(cx + 2.8), Y(cy - 3.4),
    X(cx + 2.6), Y(cy + 0.8),
    X(cx), Y(cy + 3.8),
    X(cx - 2.6), Y(cy + 0.8),
  ];
  ctx.beginPath();
  ctx.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
  ctx.closePath();
  ctx.fillStyle = PALETTE.parchment;
  ctx.fill();
  ctx.beginPath();
  inkPolyline(ctx, pts, seed + 55, true);
  strokeInk(ctx, LINE.detail);
  ctx.beginPath();
  inkLine(ctx, X(cx), Y(cy - 2.4), X(cx), Y(cy + 2.2), seed + 56);
  inkLine(ctx, X(cx - 1.8), Y(cy - 0.8), X(cx + 1.8), Y(cy - 0.8), seed + 57);
  strokeInk(ctx, 1.2, PALETTE.blood);
}

function drawCap(ctx: CanvasRenderingContext2D, X: Map1, Y: Map1, hx: number, hy: number, seed: number): void {
  ctx.beginPath();
  inkArc(ctx, X(hx), Y(hy - 0.5), Math.abs(X(4.2)), Math.PI * 1.1, Math.PI * 1.95, seed + 60);
  inkLine(ctx, X(hx + 2), Y(hy - 1.2), X(hx + 6.5), Y(hy - 0.4), seed + 61);
  // Feather streaming back.
  inkLine(ctx, X(hx - 2.5), Y(hy - 3.6), X(hx - 8), Y(hy - 6.5), seed + 62);
  strokeInk(ctx, LINE.detail);
}

function drawBeret(ctx: CanvasRenderingContext2D, X: Map1, Y: Map1, hx: number, hy: number, seed: number): void {
  const pts = [X(hx - 5), Y(hy - 2.6), X(hx - 1), Y(hy - 6.2), X(hx + 4.5), Y(hy - 4.4), X(hx + 1.5), Y(hy - 2.8)];
  ctx.beginPath();
  ctx.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
  ctx.closePath();
  ctx.fillStyle = PALETTE.parchment;
  ctx.fill();
  ctx.beginPath();
  inkPolyline(ctx, pts, seed + 70, true);
  // Long feather.
  inkLine(ctx, X(hx - 3), Y(hy - 4.5), X(hx - 10), Y(hy - 9), seed + 71);
  strokeInk(ctx, LINE.detail);
}

function drawLute(
  ctx: CanvasRenderingContext2D,
  X: Map1,
  Y: Map1,
  shX: number,
  shY: number,
  hipY: number,
  seed: number,
): void {
  const cx = shX - 4.2;
  const cy = (shY + hipY) / 2 + 1.5;
  ctx.beginPath();
  ctx.ellipse(X(cx), Y(cy), Math.abs(X(3.4)), Math.abs(Y(4.6)), 0.5 * Math.sign(X(1)), 0, Math.PI * 2);
  ctx.fillStyle = WOOD;
  ctx.fill();
  ctx.beginPath();
  inkCircle(ctx, X(cx), Y(cy), Math.abs(X(3.6)), seed + 80);
  // Neck over the shoulder.
  inkLine(ctx, X(cx + 1.2), Y(cy - 4), X(cx + 5.5), Y(cy - 13), seed + 81);
  inkLine(ctx, X(cx + 4.4), Y(cy - 13.2), X(cx + 6.8), Y(cy - 12.6), seed + 82);
  strokeInk(ctx, LINE.detail);
  ctx.beginPath();
  ctx.arc(X(cx), Y(cy), Math.abs(X(1)), 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.ink;
  ctx.fill();
}

function drawRage(
  ctx: CanvasRenderingContext2D,
  X: Map1,
  Y: Map1,
  hx: number,
  hy: number,
  phase: number,
  seed: number,
): void {
  // Furious music notes.
  const lift = (phase * 1.6) % 6;
  for (let k = 0; k < 2; k++) {
    const nx = hx + 3 + k * 4;
    const ny = hy - 7 - lift - k * 3;
    ctx.beginPath();
    ctx.ellipse(X(nx), Y(ny), Math.abs(X(1.3)), Math.abs(Y(1)), -0.4, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.blood;
    ctx.fill();
    ctx.beginPath();
    inkLine(ctx, X(nx + 1.2), Y(ny), X(nx + 1.2), Y(ny - 4), seed + 100 + k);
    inkLine(ctx, X(nx + 1.2), Y(ny - 4), X(nx + 3), Y(ny - 3), seed + 102 + k);
    strokeInk(ctx, 1.2, PALETTE.blood);
  }
}

function drawClub(
  ctx: CanvasRenderingContext2D,
  X: Map1,
  Y: Map1,
  hx: number,
  hy: number,
  /** Forearm angle (from straight down, forward positive); the club continues along it. */
  forearm: number,
  lw: number,
  seed: number,
): void {
  const dx = Math.sin(forearm);
  const dy = Math.cos(forearm);
  const ex = hx + dx * 11;
  const ey = hy + dy * 11;
  ctx.beginPath();
  inkLine(ctx, X(hx - dx * 2), Y(hy - dy * 2), X(ex), Y(ey), seed + 110);
  strokeInk(ctx, lw + 1.5);
  ctx.beginPath();
  inkCircle(ctx, X(ex + dx * 1.2), Y(ey + dy * 1.2), Math.abs(X(2.6)), seed + 111);
  ctx.fillStyle = WOOD;
  ctx.fill();
  strokeInk(ctx, lw);
}

function drawCrown(ctx: CanvasRenderingContext2D, X: Map1, Y: Map1, hx: number, hy: number, seed: number): void {
  const base = hy - 3.2;
  const pts = [
    X(hx - 3.6), Y(base),
    X(hx - 3.9), Y(base - 4),
    X(hx - 1.8), Y(base - 2),
    X(hx), Y(base - 4.8),
    X(hx + 1.8), Y(base - 2),
    X(hx + 3.9), Y(base - 4),
    X(hx + 3.6), Y(base),
  ];
  ctx.beginPath();
  ctx.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
  ctx.closePath();
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
  ctx.beginPath();
  inkPolyline(ctx, pts, seed + 120, true);
  strokeInk(ctx, LINE.detail);
}
