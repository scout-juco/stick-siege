import { ECONOMY, TOTAL_WAVES, waves } from '../data/waves';
import { TIME_EPSILON } from './constants';
import { spawnEnemy } from './enemies';
import type { GameState } from './types';

/** Starts wave `waveNumber + 1`: its groups begin spawning in parallel, each after its delay. */
export function startWave(state: GameState): void {
  const def = waves[state.waveNumber];
  if (!def) return;
  state.waveNumber += 1;
  state.waveStartedAt = state.time;
  state.countdown = null;
  state.spawning = def.groups.map((g) => ({
    enemy: g.enemy,
    remaining: g.count,
    spacingSec: g.spacingSec,
    nextAt: g.delaySec,
  }));
  if (state.phase === 'ready') state.phase = 'playing';
}

/** Gold for calling the next wave with `secondsRemaining` left on the countdown: ceil(s) × 2. */
export function earlyCallBonus(secondsRemaining: number): number {
  // Round away float dust from summing dt so 7.0000000001 doesn't become 8.
  const s = Math.round(Math.max(0, secondsRemaining) * 1e6) / 1e6;
  return Math.ceil(s) * ECONOMY.earlyBonusPerSec;
}

/** The first wave waits for the player; later waves can be called during their countdown. */
export function canCallWave(state: GameState): boolean {
  if (state.phase === 'ready') return true;
  return state.phase === 'playing' && state.countdown !== null && state.waveNumber < TOTAL_WAVES;
}

/** Starts the next wave now, paying the early-call bonus if a countdown was running. Returns the bonus. */
export function callNextWave(state: GameState): number {
  if (!canCallWave(state)) return 0;
  const bonus = state.countdown !== null ? earlyCallBonus(state.countdown) : 0;
  state.gold += bonus;
  state.stats.earlyBonus += bonus;
  startWave(state);
  return bonus;
}

export function isFinalWaveDone(state: GameState): boolean {
  return state.waveNumber >= TOTAL_WAVES && state.spawning.length === 0;
}

/** Ticks the between-wave countdown and the spawner. */
export function updateWaves(state: GameState, dt: number): void {
  if (state.phase !== 'playing') return;
  if (state.countdown !== null) {
    state.countdown -= dt;
    if (state.countdown <= TIME_EPSILON) startWave(state);
  }
  if (state.spawning.length === 0) return;

  const waveT = state.time - state.waveStartedAt;
  for (const group of state.spawning) {
    while (group.remaining > 0 && waveT + TIME_EPSILON >= group.nextAt) {
      spawnEnemy(state, group.enemy);
      group.remaining -= 1;
      group.nextAt += group.spacingSec;
    }
  }
  if (state.spawning.every((g) => g.remaining === 0)) {
    state.spawning = [];
    if (state.waveNumber < TOTAL_WAVES) state.countdown = ECONOMY.waveCountdownSec;
  }
}

/** Win once the final wave has finished spawning and the road is clear. */
export function checkVictory(state: GameState): void {
  if (state.phase === 'playing' && isFinalWaveDone(state) && state.enemies.length === 0) {
    state.phase = 'won';
    state.endedAt = state.time;
  }
}
