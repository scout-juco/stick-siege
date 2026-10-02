import { describe, expect, it } from 'vitest';
import { towers } from '../src/data/towers';
import { ECONOMY } from '../src/data/waves';
import { createGame } from '../src/sim/state';
import { buildTower, canAfford, canBuild } from '../src/sim/towers';
import { callNextWave, canCallWave, earlyCallBonus, startWave } from '../src/sim/waves';
import { runFor } from './helpers';

describe('starting economy', () => {
  it('starts with 220 gold and 20 lives', () => {
    const state = createGame(1);
    expect(state.gold).toBe(220);
    expect(state.lives).toBe(20);
  });
});

describe('early-call bonus', () => {
  it('pays ceil(secondsRemaining) × 2', () => {
    expect(earlyCallBonus(10)).toBe(20);
    expect(earlyCallBonus(7.2)).toBe(16);
    expect(earlyCallBonus(7)).toBe(14);
    expect(earlyCallBonus(0.01)).toBe(2);
    expect(earlyCallBonus(0)).toBe(0);
  });

  it('is not fooled by float dust from summing dt', () => {
    expect(earlyCallBonus(7.0000000001)).toBe(14);
  });

  it('is paid when calling during the countdown, and starts the next wave', () => {
    const state = createGame(1);
    startWave(state);
    runFor(state, 1.5 * 7 + 1 / 60); // wave 1 finishes spawning; countdown starts
    runFor(state, 2.5); // 7.5 s left
    const gold = state.gold;
    expect(canCallWave(state)).toBe(true);
    const bonus = callNextWave(state);
    expect(bonus).toBe(16);
    expect(state.gold).toBe(gold + 16);
    expect(state.waveNumber).toBe(2);
    expect(state.countdown).toBeNull();
  });

  it('pays nothing for starting wave 1 (there is no countdown to skip)', () => {
    const state = createGame(1);
    expect(callNextWave(state)).toBe(0);
    expect(state.gold).toBe(ECONOMY.startGold);
  });
});

describe('build affordability', () => {
  it('can afford a tower with exactly its cost, not a coin less', () => {
    const state = createGame(1);
    state.gold = towers.catapult.cost;
    expect(canAfford(state, 'catapult')).toBe(true);
    state.gold = towers.catapult.cost - 1;
    expect(canAfford(state, 'catapult')).toBe(false);
    expect(canAfford(state, 'archer')).toBe(true);
  });

  it('building deducts the cost and fills the slot', () => {
    const state = createGame(1);
    const tower = buildTower(state, 4, 'wizard');
    expect(tower).not.toBeNull();
    expect(state.gold).toBe(ECONOMY.startGold - towers.wizard.cost);
    expect(canBuild(state, 4, 'archer')).toBe(false);
    expect(buildTower(state, 4, 'archer')).toBeNull();
  });

  it('refuses an unaffordable build without touching gold', () => {
    const state = createGame(1);
    state.gold = 60;
    expect(buildTower(state, 0, 'archer')).toBeNull();
    expect(state.gold).toBe(60);
    expect(state.towers).toHaveLength(0);
  });

  it('refuses invalid slots and builds after the game ends', () => {
    const state = createGame(1);
    expect(buildTower(state, -1, 'archer')).toBeNull();
    expect(buildTower(state, 12, 'archer')).toBeNull();
    state.phase = 'lost';
    expect(buildTower(state, 0, 'archer')).toBeNull();
  });

  it('the starting 220 gold buys an archer and a catapult but not three towers', () => {
    const state = createGame(1);
    expect(buildTower(state, 0, 'archer')).not.toBeNull();
    expect(buildTower(state, 1, 'catapult')).not.toBeNull();
    expect(state.gold).toBe(30);
    for (const kind of ['archer', 'catapult', 'wizard', 'barracks'] as const) expect(canAfford(state, kind)).toBe(false);
  });
});
