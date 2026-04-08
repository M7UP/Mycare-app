import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',         // ← index.html is inside src/
  build: {
    outDir: '../dist', // ← output one level up to repo root
    minify: false,
    emptyOutDir: true,
  },
});
