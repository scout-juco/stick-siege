import { FONTS, LINE, PALETTE } from '../data/art';
import { UI_TEXT } from '../data/copy';
import { enemyDef } from '../data/enemies';
import { map01 } from '../data/map01';
import { hoveredSlot } from '../input/controls';
import { DEATH, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../sim/constants';
import { isEnraged } from '../sim/enemies';
import { IMPACT_SEC } from '../sim/projectiles';
import type { Corpse, Enemy, GameState, Knight, Projectile, Tower } from '../sim/types';
import type { Session } from '../session';
import { inkCircle, inkDashedCircle, inkLine, inkVariantForTime, setInkVariant, strokeInk } from './ink';
import { drawSlots, mapArt } from './map';
import { deathPose, drawStickFigure } from './stickfigure';
import { drawTower } from './towers';
import {
  drawBossBar,
  drawEndScreen,
  drawHud,
  drawPauseOverlay,
  drawRadialMenu,
  drawSelectionLabel,
  drawSelectionRing,
  drawWaveBanner,
} from './ui';
import { applyLogicalTransform, pixelScale, type Viewport } from './viewport';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Figure height at scale 1, for placing health bars and bubbles above heads. */
const FIGURE_HEIGHT = 30;

type SortItem =
  | { y: number; type: 'enemy'; ref: Enemy }
  | { y: number; type: 'corpse'; ref: Corpse }
  | { y: number; type: 'tower'; ref: Tower }
  | { y: number; type: 'knight'; ref: Knight };
const sortList: SortItem[] = [];

/** Draws one frame: letterbox, cached map, then everything dynamic. */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  session: Session,
  alpha: number,
  nowMs: number,
): void {
  const { state, ui } = session;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PALETTE.letterbox;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  applyLogicalTransform(ctx, vp);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.clip();

  const variant = inkVariantForTime(nowMs);
  setInkVariant(variant);
  const art = mapArt(pixelScale(vp), state.path, map01);
  ctx.drawImage(art.layers[variant]!, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  const occupied = new Set(state.towers.map((t) => t.slot));
  drawSlots(ctx, map01, occupied, ui.selectedSlot, hoveredSlot(session));
  drawSelectionRing(ctx, session);

  drawImpacts(ctx, state);
  drawActors(ctx, state, alpha);
  drawProjectiles(ctx, state, alpha);
  drawBubbles(ctx, state, alpha);

  drawSelectionLabel(ctx, session);
  drawWaveBanner(ctx, state);
  drawRadialMenu(ctx, session, nowMs);
  drawBossBar(ctx, state);
  drawHud(ctx, session, nowMs);
  if (state.paused) drawPauseOverlay(ctx, session);
  drawEndScreen(ctx, session, nowMs);

  ctx.restore();
  drawRotateHint(ctx, vp, nowMs);
}

/** Tall portrait screens leave big letterbox bars; suggest turning the phone sideways. */
function drawRotateHint(ctx: CanvasRenderingContext2D, vp: Viewport, nowMs: number): void {
  const barCss = vp.offsetY;
  if (vp.cssHeight < vp.cssWidth * 1.2 || barCss < 56) return;
  const d = vp.dpr;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  const cx = vp.cssWidth / 2;
  const cy = vp.offsetY + LOGICAL_HEIGHT * vp.scale + Math.min(barCss / 2, 70);
  const wobble = Math.sin(nowMs / 400) * 0.25;
  // A little phone, tipping sideways.
  ctx.save();
  ctx.translate(cx, cy - 22);
  ctx.rotate(-0.6 + wobble);
  ctx.strokeStyle = PALETTE.parchment;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-9, -15, 18, 30, 4);
  ctx.stroke();
  ctx.restore();
  ctx.font = `15px ${FONTS.hand}`;
  ctx.fillStyle = PALETTE.parchment;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(UI_TEXT.rotate, cx, cy + 14);
}

/** Corpses lie flat underneath; towers, enemies and knights are drawn back-to-front by y. */
function drawActors(ctx: CanvasRenderingContext2D, state: GameState, alpha: number): void {
  sortList.length = 0;
  for (const c of state.corpses) sortList.push({ y: c.y - 0.5, type: 'corpse', ref: c });
  for (const t of state.towers) sortList.push({ y: t.y, type: 'tower', ref: t });
  for (const e of state.enemies) sortList.push({ y: lerp(e.prevY, e.y, alpha), type: 'enemy', ref: e });
  for (const k of state.knights) if (k.alive) sortList.push({ y: lerp(k.prevY, k.y, alpha), type: 'knight', ref: k });
  sortList.sort((a, b) => a.y - b.y);

  for (const item of sortList) {
    switch (item.type) {
      case 'corpse':
        drawCorpse(ctx, item.ref);
        break;
      case 'tower':
        drawTower(ctx, item.ref, state.time);
        break;
      case 'enemy':
        drawEnemy(ctx, state, item.ref, alpha);
        break;
      case 'knight':
        drawKnight(ctx, state, item.ref, alpha);
        break;
    }
  }
}

function drawKnight(ctx: CanvasRenderingContext2D, state: GameState, k: Knight, alpha: number): void {
  const x = lerp(k.prevX, k.x, alpha);
  const y = lerp(k.prevY, k.y, alpha);
  const target = k.targetId === null ? undefined : state.enemies.find((e) => e.id === k.targetId);
  const fighting = target !== undefined && target.blocked && target.blockerId === k.id;
  const moving = Math.hypot(k.x - k.prevX, k.y - k.prevY) > 0.01;
  drawStickFigure(ctx, {
    kind: 'knight',
    x,
    y,
    scale: 1,
    phase: moving ? k.walkPhase : state.time * 2 + k.id,
    facing: k.facing,
    pose: fighting ? 'fight' : moving ? 'walk' : 'idle',
    seed: k.id,
    // Two-frame bonk: sword down just after a hit, raised while winding up the next.
    swing: state.time - k.swungAt < 0.2 ? 0 : 1,
  });
  if (k.hp < k.maxHp) drawHealthBar(ctx, x, y - FIGURE_HEIGHT - 5, k.hp / k.maxHp);
}

function drawProjectiles(ctx: CanvasRenderingContext2D, state: GameState, alpha: number): void {
  for (const p of state.projectiles) drawProjectile(ctx, p, alpha);
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile, alpha: number): void {
  const x = lerp(p.prevX, p.x, alpha);
  const y = lerp(p.prevY, p.y, alpha);
  if (p.kind === 'boulder') {
    const h = lerp(p.prevHeight, p.height, alpha);
    ctx.beginPath();
    ctx.ellipse(x, y, 5 - Math.min(3, h / 30), 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40, 28, 16, 0.25)';
    ctx.fill();
    ctx.beginPath();
    inkCircle(ctx, x, y - h, 4.5, p.id);
    ctx.fillStyle = '#B9A88A';
    ctx.fill();
    strokeInk(ctx, LINE.detail);
    return;
  }
  const dx = p.aimX - x;
  const dy = p.aimY - y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  if (p.kind === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(x - ux * 9, y - uy * 9);
    ctx.lineTo(x, y);
    ctx.moveTo(x - ux * 3 - uy * 2, y - uy * 3 + ux * 2);
    ctx.lineTo(x, y);
    ctx.lineTo(x - ux * 3 + uy * 2, y - uy * 3 - ux * 2);
    ctx.moveTo(x - ux * 9 - uy * 1.5, y - uy * 9 + ux * 1.5);
    ctx.lineTo(x - ux * 7, y - uy * 7);
    strokeInk(ctx, 1.3);
    return;
  }
  // Wizard bolt: a blue orb with a short trail.
  ctx.beginPath();
  ctx.moveTo(x - ux * 10, y - uy * 10);
  ctx.lineTo(x, y);
  strokeInk(ctx, 2.2, 'rgba(62, 94, 140, 0.45)');
  ctx.beginPath();
  ctx.arc(x, y, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.slow;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Boulder landings: a dashed ring that spreads and fades. */
function drawImpacts(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const i of state.impacts) {
    const k = Math.min(1, (state.time - i.at) / IMPACT_SEC);
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.beginPath();
    inkDashedCircle(ctx, i.x, i.y, i.radius * (0.35 + 0.65 * k), 14, Math.floor(i.at * 60));
    strokeInk(ctx, LINE.detail);
    ctx.restore();
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, state: GameState, e: Enemy, alpha: number): void {
  const def = enemyDef(e.kind);
  const x = lerp(e.prevX, e.x, alpha);
  const y = lerp(e.prevY, e.y, alpha);
  drawStickFigure(ctx, {
    kind: e.kind,
    x,
    y,
    scale: def.scale,
    phase: e.walkPhase,
    facing: e.facing,
    pose: e.blocked ? 'fight' : 'walk',
    seed: e.id,
    swing: (Math.floor((state.time + e.id * 0.37) * 3) % 2) as 0 | 1,
    enraged: isEnraged(e),
  });
  if (e.slowTimer > 0) drawSlowMark(ctx, x, y - FIGURE_HEIGHT * def.scale - 2, state.time, e.id);
  if (e.hp < e.maxHp && e.kind !== 'reginald') drawHealthBar(ctx, x, y - FIGURE_HEIGHT * def.scale - 5, e.hp / e.maxHp);
}

function drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, frac: number): void {
  const w = 18;
  ctx.fillStyle = 'rgba(27, 20, 16, 0.7)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 4);
  ctx.fillStyle = PALETTE.blood;
  ctx.fillRect(x - w / 2, y, w * Math.max(0, frac), 2);
}

/** Little blue swirl over slowed enemies. */
function drawSlowMark(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, seed: number): void {
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = time * 4 + k * ((Math.PI * 2) / 3);
    const px = x + Math.cos(a) * 7;
    const py = y + Math.sin(a) * 2.2;
    inkLine(ctx, px - 1.2, py, px + 1.2, py, seed + k);
  }
  strokeInk(ctx, 2, PALETTE.slow);
}

function corpseScale(c: Corpse): number {
  return c.kind === 'knight' ? 1 : enemyDef(c.kind).scale;
}

function drawCorpse(ctx: CanvasRenderingContext2D, c: Corpse): void {
  const pose = deathPose(c.t, c.quip !== null, c.squashed);
  drawStickFigure(ctx, {
    kind: c.kind,
    x: c.x,
    y: c.y - pose.lift,
    scale: corpseScale(c),
    phase: 0,
    facing: c.facing,
    pose: 'idle',
    seed: c.id,
    tip: pose.tip,
    squash: pose.squash,
    alpha: pose.alpha,
  });
}

/** Death quips and the boss's entry line, drawn above everything on the field. */
function drawBubbles(ctx: CanvasRenderingContext2D, state: GameState, alpha: number): void {
  for (const c of state.corpses) {
    if (!c.quip || c.t < DEATH.tipSec + DEATH.bounceSec * 0.5) continue;
    const pose = deathPose(c.t, true, c.squashed);
    const lift = (c.t - DEATH.tipSec) * 4;
    drawBubble(ctx, c.quip, c.x, c.y - 18 * corpseScale(c) - Math.min(lift, 6), pose.alpha, 11);
  }
  if (state.bossLine) {
    const boss = state.enemies.find((e) => e.kind === 'reginald');
    if (boss) {
      const x = lerp(boss.prevX, boss.x, alpha);
      const y = lerp(boss.prevY, boss.y, alpha);
      const fade = Math.min(1, (state.bossLine.until - state.time) / 0.4);
      drawBubble(ctx, state.bossLine.text, x, y - FIGURE_HEIGHT * enemyDef('reginald').scale - 14, fade, 14);
    }
  }
}

/** Speech bubble whose tail points down at (x, y). Clamped to stay on screen. */
export function drawBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  alpha: number,
  fontSize: number,
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${fontSize}px ${FONTS.hand}`;
  const w = ctx.measureText(text).width + 14;
  const h = fontSize + 10;
  const bx = Math.max(4, Math.min(LOGICAL_WIDTH - w - 4, x - w / 2));
  const by = Math.max(52, y - h - 6);
  const tipX = Math.max(bx + 8, Math.min(bx + w - 8, x));
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, 7);
  ctx.moveTo(tipX - 5, by + h);
  ctx.lineTo(tipX, by + h + 6);
  ctx.lineTo(tipX + 4, by + h);
  ctx.fillStyle = PALETTE.panel;
  ctx.fill();
  ctx.lineWidth = LINE.detail;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + w / 2, by + h / 2 + 1);
  ctx.restore();
}
