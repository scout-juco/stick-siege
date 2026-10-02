import { TOTAL_WAVES } from '../data/waves';
import { killEnemy, releaseBlocker } from './combat';
import { removeDeadEnemies } from './enemies';
import type { GameState } from './types';
import { clamp } from './util';
import { startWave } from './waves';

/** Debug: clears the field and starts wave n immediately (towers and gold are kept). */
export function debugSkipToWave(state: GameState, n: number): void {
  const wave = clamp(Math.floor(n), 1, TOTAL_WAVES);
  for (const e of state.enemies) releaseBlocker(state, e);
  state.enemies.length = 0;
  state.projectiles.length = 0;
  state.corpses.length = 0;
  state.spawning = [];
  state.countdown = null;
  state.bossLine = null;
  state.waveNumber = wave - 1;
  state.phase = 'playing';
  startWave(state);
}

/** Debug: kills every enemy on the road (bounties paid, corpses and quips shown). */
export function debugKillAll(state: GameState): void {
  for (const e of state.enemies) if (e.hp > 0) killEnemy(state, e);
  removeDeadEnemies(state);
}
