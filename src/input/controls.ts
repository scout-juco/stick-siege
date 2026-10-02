import { END_SCREEN, HUD, inRect, PAUSE_SCREEN, RADIAL, radialLayout, SLOT_RADIUS, towerHitRect } from '../data/layout';
import { TOWER_ORDER } from '../data/towers';
import { restartSession, type Session } from '../session';
import { SPEED_OPTIONS } from '../sim/constants';
import { isOver } from '../sim/step';
import { buildTower, canAfford } from '../sim/towers';
import type { GameState, Tower, TowerKind } from '../sim/types';
import { callNextWave, canCallWave } from '../sim/waves';

export type { UiState } from './ui-state';

export function slotAt(state: GameState, x: number, y: number): number | null {
  for (const [i, s] of state.slots.entries()) {
    if (Math.hypot(s.x - x, s.y - y) <= SLOT_RADIUS + 4) return i;
  }
  return null;
}

export function towerAt(state: GameState, x: number, y: number): Tower | null {
  for (const t of state.towers) if (inRect(towerHitRect(t.x, t.y), x, y)) return t;
  return null;
}

export function menuFor(state: GameState, slot: number) {
  const s = state.slots[slot]!;
  return radialLayout(s.x, s.y, TOWER_ORDER);
}

/** Build option under the point, if the menu is open. */
export function menuOptionAt(session: Session, x: number, y: number): TowerKind | null {
  const { state, ui } = session;
  if (ui.selectedSlot === null) return null;
  for (const o of menuFor(state, ui.selectedSlot).options) {
    if (Math.hypot(o.x - x, o.y - y) <= RADIAL.optionRadius + 2) return o.kind;
  }
  return null;
}

function clearSelection(session: Session): void {
  session.ui.selectedSlot = null;
  session.ui.selectedTowerId = null;
}

/** Routes a tap (logical coords) to whatever is under it, top-most first. */
export function handleTap(session: Session, x: number, y: number, nowMs: number): void {
  const { state, ui } = session;

  if (isOver(state)) {
    if (inRect(END_SCREEN.restart, x, y)) restartSession(session);
    return;
  }

  // HUD strip.
  if (inRect(HUD.pause, x, y)) {
    state.paused = !state.paused;
    clearSelection(session);
    return;
  }
  if (state.paused) {
    if (inRect(PAUSE_SCREEN.resume, x, y)) state.paused = false;
    return;
  }
  if (inRect(HUD.speed, x, y)) {
    const i = SPEED_OPTIONS.indexOf(state.speed as (typeof SPEED_OPTIONS)[number]);
    state.speed = SPEED_OPTIONS[(i + 1) % SPEED_OPTIONS.length]!;
    return;
  }
  if (inRect(HUD.callWave, x, y)) {
    if (canCallWave(state)) {
      const bonus = callNextWave(state);
      if (bonus > 0) ui.toast = { text: `+${bonus} gold for calling early!`, atMs: nowMs };
      clearSelection(session);
    }
    return;
  }
  if (y < HUD.height) return;

  // Open build menu.
  if (ui.selectedSlot !== null) {
    const option = menuOptionAt(session, x, y);
    if (option !== null) {
      if (canAfford(state, option)) {
        const tower = buildTower(state, ui.selectedSlot, option);
        clearSelection(session);
        if (tower) {
          ui.selectedTowerId = tower.id;
          ui.openedAtMs = nowMs;
        }
      } else {
        ui.denied = { kind: option, atMs: nowMs };
      }
      return;
    }
    const tappedSameSlot = slotAt(state, x, y) === ui.selectedSlot;
    clearSelection(session);
    if (tappedSameSlot) return;
  }

  const tower = towerAt(state, x, y);
  if (tower) {
    const wasSelected = ui.selectedTowerId === tower.id;
    clearSelection(session);
    if (!wasSelected) {
      ui.selectedTowerId = tower.id;
      ui.openedAtMs = nowMs;
    }
    return;
  }

  const slot = slotAt(state, x, y);
  if (slot !== null && !state.towers.some((t) => t.slot === slot)) {
    clearSelection(session);
    ui.selectedSlot = slot;
    ui.openedAtMs = nowMs;
    return;
  }
  clearSelection(session);
}

export function handleHover(session: Session, x: number, y: number): void {
  session.ui.hoverX = x;
  session.ui.hoverY = y;
  session.ui.hovering = true;
}

export function hoveredSlot(session: Session): number | null {
  const { state, ui } = session;
  return ui.hovering ? slotAt(state, ui.hoverX, ui.hoverY) : null;
}

/** Whether the hover point is over something tappable (for the mouse cursor). */
export function isInteractiveAt(session: Session, x: number, y: number): boolean {
  const { state } = session;
  if (isOver(state)) return inRect(END_SCREEN.restart, x, y);
  if (inRect(HUD.pause, x, y)) return true;
  if (state.paused) return inRect(PAUSE_SCREEN.resume, x, y);
  if (inRect(HUD.speed, x, y)) return true;
  if (inRect(HUD.callWave, x, y)) return canCallWave(state);
  if (menuOptionAt(session, x, y) !== null) return true;
  if (towerAt(state, x, y)) return true;
  const slot = slotAt(state, x, y);
  return slot !== null && !state.towers.some((t) => t.slot === slot);
}
