import { cssToLogical, type Viewport } from '../render/viewport';

/** Pointer Events only: one code path for mouse, pen, and touch. Coordinates arrive in logical px. */
export interface PointerHandlers {
  down(x: number, y: number): void;
  /** Mouse/pen hover only. A nicety; nothing may depend on it. */
  hover(x: number, y: number): void;
  leave(): void;
}

export function attachPointer(
  canvas: HTMLCanvasElement,
  getViewport: () => Viewport,
  handlers: PointerHandlers,
): () => void {
  const toLogical = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return cssToLogical(getViewport(), e.clientX - rect.left, e.clientY - rect.top);
  };

  const onDown = (e: PointerEvent) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    const p = toLogical(e);
    handlers.down(p.x, p.y);
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const p = toLogical(e);
    handlers.hover(p.x, p.y);
  };
  const onLeave = () => handlers.leave();
  const onContextMenu = (e: Event) => e.preventDefault();

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('contextmenu', onContextMenu);
  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('contextmenu', onContextMenu);
  };
}
