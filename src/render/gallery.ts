import { FONTS, PALETTE } from '../data/art';
import { DEATH_QUIPS } from '../data/copy';
import { enemies } from '../data/enemies';
import { towers } from '../data/towers';
import { DEATH, LOGICAL_HEIGHT, LOGICAL_WIDTH, WALK_PHASE_PER_PX } from '../sim/constants';
import { inkVariantForTime, setInkVariant } from './ink';
import { deathPose, drawStickFigure, type FigureKind } from './stickfigure';
import { applyLogicalTransform, type Viewport } from './viewport';

/** Dev-only (?gallery): every figure walking in place, for checking the look of the rig. */

const LINEUP: { kind: FigureKind; name: string; speed: number }[] = [
  { kind: 'peasant', name: enemies.peasant.name, speed: enemies.peasant.speed },
  { kind: 'squire', name: enemies.squire.name, speed: enemies.squire.speed },
  { kind: 'tinCan', name: enemies.tinCan.name, speed: enemies.tinCan.speed },
  { kind: 'bard', name: enemies.bard.name, speed: enemies.bard.speed },
  { kind: 'knight', name: 'Barracks Knight', speed: towers.barracks.knight.speed },
];

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 13): void {
  ctx.font = `${size}px ${FONTS.title}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(text, x, y);
}

export function renderGallery(ctx: CanvasRenderingContext2D, vp: Viewport, nowMs: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PALETTE.letterbox;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  applyLogicalTransform(ctx, vp);
  ctx.fillStyle = PALETTE.parchment;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  setInkVariant(inkVariantForTime(nowMs));
  const t = nowMs / 1000;

  label(ctx, 'Stick Siege · figure gallery (dev only)', LOGICAL_WIDTH / 2, 24, 18);

  // Row 1: inspection scale.
  for (const [i, f] of LINEUP.entries()) {
    const x = 100 + i * 165;
    drawStickFigure(ctx, {
      kind: f.kind,
      x,
      y: 215,
      scale: 2.6,
      phase: t * f.speed * WALK_PHASE_PER_PX,
      facing: 1,
      pose: 'walk',
      seed: i + 1,
    });
    label(ctx, f.name, x, 240);
  }

  // Row 2: game scale, plus pose variants.
  label(ctx, 'game scale (1×): walk · idle · fight', 300, 285);
  for (const [i, f] of LINEUP.entries()) {
    const x = 60 + i * 48;
    drawStickFigure(ctx, { kind: f.kind, x, y: 340, scale: 1, phase: t * f.speed * WALK_PHASE_PER_PX, facing: 1, pose: 'walk', seed: 10 + i });
    drawStickFigure(ctx, { kind: f.kind, x: x + 250, y: 340, scale: 1, phase: t * 2, facing: -1, pose: 'idle', seed: 20 + i });
  }
  const swing = (Math.floor(t * 4) % 2) as 0 | 1;
  drawStickFigure(ctx, { kind: 'knight', x: 540, y: 340, scale: 1.6, phase: 0, facing: 1, pose: 'fight', seed: 31, swing });
  drawStickFigure(ctx, { kind: 'peasant', x: 572, y: 340, scale: 1.6, phase: 0, facing: -1, pose: 'fight', seed: 32, swing: swing === 0 ? 1 : 0 });
  label(ctx, 'knight bonk vs peasant', 556, 360, 11);

  drawStickFigure(ctx, {
    kind: 'bard',
    x: 700,
    y: 340,
    scale: 1.6,
    phase: t * enemies.bard.speed * 1.3 * WALK_PHASE_PER_PX,
    facing: 1,
    pose: 'walk',
    seed: 33,
    enraged: true,
  });
  label(ctx, 'bard below half HP', 700, 360, 11);

  // Row 3: comedic death loop and trampled knight.
  const cycle = DEATH.tipSec + DEATH.bounceSec + DEATH.quipHoldSec + DEATH.fadeSec + 0.6;
  const dt = t % cycle;
  const pose = deathPose(dt, true, false);
  drawStickFigure(ctx, {
    kind: 'peasant',
    x: 120,
    y: 470 - pose.lift,
    scale: 2,
    phase: 0,
    facing: 1,
    pose: 'idle',
    seed: 40,
    tip: pose.tip,
    alpha: pose.alpha,
  });
  if (dt > DEATH.tipSec + DEATH.bounceSec && pose.alpha > 0) {
    ctx.globalAlpha = pose.alpha;
    ctx.font = `13px ${FONTS.hand}`;
    ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = 'center';
    ctx.fillText(DEATH_QUIPS[Math.floor(t / cycle) % DEATH_QUIPS.length]!, 120, 420);
    ctx.globalAlpha = 1;
  }
  label(ctx, 'death: tip · bounce · quip · fade', 120, 500, 11);

  const squash = deathPose(dt, false, true);
  drawStickFigure(ctx, {
    kind: 'knight',
    x: 300,
    y: 470,
    scale: 2,
    phase: 0,
    facing: 1,
    pose: 'idle',
    seed: 41,
    squash: squash.squash,
    alpha: squash.alpha,
  });
  label(ctx, 'trampled knight', 300, 500, 11);

  // The boss, at his natural 3×.
  drawStickFigure(ctx, {
    kind: 'reginald',
    x: 760,
    y: 500,
    scale: enemies.reginald.scale,
    phase: (t * enemies.reginald.speed * WALK_PHASE_PER_PX) / enemies.reginald.scale,
    facing: 1,
    pose: 'walk',
    seed: 50,
  });
  label(ctx, enemies.reginald.name, 760, 522, 12);
}
