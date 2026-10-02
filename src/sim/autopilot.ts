import { buildTower } from './towers';
import type { GameState, TowerKind } from './types';
import { callNextWave } from './waves';

/**
 * A scripted "decent player" for balance checks: builds a fixed order of towers as soon as
 * each is affordable, starts wave 1 once the opening towers are down, and never calls early.
 * Dev tooling only (tests and the dev hook); not referenced by the game itself.
 */
export interface BuildStep {
  slot: number;
  kind: TowerKind;
}

export const DECENT_BUILD_ORDER: readonly BuildStep[] = [
  { slot: 6, kind: 'archer' },
  { slot: 4, kind: 'archer' },
  { slot: 1, kind: 'barracks' },
  { slot: 7, kind: 'wizard' },
  { slot: 2, kind: 'catapult' },
  { slot: 8, kind: 'archer' },
  { slot: 9, kind: 'wizard' },
  { slot: 11, kind: 'catapult' },
  { slot: 10, kind: 'barracks' },
  { slot: 3, kind: 'archer' },
  { slot: 5, kind: 'wizard' },
  { slot: 0, kind: 'archer' },
];

export interface Autopilot {
  order: readonly BuildStep[];
  next: number;
}

export function createAutopilot(order: readonly BuildStep[] = DECENT_BUILD_ORDER): Autopilot {
  return { order, next: 0 };
}

/** Call once per sim step. */
export function autopilotStep(state: GameState, pilot: Autopilot): void {
  while (pilot.next < pilot.order.length) {
    const step = pilot.order[pilot.next]!;
    if (state.towers.some((t) => t.slot === step.slot)) {
      pilot.next++;
      continue;
    }
    if (!buildTower(state, step.slot, step.kind)) break;
    pilot.next++;
  }
  // Wave 1 waits for the player; start it once the opening build can't be extended.
  if (state.phase === 'ready') callNextWave(state);
}
