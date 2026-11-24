import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ['pixi.js'],
          engine: ['./src/engine/WebGPUSim', './src/engine/PixiOverlay'],
        },
      },
    },
  },
});
