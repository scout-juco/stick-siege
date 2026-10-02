# Stick Siege

A comedic medieval tower defense game. Ink-drawn stick figures march on a parchment kingdom, and you stop them with archers, catapults, wizards, and some very brave knights. It runs in desktop and mobile browsers and is built to be embedded in another site with an `<iframe>`.

- Plain Canvas2D, TypeScript, and Vite. **Zero runtime dependencies** and no image files: every visual is drawn procedurally.
- One map, 4 towers, 4 enemy types plus a boss (Sir Reginald the Unreasonably Large), and 12 waves.
- Mouse and touch go through a single Pointer Events path, in landscape or portrait (letterboxed).

The design spec (stats, waves, art direction) is in [`docs/game-design.md`](docs/game-design.md). Working rules for contributors and agents are in [`CLAUDE.md`](CLAUDE.md).

## Develop

Requires Node 24.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit`, plus a DOM-free check of `src/sim` and `src/data` |
| `npm test` | Vitest unit tests for the pure simulation |
| `npm run deploy` | Build, then `wrangler deploy` to Cloudflare |

The page shell is `public/index.html`. Vite's root is `public/`, and `/src/...` is aliased back to `src/`.

### Dev-only extras

These are stripped from production builds:

- `?gallery` draws every figure type walking in place, for art checks.
- `?seed=123` pins the RNG seed, so runs are reproducible.
- `window.__td` is the automation hook: `state`, `seed`, `setSpeed(n)`, `skipToWave(n)`, `addGold(n)`, `build(slot, kind)`, `callWave()`, `advance(seconds)`, `autopilot(on)`, `crowd(n)`, `bench(frames)`, and `restart()`.

## Deploy to Cloudflare

`wrangler.jsonc` defines a static-assets-only Worker named `stick-siege` that serves `dist/`.

```bash
npx wrangler login
npm run deploy
```

To validate the config without uploading anything:

```bash
npx wrangler deploy --dry-run
```

## Embed

The game fills whatever box it's given, letterboxing to 16:9 with no page scroll. It auto-pauses mid-wave when the tab is hidden or the frame scrolls out of view.

```html
<iframe
  src="https://stick-siege.<your-subdomain>.workers.dev/"
  title="Stick Siege"
  style="width: 100%; aspect-ratio: 16 / 9; border: 0;"
  loading="lazy"
  allow="fullscreen"
></iframe>
```

Assets load from relative URLs, so the build also works from a sub-path or another static host.
