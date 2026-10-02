import type { EnemyKind } from '../sim/types';
import { WAVE_TITLES } from './copy';

/** A group starts `delaySec` after the wave begins and spawns `count` enemies `spacingSec` apart. Groups run in parallel. */
export interface WaveGroup {
  enemy: EnemyKind;
  count: number;
  spacingSec: number;
  delaySec: number;
}

export interface WaveDef {
  title: string;
  groups: readonly WaveGroup[];
}

export const ECONOMY = {
  startGold: 220,
  startLives: 20,
  /** Seconds between a wave finishing its spawns and the next wave auto-starting. */
  waveCountdownSec: 10,
  /** Calling a wave early pays ceil(secondsRemaining) × this. */
  earlyBonusPerSec: 2,
} as const;

const g = (enemy: EnemyKind, count: number, spacingSec: number, delaySec = 0): WaveGroup => ({
  enemy,
  count,
  spacingSec,
  delaySec,
});

export const waves: readonly WaveDef[] = [
  { title: WAVE_TITLES[0], groups: [g('peasant', 8, 1.5)] },
  { title: WAVE_TITLES[1], groups: [g('peasant', 12, 1.2)] },
  { title: WAVE_TITLES[2], groups: [g('peasant', 8, 1.4), g('squire', 6, 1.2, 5)] },
  { title: WAVE_TITLES[3], groups: [g('peasant', 10, 1.2), g('tinCan', 3, 3, 4)] },
  { title: WAVE_TITLES[4], groups: [g('squire', 14, 0.8), g('peasant', 4, 1.5, 3)] },
  { title: WAVE_TITLES[5], groups: [g('peasant', 8, 1.2), g('bard', 2, 4, 5)] },
  { title: WAVE_TITLES[6], groups: [g('tinCan', 8, 1.8), g('squire', 6, 1, 6)] },
  {
    title: WAVE_TITLES[7],
    groups: [g('peasant', 12, 0.9), g('squire', 6, 1, 4), g('tinCan', 4, 2, 8), g('bard', 2, 3, 12)],
  },
  { title: WAVE_TITLES[8], groups: [g('bard', 6, 2.5), g('squire', 10, 0.8, 3)] },
  { title: WAVE_TITLES[9], groups: [g('tinCan', 10, 1.4), g('bard', 4, 2.5, 6)] },
  {
    title: WAVE_TITLES[10],
    groups: [g('peasant', 20, 0.7), g('squire', 12, 0.8, 4), g('tinCan', 6, 1.6, 8), g('bard', 4, 2.5, 12)],
  },
  { title: WAVE_TITLES[11], groups: [g('peasant', 10, 1), g('reginald', 1, 1, 4), g('tinCan', 6, 1.8, 7)] },
];

export const TOTAL_WAVES = waves.length;
