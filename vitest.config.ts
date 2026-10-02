import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts because that one roots Vite at public/.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
