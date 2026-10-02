import { FONTS, LINE, PALETTE } from '../data/art';
import { LOSE_TEXT, LOSE_TITLE, UI_TEXT, WIN_TEXT, WIN_TITLE } from '../data/copy';
import { enemies } from '../data/enemies';
import { BANNER, BOSS_BAR, END_SCREEN, HUD, inRect, PAUSE_SCREEN, RADIAL, type Rect } from '../data/layout';
import { displayRange, towers } from '../data/towers';
import { TOTAL_WAVES, waves } from '../data/waves';
import { menuFor } from '../input/controls';
import type { Session } from '../session';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../sim/constants';
import { canAfford } from '../sim/towers';
import type { GameState } from '../sim/types';
import { canCallWave, earlyCallBonus } from '../sim/waves';
import { inkCircle, inkDashedCircle, inkLine, inkPolyline, inkRoundRect, strokeInk } from './ink';
import { drawStickFigure } from './stickfigure';
import { drawTowerIcon } from './towers';

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeOutBack = (t: number) => {
  const c = 1.6;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  opts: { align?: CanvasTextAlign; color?: string; bold?: boolean; font?: string } = {},
): void {
  ctx.font = `${opts.bold ? 'bold ' : ''}${size}px ${opts.font ?? FONTS.title}`;
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = opts.color ?? PALETTE.ink;
  ctx.fillText(s, x, y);
}

function hovered(session: Session, r: Rect): boolean {
  return session.ui.hovering && inRect(r, session.ui.hoverX, session.ui.hoverY);
}

// ---------------------------------------------------------------- icons

export function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  inkCircle(ctx, x, y, r, 7);
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
  strokeInk(ctx, LINE.detail);
  ctx.beginPath();
  inkCircle(ctx, x, y, r * 0.58, 8);
  strokeInk(ctx, 1, 'rgba(27, 20, 16, 0.5)');
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.95);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.1, x - r * 0.7, y - r * 1.3, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.1, x, y + r * 0.95);
  ctx.fillStyle = PALETTE.blood;
  ctx.fill();
  ctx.lineWidth = LINE.detail;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function button(ctx: CanvasRenderingContext2D, r: Rect, enabled: boolean, hot: boolean, accent: boolean, seed: number): void {
  ctx.beginPath();
  ctx.roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 8);
  ctx.fillStyle = accent ? 'rgba(201, 162, 39, 0.35)' : hot && enabled ? 'rgba(201, 162, 39, 0.18)' : 'rgba(255, 248, 225, 0.55)';
  ctx.fill();
  ctx.beginPath();
  inkRoundRect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 8, seed);
  strokeInk(ctx, enabled ? 2 : 1.4, enabled ? PALETTE.ink : PALETTE.disabled);
}

// ---------------------------------------------------------------- HUD

export function drawHud(ctx: CanvasRenderingContext2D, session: Session, nowMs: number): void {
  const { state } = session;
  ctx.fillStyle = 'rgba(239, 226, 191, 0.94)';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, HUD.height);
  ctx.beginPath();
  inkLine(ctx, 0, HUD.height, LOGICAL_WIDTH, HUD.height, 3);
  strokeInk(ctx, 2);

  drawCoin(ctx, HUD.gold.x + 10, HUD.gold.y, 10);
  text(ctx, String(Math.floor(state.gold)), HUD.gold.x + 26, HUD.gold.y + 1, 21, { bold: true });
  drawHeart(ctx, HUD.lives.x + 10, HUD.lives.y, 9);
  text(ctx, String(state.lives), HUD.lives.x + 26, HUD.lives.y + 1, 21, { bold: true, color: state.lives <= 5 ? PALETTE.blood : PALETTE.ink });
  text(ctx, `Wave ${Math.max(1, state.waveNumber)}/${TOTAL_WAVES}`, HUD.wave.x, HUD.wave.y + 1, 19, { bold: true });

  // Call-wave / countdown button.
  const callable = canCallWave(state);
  const cw = HUD.callWave;
  button(ctx, cw, callable, hovered(session, cw), state.phase === 'ready', 21);
  const midY = cw.y + cw.h / 2;
  if (state.phase === 'ready') {
    playIcon(ctx, cw.x + 26, midY, 7);
    text(ctx, `${UI_TEXT.startWave} 1`, cw.x + cw.w / 2 + 10, midY + 1, 17, { align: 'center', bold: true });
  } else if (state.countdown !== null && callable) {
    const next = state.waveNumber + 1;
    const secs = Math.max(0, Math.ceil(state.countdown));
    playIcon(ctx, cw.x + 22, midY, 6);
    text(ctx, `Wave ${next} in ${secs}s`, cw.x + cw.w / 2 + 8, midY - 8, 14, { align: 'center', bold: true });
    text(ctx, `Call early: +${earlyCallBonus(state.countdown)} gold`, cw.x + cw.w / 2 + 8, midY + 9, 12, {
      align: 'center',
      color: '#6B5317',
    });
  } else {
    const label = state.waveNumber >= TOTAL_WAVES ? UI_TEXT.finalWave : UI_TEXT.waveInProgress;
    text(ctx, label, cw.x + cw.w / 2, midY + 1, 15, { align: 'center', color: PALETTE.disabled, font: FONTS.hand });
  }

  // Speed toggle.
  const sp = HUD.speed;
  button(ctx, sp, true, hovered(session, sp), state.speed > 1, 22);
  text(ctx, `${state.speed}×`, sp.x + sp.w / 2, sp.y + sp.h / 2 + 1, 18, { align: 'center', bold: true });

  // Pause / play.
  const pa = HUD.pause;
  button(ctx, pa, true, hovered(session, pa), state.paused, 23);
  const px = pa.x + pa.w / 2;
  const py = pa.y + pa.h / 2;
  if (state.paused) {
    playIcon(ctx, px + 2, py, 8);
  } else {
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(px - 7, py - 8, 5, 16);
    ctx.fillRect(px + 2, py - 8, 5, 16);
  }

  drawToast(ctx, session, nowMs);
}

function playIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x - r * 0.7, y + r);
  ctx.closePath();
  ctx.fillStyle = PALETTE.ink;
  ctx.fill();
}

function drawToast(ctx: CanvasRenderingContext2D, session: Session, nowMs: number): void {
  const toast = session.ui.toast;
  if (!toast) return;
  const age = (nowMs - toast.atMs) / 1000;
  if (age > 1.8) {
    session.ui.toast = null;
    return;
  }
  ctx.save();
  ctx.globalAlpha = Math.min(1, (1.8 - age) / 0.5);
  const cw = HUD.callWave;
  const x = cw.x + cw.w / 2;
  const y = HUD.height + 18 + age * 6;
  ctx.font = `bold 14px ${FONTS.title}`;
  const w = ctx.measureText(toast.text).width + 34;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 12, w, 24, 12);
  ctx.fillStyle = PALETTE.panel;
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  drawCoin(ctx, x - w / 2 + 14, y, 6);
  text(ctx, toast.text, x + 8, y + 1, 14, { align: 'center', bold: true, color: '#6B5317' });
  ctx.restore();
}

// ---------------------------------------------------------------- build menu

export function drawRadialMenu(ctx: CanvasRenderingContext2D, session: Session, nowMs: number): void {
  const { state, ui } = session;
  if (ui.selectedSlot === null) return;
  const { cx, cy, options } = menuFor(state, ui.selectedSlot);
  const pop = easeOutBack(Math.min(1, (nowMs - ui.openedAtMs) / 160));

  ctx.beginPath();
  inkDashedCircle(ctx, cx, cy, RADIAL.radius * pop, 22, 31);
  strokeInk(ctx, 1.4, PALETTE.inkFaint);

  for (const o of options) {
    const def = towers[o.kind];
    const affordable = canAfford(state, o.kind);
    let x = cx + (o.x - cx) * pop;
    const y = cy + (o.y - cy) * pop;
    if (ui.denied?.kind === o.kind && nowMs - ui.denied.atMs < 320) {
      x += Math.sin(((nowMs - ui.denied.atMs) / 320) * Math.PI * 6) * 3;
    }
    const hot = ui.hovering && Math.hypot(ui.hoverX - o.x, ui.hoverY - o.y) <= RADIAL.optionRadius;
    const r = RADIAL.optionRadius;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = affordable ? (hot ? '#F6E7B8' : PALETTE.panel) : '#DDD3BA';
    ctx.fill();
    ctx.beginPath();
    inkCircle(ctx, x, y, r, 40 + o.kind.length);
    strokeInk(ctx, hot && affordable ? 2.8 : 2.2, affordable ? PALETTE.ink : PALETTE.disabled);

    ctx.save();
    if (!affordable) ctx.globalAlpha = 0.35;
    drawTowerIcon(ctx, o.kind, x, y - 3, 34, state.time);
    ctx.restore();

    // Cost tag hanging under the option.
    const ty = y + r + 2;
    ctx.beginPath();
    ctx.roundRect(x - 19, ty - 7, 38, 15, 7);
    ctx.fillStyle = affordable ? PALETTE.panel : '#F1D9D0';
    ctx.fill();
    ctx.strokeStyle = affordable ? PALETTE.ink : PALETTE.blood;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    drawCoin(ctx, x - 10, ty, 4.2);
    text(ctx, String(def.cost), x + 4, ty + 1, 12, { align: 'center', bold: true, color: affordable ? PALETTE.ink : PALETTE.blood });

    if (hot) {
      const label = def.name;
      ctx.font = `bold 13px ${FONTS.title}`;
      const w = ctx.measureText(label).width + 14;
      const ly = y - r - 13;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, ly - 9, w, 18, 6);
      ctx.fillStyle = PALETTE.panel;
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1;
      ctx.stroke();
      text(ctx, label, x, ly + 1, 13, { align: 'center', bold: true });
    }
  }
}

// ---------------------------------------------------------------- selection

/** Range ring on the ground under the selected tower. */
export function drawSelectionRing(ctx: CanvasRenderingContext2D, session: Session): void {
  const { state, ui } = session;
  const tower = state.towers.find((t) => t.id === ui.selectedTowerId);
  if (!tower) return;
  const r = displayRange(tower.kind);
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(201, 162, 39, 0.12)';
  ctx.fill();
  ctx.beginPath();
  inkDashedCircle(ctx, tower.x, tower.y, r, Math.round(r / 7), 77);
  strokeInk(ctx, 2.2, PALETTE.gold);

  const def = towers[tower.kind];
  if (def.kind !== 'barracks' && def.minRange > 0) {
    ctx.beginPath();
    inkDashedCircle(ctx, tower.x, tower.y, def.minRange, 12, 78);
    strokeInk(ctx, 1.6, 'rgba(158, 27, 27, 0.6)');
  }
  if (def.kind === 'barracks') {
    ctx.beginPath();
    inkDashedCircle(ctx, tower.rallyX, tower.rallyY, def.engageRadius, 14, 79);
    strokeInk(ctx, 1.4, 'rgba(158, 27, 27, 0.5)');
    // Rally flag.
    ctx.beginPath();
    inkLine(ctx, tower.rallyX, tower.rallyY, tower.rallyX, tower.rallyY - 18, 80);
    strokeInk(ctx, LINE.detail);
    const flag = [tower.rallyX, tower.rallyY - 18, tower.rallyX + 10, tower.rallyY - 15, tower.rallyX, tower.rallyY - 12];
    ctx.beginPath();
    ctx.moveTo(flag[0]!, flag[1]!);
    ctx.lineTo(flag[2]!, flag[3]!);
    ctx.lineTo(flag[4]!, flag[5]!);
    ctx.closePath();
    ctx.fillStyle = PALETTE.blood;
    ctx.fill();
  }
}

/** Name tag above the selected tower. */
export function drawSelectionLabel(ctx: CanvasRenderingContext2D, session: Session): void {
  const { state, ui } = session;
  const tower = state.towers.find((t) => t.id === ui.selectedTowerId);
  if (!tower) return;
  const name = towers[tower.kind].name;
  ctx.font = `bold 14px ${FONTS.title}`;
  const w = ctx.measureText(name).width + 18;
  const x = Math.max(w / 2 + 4, Math.min(LOGICAL_WIDTH - w / 2 - 4, tower.x));
  const y = Math.max(HUD.height + 16, tower.y - 56);
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 11, w, 22, 8);
  ctx.fillStyle = PALETTE.panel;
  ctx.fill();
  ctx.beginPath();
  inkRoundRect(ctx, x - w / 2, y - 11, w, 22, 8, 81);
  strokeInk(ctx, 1.6, PALETTE.gold);
  text(ctx, name, x, y + 1, 14, { align: 'center', bold: true });
}

// ---------------------------------------------------------------- wave banner

/** A scroll slides down at the start of each wave with its title. Driven by sim time, so it pauses too. */
export function drawWaveBanner(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.waveNumber === 0) return;
  const t = state.time - state.waveStartedAt;
  const { slideSec, holdSec, w, h } = BANNER;
  const total = slideSec * 2 + holdSec;
  if (t < 0 || t > total) return;
  const k = t < slideSec ? easeOut(t / slideSec) : t > slideSec + holdSec ? 1 - easeOut((t - slideSec - holdSec) / slideSec) : 1;
  const y = -h - 12 + k * (BANNER.y + h + 12);
  const x = LOGICAL_WIDTH / 2 - w / 2;
  drawScroll(ctx, x, y, w, h);
  const title = waves[state.waveNumber - 1]?.title ?? '';
  text(ctx, `Wave ${state.waveNumber} of ${TOTAL_WAVES}`, LOGICAL_WIDTH / 2, y + 17, 13, { align: 'center', color: '#5C4630' });
  text(ctx, `“${title}”`, LOGICAL_WIDTH / 2, y + 38, 22, { align: 'center', bold: true });
}

function drawScroll(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const body = [x + 14, y, x + w - 14, y, x + w - 14, y + h, x + 14, y + h];
  ctx.beginPath();
  ctx.rect(x + 14, y, w - 28, h);
  ctx.fillStyle = PALETTE.panel;
  ctx.fill();
  ctx.beginPath();
  inkPolyline(ctx, body, 91, true);
  strokeInk(ctx, LINE.outline);
  for (const ex of [x + 8, x + w - 8]) {
    ctx.beginPath();
    ctx.roundRect(ex - 8, y - 5, 16, h + 10, 7);
    ctx.fillStyle = '#E2CF9C';
    ctx.fill();
    ctx.beginPath();
    inkRoundRect(ctx, ex - 8, y - 5, 16, h + 10, 7, 92 + ex);
    strokeInk(ctx, LINE.outline - 0.5);
    ctx.beginPath();
    ctx.arc(ex, y + 2, 3, 0, Math.PI * 1.6);
    strokeInk(ctx, 1.2);
  }
}

// ---------------------------------------------------------------- boss

/** Sir Reginald's health bar, pinned under the HUD while he lives. */
export function drawBossBar(ctx: CanvasRenderingContext2D, state: GameState): void {
  const boss = state.enemies.find((e) => e.kind === 'reginald' && e.hp > 0);
  if (!boss) return;
  const { x, y, w, h } = BOSS_BAR;
  ctx.beginPath();
  ctx.roundRect(x - 34, y - 6, w + 46, h + 30, 9);
  ctx.fillStyle = 'rgba(239, 226, 191, 0.92)';
  ctx.fill();
  ctx.beginPath();
  inkRoundRect(ctx, x - 34, y - 6, w + 46, h + 30, 9, 71);
  strokeInk(ctx, 1.6);
  drawMiniCrown(ctx, x - 17, y + 13);
  text(ctx, enemies.reginald.name, x + w / 2, y + 3, 12, { align: 'center', bold: true });
  const by = y + 12;
  ctx.fillStyle = 'rgba(27, 20, 16, 0.75)';
  ctx.fillRect(x, by, w, h);
  ctx.fillStyle = PALETTE.blood;
  ctx.fillRect(x + 2, by + 2, (w - 4) * Math.max(0, boss.hp / boss.maxHp), h - 4);
  ctx.beginPath();
  inkRoundRect(ctx, x, by, w, h, 3, 72);
  strokeInk(ctx, 1.4);
}

function drawMiniCrown(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const pts = [x - 9, y + 5, x - 10, y - 6, x - 4, y - 1, x, y - 9, x + 4, y - 1, x + 10, y - 6, x + 9, y + 5];
  ctx.beginPath();
  ctx.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
  ctx.closePath();
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
  ctx.beginPath();
  inkPolyline(ctx, pts, 73, true);
  strokeInk(ctx, LINE.detail);
}

// ---------------------------------------------------------------- end screens

function wrap(ctx: CanvasRenderingContext2D, s: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of s.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Win or lose panel with the waves survived and a Restart button. */
export function drawEndScreen(ctx: CanvasRenderingContext2D, session: Session, nowMs: number): void {
  const { state, ui } = session;
  if (state.phase !== 'won' && state.phase !== 'lost') return;
  ui.endShownAtMs ??= nowMs;
  // Short, small drop so the Restart button is (nearly) where its hit box is from the first frame.
  const k = easeOut(Math.min(1, (nowMs - ui.endShownAtMs) / 300));
  const won = state.phase === 'won';

  ctx.save();
  ctx.globalAlpha = Math.min(1, (nowMs - ui.endShownAtMs) / 250);
  ctx.fillStyle = PALETTE.overlay;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.restore();

  const p = END_SCREEN.panel;
  ctx.save();
  ctx.translate(0, (1 - k) * -24);
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, p.w, p.h, 14);
  ctx.fillStyle = PALETTE.panel;
  ctx.fill();
  ctx.beginPath();
  inkRoundRect(ctx, p.x, p.y, p.w, p.h, 14, 51);
  strokeInk(ctx, LINE.outline);
  ctx.beginPath();
  inkRoundRect(ctx, p.x + 8, p.y + 8, p.w - 16, p.h - 16, 10, 52);
  strokeInk(ctx, 1, won ? PALETTE.gold : PALETTE.blood);

  const cx = p.x + p.w / 2;
  text(ctx, won ? WIN_TITLE : LOSE_TITLE, cx, p.y + 48, 34, { align: 'center', bold: true, color: won ? '#6B5317' : PALETTE.blood });
  ctx.font = `17px ${FONTS.hand}`;
  const lines = wrap(ctx, won ? WIN_TEXT : LOSE_TEXT, p.w - 180);
  for (const [i, line] of lines.entries()) {
    text(ctx, line, cx + 40, p.y + 104 + i * 26, 17, { align: 'center', font: FONTS.hand });
  }

  // A witness to history.
  const t = nowMs / 1000;
  if (won) {
    drawStickFigure(ctx, { kind: 'knight', x: p.x + 82, y: p.y + 196, scale: 2.2, phase: 0, facing: 1, pose: 'fight', seed: 5, swing: (Math.floor(t * 2.5) % 2) as 0 | 1 });
  } else {
    drawStickFigure(ctx, { kind: 'peasant', x: p.x + 82, y: p.y + 196, scale: 2.2, phase: t * 2, facing: 1, pose: 'idle', seed: 6 });
    text(ctx, '?', p.x + 104, p.y + 98 + Math.sin(t * 3) * 3, 26, { align: 'center', bold: true, font: FONTS.hand });
  }

  const survived = won ? TOTAL_WAVES : Math.max(0, state.waveNumber - 1);
  text(ctx, UI_TEXT.wavesSurvived(survived), cx + 40, p.y + 190, 18, { align: 'center', bold: true });
  if (won) text(ctx, UI_TEXT.livesLeft(state.lives), cx + 40, p.y + 214, 15, { align: 'center' });

  const r = END_SCREEN.restart;
  const hot = hovered(session, r);
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 10);
  ctx.fillStyle = hot ? '#F6E7B8' : '#F4E9CC';
  ctx.fill();
  ctx.beginPath();
  inkRoundRect(ctx, r.x, r.y, r.w, r.h, 10, 53);
  strokeInk(ctx, 2.4);
  text(ctx, UI_TEXT.restart, r.x + r.w / 2, r.y + r.h / 2 + 1, 22, { align: 'center', bold: true });
  ctx.restore();
}

// ---------------------------------------------------------------- pause

export function drawPauseOverlay(ctx: CanvasRenderingContext2D, session: Session): void {
  ctx.fillStyle = PALETTE.overlay;
  ctx.fillRect(0, HUD.height + 1, LOGICAL_WIDTH, LOGICAL_HEIGHT - HUD.height);
  text(ctx, UI_TEXT.paused, LOGICAL_WIDTH / 2, 230, 44, { align: 'center', bold: true, color: PALETTE.panel });
  const r = PAUSE_SCREEN.resume;
  button(ctx, r, true, hovered(session, r), false, 61);
  ctx.beginPath();
  ctx.roundRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 8);
  ctx.fillStyle = PALETTE.panel;
  ctx.fill();
  playIcon(ctx, r.x + 34, r.y + r.h / 2, 8);
  text(ctx, UI_TEXT.resume, r.x + r.w / 2 + 12, r.y + r.h / 2 + 1, 20, { align: 'center', bold: true });
}
