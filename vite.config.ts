import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // relative asset URLs so the build runs from any folder or sandboxed host
  base: './',
  build: {
    target: 'es2022',
    // three.js is large by nature; it is split out and only fetched when a
    // WebGL machine is opened (see the lazy imports in ArchiveScene).
    chunkSizeWarningLimit: 1100,
  },
});
