import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    port: 5175,
    host: true,
    open: true,
  },
});
