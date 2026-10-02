Build **Stick Siege**, a comedic medieval stick-figure tower defense game for HTML5. Read `CLAUDE.md` and `docs/game-design.md` first. They are the source of truth for the stack, architecture rules, numbers, and the verification gate. Do not deviate from the pinned versions. If a version conflicts or won't install, stop and tell me instead of substituting.

Dev machine: Windows x64. Shell: PowerShell.

## Step 0: Prerequisites (verify, don't assume)
- Run `node -v` and confirm it is 24.x. If it isn't, stop and tell me.
- Run `git --version`. If this folder isn't already a git repo, run `git init` in it.

## Step 1: Scaffold
Scaffold in the current folder, which already contains `CLAUDE.md` and `docs/`:
```
npm create vite@latest . -- --template vanilla-ts
npm install -D vite@8.3.2 typescript@7.0.2 vitest@5.0.3
```
- Delete the template demo code (counter, logos, and style.css boilerplate).
- Set `tsconfig.json` to `strict: true`, `noUncheckedIndexedAccess: true`, and `noEmit: true`.
- `package.json` scripts: `dev` (vite), `build` (vite build), `preview` (vite preview), `typecheck` (tsc --noEmit), and `test` (vitest run).
- Configure Vitest with `environment: 'node'` and include `tests/**/*.test.ts`.
- Set `index.html` to a full-viewport canvas with `touch-action: none`, `user-select: none`, and `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">`.
- Commit with the message "scaffold".

## Step 2: Wire Playwright MCP
Run this yourself:
```
claude mcp add playwright -- cmd /c npx -y @playwright/mcp@0.0.83
```
Tell me to restart Claude Code so the server loads, then confirm the playwright tools are available. If launch fails because no browser was found, run `npx playwright install chromium` and re-add the server with `--browser chromium` appended.

## Step 3: Build in milestones
Build the milestones in order. After each one, run the gate from CLAUDE.md, commit, and give me a 2-line report: what works, and what you looked at in screenshots.

1. **Loop and canvas.** Add the fixed 60 Hz sim with render interpolation, 960×540 logical letterbox scaling (DPR-aware, resize-safe), Pointer Events mapped to logical coordinates, and the `window.__td` dev hook. Draw the cached parchment background and the map01 path with build slots.
2. **Ink and stick-figure rig.** Write `render/ink.ts` (boiling-line stroke helper with cached jitter variants) and `render/stickfigure.ts` (rig, walk cycle, per-type props). Add a dev-only `?gallery` URL param that draws every enemy type plus a knight walking in place, then screenshot it and check the look before continuing.
3. **Enemies and waves.** Path following (polyline with distance-along-path), the wave spawner from `data/waves.ts`, lives, leak handling, and the comedic death (tip, bounce, quip, fade). Add unit tests for path progress, spawn timing, and leak cost.
4. **Towers.** Add all 4 towers per the spec: projectiles, splash with predicted landing, the catapult's minimum range, the wizard's slow, and barracks knights with blocking, melee, and respawn, with the boss trampling them. Use "first" targeting. Add unit tests for armor math, splash falloff, slow stacking (it refreshes rather than stacking), and targeting order.
5. **Economy and UI.** Gold, bounties, the radial build menu (≥ 44 px targets, greyed when unaffordable), the range ring on selecting a tower, the HUD, pause, 1×/2×, the wave countdown, call-early bonus, and the wave-title scroll banner. Add unit tests for the early-call bonus and build affordability.
6. **Boss and endgame.** Sir Reginald (3× scale, crown, top health bar, entry line), plus win and lose screens with Restart. Verify wave 12 end-to-end via `__td.skipToWave(12)`.
7. **Polish pass.** Hold 60 fps with 60+ enemies on screen; measure with Playwright on desktop. Check portrait and landscape on the mobile viewport, and make sure nothing important sits under the letterbox or a notch. Then do a balance sanity check: script a simple auto-placement in `__td`, run waves 1–12 at 2×, report lives remaining, and propose (don't apply) data tweaks if it's outside the 8–15 target.

## Rules while building
- Keep `src/sim` free of DOM imports. If you need one, the design is wrong; restructure instead.
- Don't add runtime dependencies. Don't add audio, upgrades, extra maps, or particles, which are v2 per the spec's non-goals.
- Take screenshots via Playwright MCP and actually inspect them. "It compiles" is not verification.
- If something in the spec is ambiguous, pick the simplest interpretation, note it in your milestone report, and keep going.

## Done when
All 7 milestones are committed, the full verification gate in CLAUDE.md passes, and you've given me a final report with desktop and mobile screenshots of wave 1, a mid-game wave, the boss fight, and the win screen.
