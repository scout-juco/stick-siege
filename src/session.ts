import { createUi, type UiState } from './input/ui-state';
import { createClock, type Clock } from './sim/clock';
import { createGame } from './sim/state';
import type { GameState } from './sim/types';

/** Everything one play-through owns. Restart swaps the state but keeps the session object. */
export interface Session {
  state: GameState;
  clock: Clock;
  ui: UiState;
  /** Fixed seed from ?seed=, or null to roll a fresh one each restart. */
  pinnedSeed: number | null;
}

export function rollSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000_000;
}

export function createSession(pinnedSeed: number | null): Session {
  return {
    state: createGame(pinnedSeed ?? rollSeed()),
    clock: createClock(),
    ui: createUi(),
    pinnedSeed,
  };
}

export function restartSession(session: Session, seed?: number): void {
  const speed = session.state.speed;
  session.state = createGame(seed ?? session.pinnedSeed ?? rollSeed());
  session.state.speed = speed;
  session.clock = createClock();
  session.ui = createUi();
}
