import type { EnemyKind } from '../sim/types';

/** All comedic and player-facing copy lives here. */

export const GAME_TITLE = 'Stick Siege';

export const ENEMY_NAMES = {
  peasant: 'Angry Peasant',
  squire: 'Sprinting Squire',
  tinCan: 'Tin Can Knight',
  bard: 'Berserker Bard',
  reginald: 'Sir Reginald the Unreasonably Large',
} as const satisfies Record<EnemyKind, string>;

export const WAVE_TITLES = [
  'A Mild Disagreement',
  'Torches Were Lit',
  'Late for Practice',
  'Clank Clank',
  'Cardio Day',
  'Encore!',
  'The Can Shipment',
  'Everyone, Basically',
  'Bard Wars',
  'Heavy Metal',
  'The Calm Before',
  "He's Here",
] as const;

export const DEATH_QUIPS = [
  'I had a family!',
  'Worth it.',
  'Tell my goat...',
  'Ow, my everything',
  'This is fine',
  'I regret nothing (I regret this)',
  'Not the face!',
  'Two days from retirement...',
  'The pitchfork was a rental',
  'Is this the castle?',
  "Should've stayed in bed",
  "Avenge me! Or don't.",
  "I'm okay! (I'm not okay)",
  'Mother was right',
  'I only came for the snacks',
  'Put that on my tombstone',
  "Well, that's embarrassing",
  'Who brought a catapult?!',
  'Tell the king he owes me money',
  'Five more minutes...',
  'My agent said no stunts',
  'Lying down. On purpose.',
] as const;

export const KNIGHT_QUIPS = [
  'For the kin— ow',
  'Tell the sergeant I tried',
  'Shift over. Bye.',
  'Respawning in 8...',
] as const;

export const BOSS_ENTRY_LINE = "I'm not large, the castle is small.";

export const WIN_TITLE = 'Victory!';
export const WIN_TEXT = 'The kingdom is safe. For now. Probably.';
export const LOSE_TITLE = 'The Gate Has Fallen';
export const LOSE_TEXT = "The peasants have taken the castle. They don't know what to do with it.";

export const UI_TEXT = {
  startWave: 'Start Wave',
  waveInProgress: 'Wave in progress',
  finalWave: 'Final wave!',
  paused: 'Paused',
  resume: 'Resume',
  restart: 'Restart',
  rotate: 'Turn your phone sideways for a bigger kingdom',
  wavesSurvived: (n: number) => `Waves survived: ${n}/12`,
  livesLeft: (n: number) => `Lives left: ${n}`,
} as const;
