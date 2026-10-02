import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../sim/constants';

/** How the 960×540 logical stage maps into the CSS box of the canvas (letterboxed, aspect preserved). */
export interface Viewport {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
  /** CSS px per logical px. */
  scale: number;
  /** CSS px from the canvas edge to the stage. */
  offsetX: number;
  offsetY: number;
}

export function computeViewport(cssWidth: number, cssHeight: number, dpr: number): Viewport {
  const scale = Math.max(0.01, Math.min(cssWidth / LOGICAL_WIDTH, cssHeight / LOGICAL_HEIGHT));
  return {
    cssWidth,
    cssHeight,
    dpr,
    scale,
    offsetX: (cssWidth - LOGICAL_WIDTH * scale) / 2,
    offsetY: (cssHeight - LOGICAL_HEIGHT * scale) / 2,
  };
}

/** Device pixels per logical px (what offscreen caches should be rendered at). */
export function pixelScale(vp: Viewport): number {
  return vp.scale * vp.dpr;
}

export function cssToLogical(vp: Viewport, cssX: number, cssY: number): { x: number; y: number } {
  return { x: (cssX - vp.offsetX) / vp.scale, y: (cssY - vp.offsetY) / vp.scale };
}

/** Sets the context transform so drawing uses logical coordinates. */
export function applyLogicalTransform(ctx: CanvasRenderingContext2D, vp: Viewport): void {
  const s = vp.scale * vp.dpr;
  ctx.setTransform(s, 0, 0, s, vp.offsetX * vp.dpr, vp.offsetY * vp.dpr);
}
