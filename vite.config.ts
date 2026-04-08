import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',           // root is the repo root
  build: {
    outDir: 'dist',    // ← outputs to repo-root/dist/
  }
    minify: false,
    emptyOutDir: true,
  },
});
