import { handleHover, handleTap, isInteractiveAt } from './input/controls';
import { attachPointer } from './input/pointer';
import { renderFrame } from './render/scene';
import { computeViewport, type Viewport } from './render/viewport';
import { createSession, type Session } from './session';
import { advanceClock } from './sim/clock';
import { tick } from './sim/step';
import type { GameState } from './sim/types';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Stick Siege: #game canvas missing');
const ctx = canvas.getContext('2d', { alpha: false });
if (!ctx) throw new Error('Stick Siege: 2D canvas unavailable');

const params = new URLSearchParams(location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const session: Session = createSession(Number.isFinite(seedParam) ? seedParam : null);

/** Dev-only hook run before every sim step (autopilot); stays undefined in prod. */
let beforeStep: ((state: GameState) => void) | undefined;

// ---------------------------------------------------------------- sizing

let viewport: Viewport = computeViewport(1, 1, 1);

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = Math.max(1, canvas!.clientWidth);
  const h = Math.max(1, canvas!.clientHeight);
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas!.width !== bw || canvas!.height !== bh) {
    canvas!.width = bw;
    canvas!.height = bh;
  }
  viewport = computeViewport(w, h, dpr);
}

resize();
new ResizeObserver(resize).observe(canvas);
window.addEventListener('resize', resize);
// DPR changes when the window moves between monitors or the page zooms.
const watchDpr = () => {
  matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
    'change',
    () => {
      resize();
      watchDpr();
    },
    { once: true },
  );
};
watchDpr();

// ---------------------------------------------------------------- input

attachPointer(canvas, () => viewport, {
  down: (x, y) => handleTap(session, x, y, performance.now()),
  hover: (x, y) => {
    handleHover(session, x, y);
    canvas.style.cursor = isInteractiveAt(session, x, y) ? 'pointer' : 'default';
  },
  leave: () => {
    session.ui.hovering = false;
  },
});

// ---------------------------------------------------------------- embedding

// The game lives in an iframe on someone else's page: pause mid-wave when the tab is hidden
// or the frame scrolls out of view, so nobody comes back to a sacked castle.
function autoPause(): void {
  if (session.state.phase === 'playing') session.state.paused = true;
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) autoPause();
});
new IntersectionObserver((entries) => {
  if (entries.some((e) => !e.isIntersecting)) autoPause();
}).observe(canvas);

// ---------------------------------------------------------------- loop

/** Dev-only full-frame replacement (the ?gallery page). */
let renderOverride: ((ctx: CanvasRenderingContext2D, vp: Viewport, nowMs: number) => void) | null = null;

let last = performance.now();
function frame(now: number): void {
  const frameSec = (now - last) / 1000;
  last = now;
  if (renderOverride) {
    renderOverride(ctx!, viewport, now);
  } else {
    const alpha = advanceClock(session.clock, frameSec, () => tick(session.state, beforeStep));
    renderFrame(ctx!, viewport, session, alpha, now);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------- dev hook

if (import.meta.env.DEV && params.has('gallery')) {
  void import('./render/gallery').then(({ renderGallery }) => {
    renderOverride = renderGallery;
  });
}

if (import.meta.env.DEV) {
  void import('./debug').then(({ installDebugHook }) => {
    installDebugHook(
      session,
      (fn) => {
        beforeStep = fn;
      },
      () => renderFrame(ctx, viewport, session, 1, performance.now()),
    );
  });
}
