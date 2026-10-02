import { map01, type MapDef } from '../data/map01';
import { ECONOMY } from '../data/waves';
import { buildPath } from './path';
import { createRng } from './rng';
import type { GameState, Path } from './types';

const pathCache = new Map<string, Path>();

/** The sampled road for a map (built once, shared by every game on that map). */
export function mapPath(map: MapDef = map01): Path {
  let path = pathCache.get(map.id);
  if (!path) {
    path = buildPath(map.pathControl);
    pathCache.set(map.id, path);
  }
  return path;
}

export function createGame(seed: number, map: MapDef = map01): GameState {
  return {
    seed,
    rng: createRng(seed),
    time: 0,
    phase: 'ready',
    paused: false,
    speed: 1,
    gold: ECONOMY.startGold,
    lives: ECONOMY.startLives,
    waveNumber: 0,
    waveStartedAt: 0,
    spawning: [],
    countdown: null,
    path: mapPath(map),
    slots: map.slots,
    enemies: [],
    towers: [],
    knights: [],
    projectiles: [],
    corpses: [],
    impacts: [],
    bossLine: null,
    endedAt: 0,
    nextId: 1,
    stats: { kills: 0, leaks: 0, goldEarned: 0, earlyBonus: 0 },
  };
}

export function newId(state: GameState): number {
  return state.nextId++;
}
