import type { TowerKind } from '../sim/types';

/** Presentation-only selection state. Never read by the sim. */
export interface UiState {
  /** Empty slot whose build menu is open. */
  selectedSlot: number | null;
  /** Built tower whose range ring is showing. */
  selectedTowerId: number | null;
  hoverX: number;
  hoverY: number;
  hovering: boolean;
  /** Real time (ms) the current menu/selection opened, for pop-in animation. */
  openedAtMs: number;
  /** Short-lived message, e.g. the early-call bonus. */
  toast: { text: string; atMs: number } | null;
  /** Build option tapped while unaffordable, so it can shake. */
  denied: { kind: TowerKind; atMs: number } | null;
  /** Real time the win/lose screen first appeared, for its drop-in. */
  endShownAtMs: number | null;
}

export function createUi(): UiState {
  return {
    selectedSlot: null,
    selectedTowerId: null,
    hoverX: 0,
    hoverY: 0,
    hovering: false,
    openedAtMs: 0,
    toast: null,
    denied: null,
    endShownAtMs: null,
  };
}
