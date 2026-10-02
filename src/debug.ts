import { restartSession, type Session } from './session';
import { autopilotStep, createAutopilot } from './sim/autopilot';
import { debugKillAll, debugSkipToWave } from './sim/commands';
import { SIM_DT } from './sim/constants';
import { placeOnPath, spawnEnemy } from './sim/enemies';
import { nextRange } from './sim/rng';
import { isOver, snapshotPrev, step } from './sim/step';
import { buildTower } from './sim/towers';
import type { EnemyKind, GameState, TowerKind } from './sim/types';
import { callNextWave } from './sim/waves';

/** Dev-only automation surface for Playwright. Imported behind import.meta.env.DEV, so it never ships. */
export interface DebugHook {
  readonly state: GameState;
  readonly seed: number;
  setSpeed(n: number): void;
  skipToWave(n: number): void;
  addGold(n: number): void;
  callWave(): number;
  killAll(): void;
  build(slot: number, kind: TowerKind): boolean;
  /** Steps the sim synchronously (ignores pause and speed); useful when rAF is throttled. */
  advance(seconds: number): void;
  /** Scripted decent player (see sim/autopilot.ts) runs before every sim step while on. */
  autopilot(on: boolean): void;
  /** Spawns n mixed regular enemies spread along the road (perf testing). */
  crowd(n: number): void;
  /** Renders n frames back to back and reports the cost per frame in ms. */
  bench(frames: number): { avgMs: number; maxMs: number; enemies: number };
  restart(seed?: number): void;
}

declare global {
  interface Window {
    __td?: DebugHook;
  }
}

type StepHook = ((state: GameState) => void) | undefined;

export function installDebugHook(session: Session, setBeforeStep: (fn: StepHook) => void, renderOnce: () => void): void {
  let beforeStep: StepHook;
  const setHook = (fn: StepHook) => {
    beforeStep = fn;
    setBeforeStep(fn);
  };

  window.__td = {
    get state() {
      return session.state;
    },
    get seed() {
      return session.state.seed;
    },
    setSpeed(n: number) {
      session.state.speed = Math.max(1, Math.min(16, Math.floor(n)));
    },
    skipToWave(n: number) {
      if (isOver(session.state)) restartSession(session);
      debugSkipToWave(session.state, n);
    },
    addGold(n: number) {
      session.state.gold += Math.floor(n);
    },
    callWave() {
      return callNextWave(session.state);
    },
    killAll() {
      debugKillAll(session.state);
    },
    build(slot: number, kind: TowerKind) {
      return buildTower(session.state, slot, kind) !== null;
    },
    advance(seconds: number) {
      const state = session.state;
      for (let i = 0; i < Math.round(seconds / SIM_DT) && !isOver(state); i++) {
        snapshotPrev(state);
        beforeStep?.(state);
        step(state, SIM_DT);
      }
    },
    autopilot(on: boolean) {
      if (!on) {
        setHook(undefined);
        return;
      }
      const pilot = createAutopilot();
      const pilotedGame = session.state;
      setHook((s) => {
        if (s === pilotedGame) autopilotStep(s, pilot); // a restart detaches the pilot
      });
    },
    crowd(n: number) {
      const state = session.state;
      if (state.phase === 'ready') state.phase = 'playing';
      const kinds: EnemyKind[] = ['peasant', 'squire', 'tinCan', 'bard'];
      for (let i = 0; i < n; i++) {
        const e = spawnEnemy(state, kinds[i % kinds.length]!);
        e.dist = nextRange(state.rng, 0, state.path.length * 0.92);
        placeOnPath(state, e);
        e.prevX = e.x;
        e.prevY = e.y;
      }
    },
    bench(frames: number) {
      let total = 0;
      let max = 0;
      for (let i = 0; i < frames; i++) {
        const t0 = performance.now();
        renderOnce();
        const dt = performance.now() - t0;
        total += dt;
        max = Math.max(max, dt);
      }
      return { avgMs: total / frames, maxMs: max, enemies: session.state.enemies.length };
    },
    restart(seed?: number) {
      restartSession(session, seed);
    },
  };
}
