# Stick Siege — Game Design Spec (v1)

The numbers here are the starting balance. Tune them in `src/data`, and note any change in this file.

## Pitch
A tiny ink-drawn kingdom is under siege by an army of increasingly ridiculous stick figures. You place towers on a parchment map to stop them from reaching the castle gate. The tone is comedic, but the gameplay is played straight: the jokes are in the names, quips, and animations, never in unfair mechanics.

## v1 scope (MVP)
- One map, `map01` ("The King's Road"). It has one winding path from the left edge to the castle gate on the right and 12 fixed build slots.
- 4 tower types. Each has one tier only, with no upgrades.
- 4 regular enemy types plus 1 boss.
- 12 waves, with the boss on wave 12.
- Gold, lives, a win screen, a lose screen, and restart.
- Controls for pause, 1×/2× speed, and "Call next wave early" (bonus gold).
- Desktop mouse and mobile touch, in both landscape and portrait (letterboxed).

## Non-goals (v2+)
- No tower upgrades or selling.
- No multiple maps, level select, or saved progress or localStorage.
- No full ragdoll physics, particle systems, screen shake, or audio.
- No meta-progression, accounts, or leaderboards.
- No free-form tower placement, since slots only work well on touch.

## Core loop
1. Build phase. Tap an empty slot to open a radial menu with the 4 towers and their costs. Tap one to build it, but only if affordable. Unaffordable options are greyed out and show their cost in red.
2. Press "Start Wave" or wait for the 10 s countdown. Enemies walk the path.
3. Towers auto-target. Each kill pays a bounty. Each enemy that reaches the gate subtracts lives.
4. Between waves the countdown restarts. Calling a wave early pays `ceil(secondsRemaining) × 2` gold.
5. Clearing wave 12 means you win. Hitting 0 lives means you lose. Both screens show the waves survived and a Restart button.

## Economy
- Start with 220 gold and 20 lives.
- Lives lost per leak: regular enemies cost 1 and the boss costs 20, so the boss leaking is always a loss.

## Towers
Range and units are in logical px. "Rate" is attacks per second.

| Tower | Cost | Damage | Rate | Range | Behaviour |
|---|---|---|---|---|---|
| Archer Post | 70 | 8 (physical) | 1.6 | 150 | Single target, first-along-path. Arrows are fast visible projectiles. |
| Catapult | 120 | 22 (physical) | 0.35 | 190 | Lobbed boulder with a 45 px splash. Lands at the target's predicted position. Cannot hit within 60 px (min range). |
| Wizard Hut | 100 | 14 (magic) | 0.8 | 130 | Bolt applies a 40% slow for 1.5 s. Ignores armor. |
| Barracks | 90 | 6 per knight (physical) | 1.0 | 100 rally radius | Spawns 3 stick knights (60 HP each) that block enemies at a rally point on the path. Dead knights respawn after 8 s. Bosses ignore blocking and trample knights. |

Targeting priority is "first", meaning furthest along the path, for every tower in v1.

## Enemies
| Enemy | HP | Speed | Armor | Bounty | Notes |
|---|---|---|---|---|---|
| Angry Peasant | 30 | 45 | 0 | 5 | Carries a pitchfork. The basic grunt. |
| Sprinting Squire | 22 | 85 | 0 | 6 | Fast and leans forward comically when running. |
| Tin Can Knight | 90 | 32 | 50% vs physical | 12 | Big rectangle helmet. Magic is the counter. |
| Berserker Bard | 140 | 38 | 0 | 16 | Lute on back. Speeds up 30% below half HP. |
| **BOSS: Sir Reginald the Unreasonably Large** | 2400 | 20 | 25% vs physical | 250 | 3× scale ogre-knight with a crown and health bar at the top of the screen. Tramples barracks knights. Says a line on entry. |

Armor reduces physical damage only: `dmg × (1 − armor)`.

## Waves
The `waves.ts` format is `{ title, groups: [{ enemy, count, spacingSec, delaySec }] }`. Groups start at their `delaySec` and run in parallel.

| # | Title | Composition |
|---|---|---|
| 1 | "A Mild Disagreement" | 8 Peasant |
| 2 | "Torches Were Lit" | 12 Peasant |
| 3 | "Late for Practice" | 8 Peasant + 6 Squire |
| 4 | "Clank Clank" | 10 Peasant + 3 Tin Can |
| 5 | "Cardio Day" | 14 Squire + 4 Peasant |
| 6 | "Encore!" | 8 Peasant + 2 Bard |
| 7 | "The Can Shipment" | 8 Tin Can + 6 Squire |
| 8 | "Everyone, Basically" | 12 Peasant + 6 Squire + 4 Tin Can + 2 Bard |
| 9 | "Bard Wars" | 6 Bard + 10 Squire |
| 10 | "Heavy Metal" | 10 Tin Can + 4 Bard |
| 11 | "The Calm Before" | 20 Peasant + 12 Squire + 6 Tin Can + 4 Bard |
| 12 | "He's Here" | Sir Reginald + an escort of 10 Peasant and 6 Tin Can |

Balance target: a decent player wins with 8–15 lives left. A first-time player loses around waves 9–11.

## Art direction: parchment ink
- **Background:** parchment color around `#EAD9B0` with a subtle procedural noise or vignette, rendered once to an offscreen canvas and cached.
- **Ink:** around `#1B1410`. Accents are blood red `#9E1B1B` for HP and danger and gold `#C9A227` for gold UI and the selection ring.
- **Path:** a darker dirt band with dashed, hand-drawn edges, plus a few ink trees, rocks, and the castle gate drawn as line art.
- **Boiling lines:** every ink stroke gets a small per-vertex jitter (±0.6 px) that re-seeds every ~120 ms, so it feels hand-animated. Cache static strokes per jitter frame (around 3 variants) for performance.
- **Line weight:** 2.5 px for figures, 3 px for the boss and outlines, and 1.5 px for detail.

### Stick-figure rig (`render/stickfigure.ts`)
- The head is a circle. The rest is line segments: neck to hip, two arms (upper and fore), and two legs (thigh and shin).
- The walk cycle uses `phase += speed × dt`. Limb angles are `sin(phase)` and `sin(phase + π)`, and the hip bobs at `|sin(phase)|`.
- Per-type props are drawn relative to the hand or head bones: pitchfork, helmet box, lute, crown, shield.
- **Death (cheap comedic, no ragdoll):** the figure tips over (rotate 90° around the feet over 0.25 s), bounces once, shows an optional quip bubble (about 25% chance, from `copy.ts`), then fades out over 0.6 s.
- Barracks knights face enemies. When blocking they show a 2-frame "bonk" swing.

### UI
- The HUD is ink-on-parchment along the top: gold (coin icon), lives (heart), "Wave n/12", pause, and 1×/2×.
- Slots are dashed circles. A tapped slot shows a radial menu with 4 tower icons drawn as tiny ink sketches, each with its cost.
- Tapping a built tower shows its range ring and name. In v1 it has no actions.
- The wave title appears as a scroll banner sliding in at the start of each wave.

## Implementation notes (v1 build)
Where the spec was silent or ambiguous, v1 uses the simplest interpretation. Every value below lives in `src/data`.

- **Wave flow:** Wave 1 waits for the player to press Start Wave, so an embedded game never starts on its own. The 10 s countdown starts once a wave has finished spawning. Calling early during the countdown pays the bonus, which makes stacking waves a real risk/reward choice.
- **Waves survived on the lose screen:** this counts waves started minus 1.
- **Spawn spacing and delays:** these weren't specified. They're set per group in `waves.ts`, from 0.7 s to 4 s apart. In wave 12, Sir Reginald enters 4 s after the escort starts.
- **Splash:** damage falls off linearly from 100% at the center to 50% at the 45 px edge (`splashEdgeFactor`). Boulders have a fixed 0.9 s flight and aim at the target's position 0.9 s ahead, at its current speed.
- **Barracks:**
  - The rally point is the road point closest to the barracks. Every slot is within the 100 px rally radius, and a test enforces this.
  - Knights engage enemies within 52 px of the rally point and give up beyond 78 px.
  - One knight blocks one enemy.
  - Knights ignore the boss, who flattens any knight within reach.
- **Enemy melee vs knights** (dps, not in the spec): peasant 4, squire 3, tin can 6, bard 7.
- **Quips:** the chance is 25%, but at most 2 bubbles show at once so big waves stay readable. Knights have their own small pool of quips.
- **Boss entry line:** shows for 6 sim seconds.

## Balance check (scripted "decent player"), not yet applied
`tests/balance.test.ts` replays a fixed build order (`src/sim/autopilot.ts`) that never calls early. It matches an in-browser autopilot run at 2×. The results are the same across 8 seeds:

- Waves 1–11 leak **nothing**. The build fills all 12 slots by wave 10 with 666 gold left over, so gold isn't the constraint.
- Sir Reginald reaches the gate with about 800 of his 2400 HP left, which is −20 lives and a loss. The full defense deals him about 1,600 damage over the whole road.
- So the outcome is binary: either a flawless win or a boss loss. 8–15 lives is unreachable at the current numbers.

Proposed tweak, which brought 3 of 4 probe seeds to 12–16 lives (the 4th still loses to the boss):
- Sir Reginald HP 2400 → **1500**.
- Regular enemy HP **×1.3** and speed **×1.1**.

A first-time player's weaker build should still fall short of the boss. Re-run `npm test` and read the `[balance]` line after any change.

## Comedic copy (`src/data/copy.ts`)
- Death quips include "I had a family!", "Worth it.", "Tell my goat...", "Ow, my everything", "This is fine", and "I regret nothing (I regret this)". Add about 20.
- Sir Reginald's entry line: "I'm not large, the castle is small."
- Win: "The kingdom is safe. For now. Probably."
- Lose: "The peasants have taken the castle. They don't know what to do with it."
