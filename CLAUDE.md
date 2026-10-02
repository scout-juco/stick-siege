# Stick Siege — HTML5 Tower Defense

A comedic medieval tower defense game. Stick figures are drawn in black ink on a parchment map. It runs in desktop and mobile browsers.
Full design spec, stats, and wave tables are in `docs/game-design.md`. Read it before touching gameplay, balance, or art.

## Stack (pinned — do not upgrade without asking)
- Node 24 LTS (dev only; any 24.x ≥ 24.0). Vite and Vitest both require ≥ 22.12, so 24 satisfies them.
- Vite 8.3.2 is the dev server and bundler. It uses the `vanilla-ts` template and needs no framework.
- TypeScript 7.0.2 runs in `strict` mode and is used only for typechecking (`tsc --noEmit`). Vite handles transpiling.
- Vitest 5.0.3 runs unit tests against the pure simulation layer.
- Rendering uses the plain Canvas2D API with no game engine, physics library, or UI framework. Every visual is drawn procedurally, so there are no image or sprite files.
- Audio is out of scope for v1. No audio libraries.
- Runtime dependencies: **zero**. Every new dependency needs a one-line justification in this file before it's added.
- Dev dependency justifications:
  - `wrangler@4.147.0`: Cloudflare's deploy CLI, used by `npm run deploy`. It's dev-only and never bundled.

## Deployment (Cloudflare) and embedding
- This is a static-assets-only Cloudflare Worker. `wrangler.jsonc` serves `dist/`. `npm run deploy` builds, then runs `wrangler deploy`. Use `npx wrangler deploy --dry-run` to validate without uploading.
- `public/index.html` is the page shell. Vite's `root` is `public/` (see `vite.config.ts`), `/src/...` is aliased back to `src/`, and the build goes to `dist/`. `publicDir` is disabled.
- The game is iframed into another website, so:
  - `base: './'` keeps asset URLs relative.
  - The canvas fills whatever box the iframe gives it and letterboxes.
  - No code may touch `window.top` or `parent`.
  - Don't add headers that block framing (`X-Frame-Options`, or a `frame-ancestors` that excludes the host site).
  - The game auto-pauses when the tab is hidden or the iframe scrolls out of view.

## MCP
- **playwright** (`@playwright/mcp@0.0.83`) is the runtime verification loop. Use it to open the dev server, screenshot the canvas, tap or click canvas coordinates, and read console errors. Use it after every visible change.

## Architecture rules
- **The sim and the renderer are separate.** `src/sim/**` must never import DOM, canvas, or `window`. It is pure TypeScript that takes state and a dt and mutates state. This keeps it unit-testable in Vitest under the `node` environment.
- The sim runs on a fixed timestep at 60 Hz with an accumulator. Render runs on rAF and interpolates. Game speed (1×/2×) multiplies sim steps, never dt.
- All randomness goes through a seeded RNG (`src/sim/rng.ts`, mulberry32). `Math.random` is banned in `src/sim`.
- Content is data-driven. Tower, enemy, wave, and map definitions live in `src/data/*.ts` as typed `const` objects. Balance changes should touch data only, not logic.
- Entities are plain objects in arrays, with systems as functions. No class hierarchies and no ECS library.
- The logical resolution is 960×540. The canvas scales to fit the viewport with letterboxing and is DPR-aware. All game coordinates are logical.
- Input goes through Pointer Events only (one code path for mouse and touch). Every interactive target is at least 44 logical px. Hover is a nicety and must never be required.
- Debug hook: in dev builds, expose `window.__td = { state, setSpeed, skipToWave(n), addGold(n), seed }`. Playwright uses it to reach late waves quickly. Strip it from prod builds using `import.meta.env.DEV`.
  - It also exposes `build(slot, kind)`, `callWave()`, `killAll()`, `advance(seconds)`, `autopilot(on)`, `crowd(n)`, `bench(frames)`, and `restart(seed?)`.
  - `advance()` steps the sim synchronously. Use it when the browser throttles rAF, for example in a hidden pane.
  - `?gallery` shows every figure and `?seed=N` pins the RNG. Both are dev-only.

## Layout
```
public/index.html    page shell (Vite root); full-viewport canvas
wrangler.jsonc       Cloudflare Worker (static assets from dist/)
src/
  main.ts            boot, canvas sizing, loop, auto-pause for embeds
  session.ts         one play-through (state + clock + UI state); restart
  debug.ts           window.__td (dev only, dynamically imported)
  sim/               pure game logic (no DOM); step.ts orders the systems; autopilot.ts is the balance bot
  render/            canvas drawing: stickfigure.ts, map.ts, ui.ts, ink.ts, towers.ts, scene.ts (frame), gallery.ts (dev)
  input/             pointer.ts (logical coords), controls.ts (hit-testing → commands), ui-state.ts
  data/              towers.ts, enemies.ts, waves.ts, map01.ts, copy.ts, art.ts, layout.ts
tests/               vitest specs for src/sim (balance.test.ts logs the scripted-player result)
docs/game-design.md  design spec (source of truth for numbers)
```

## Conventions
- Use kebab-case for files and PascalCase for types. Put magic numbers in `src/data` or `src/sim/constants.ts`.
- Name things for what they are (`archerTower`, not `t1`).
- Comedic copy (enemy names, death quips, wave titles) lives in `src/data/copy.ts`.
- Commit after each milestone with a one-line message.

## Verification gate (run before calling anything done)
1. `npm run typecheck && npm test && npm run build` must all pass.
2. Playwright MCP smoke test: open `http://localhost:5173` at desktop (1280×720) and at mobile (390×844, touch). Confirm zero console errors. Place one of each tower, start wave 1, then use `__td.skipToWave(12)` to confirm the boss spawns and the win/lose screens render. Screenshot each step and look at them.
3. When reporting, state what you verified visually and what you did not.

## Windows notes
- Dev machine is Windows x64. Use PowerShell-compatible commands (`;` not `&&` in raw PowerShell; npm scripts are fine).
- If Playwright can't find a browser, run `npx playwright install chromium` and re-add the MCP with `--browser chromium`.
