import { describe, expect, it } from 'vitest';

/** Enforces the CLAUDE.md architecture rules on the pure layers. (tsconfig.sim.json also typechecks them without the DOM lib.) */
const sim = import.meta.glob('../src/sim/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const data = import.meta.glob('../src/data/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const pure = { ...sim, ...data };

describe('architecture', () => {
  it('finds the sim sources', () => {
    expect(Object.keys(sim).length).toBeGreaterThan(10);
  });

  it('never uses Math.random in src/sim (seeded RNG only)', () => {
    for (const [file, src] of Object.entries(sim)) expect(src, file).not.toMatch(/Math\.random/);
  });

  it('keeps src/sim and src/data free of render, input, and DOM imports', () => {
    for (const [file, src] of Object.entries(pure)) {
      expect(src, file).not.toMatch(/from ['"]\.\.\/(render|input)\//);
      expect(src, file).not.toMatch(/\b(document|window|requestAnimationFrame|HTMLCanvasElement)\b/);
    }
  });
});
