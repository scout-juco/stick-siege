import { describe, expect, it } from 'vitest';
import { BOSS_ENTRY_LINE } from '../src/data/copy';
import { debugKillAll, debugSkipToWave } from '../src/sim/commands';
import { BOSS_LINE_SEC } from '../src/sim/constants';
import { createGame } from '../src/sim/state';
import { tick } from '../src/sim/step';
import { buildTower } from '../src/sim/towers';
import { runFor, runUntil } from './helpers';

describe('boss and endgame', () => {
  it('wave 12 brings exactly one Sir Reginald, who announces himself', () => {
    const state = createGame(3);
    debugSkipToWave(state, 12);
    runUntil(state, (s) => s.enemies.some((e) => e.kind === 'reginald'), 30);
    expect(state.enemies.filter((e) => e.kind === 'reginald')).toHaveLength(1);
    expect(state.bossLine?.text).toBe(BOSS_ENTRY_LINE);
    runFor(state, BOSS_LINE_SEC + 0.1);
    expect(state.bossLine).toBeNull();
    runUntil(state, (s) => s.spawning.length === 0, 60);
    expect(state.enemies.filter((e) => e.kind === 'reginald')).toHaveLength(1);
  });

  it('skipToWave keeps towers and gold', () => {
    const state = createGame(3);
    buildTower(state, 0, 'archer');
    const gold = state.gold;
    debugSkipToWave(state, 7);
    expect(state.waveNumber).toBe(7);
    expect(state.towers).toHaveLength(1);
    expect(state.gold).toBe(gold);
  });

  it('is not won while the final wave is still spawning or enemies remain', () => {
    const state = createGame(3);
    debugSkipToWave(state, 12);
    runFor(state, 2);
    debugKillAll(state);
    runFor(state, 1 / 60);
    expect(state.phase).toBe('playing');
    runUntil(state, (s) => s.spawning.length === 0, 60);
    expect(state.phase).toBe('playing');
  });

  it('is won once wave 12 has spawned and the road is clear', () => {
    const state = createGame(3);
    debugSkipToWave(state, 12);
    runUntil(state, (s) => s.spawning.length === 0, 60);
    debugKillAll(state);
    runFor(state, 1 / 60);
    expect(state.phase).toBe('won');
    expect(state.countdown).toBeNull();
  });

  it('freezes once the game is lost', () => {
    const state = createGame(3);
    debugSkipToWave(state, 12);
    runFor(state, 5);
    state.lives = 1;
    runUntil(state, (s) => s.phase === 'lost', 400);
    expect(state.phase).toBe('lost');
    const t = state.time;
    const positions = state.enemies.map((e) => e.dist);
    for (let i = 0; i < 120; i++) tick(state);
    expect(state.time).toBe(t);
    expect(state.enemies.map((e) => e.dist)).toEqual(positions);
  });
});
