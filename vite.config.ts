import { fileURLToPath } from 'node:url';
import { defineConfig, normalizePath } from 'vite';

// index.html lives in public/ (the page shell); game code stays in src/.
// `/src/...` URLs are aliased back to the real src folder outside the Vite root.
const srcDir = normalizePath(fileURLToPath(new URL('./src/', import.meta.url)));

export default defineConfig({
  root: 'public',
  // Relative asset URLs so the build works from any path or host it is embedded under.
  base: './',
  publicDir: false,
  resolve: {
    alias: [{ find: /^\/src\//, replacement: srcDir }],
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
