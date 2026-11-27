import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ['pixi.js'],
          engine: ['./src/engine/WebGPUSim', './src/engine/PixiOverlay'],
        },
      },
    },
  },
  plugins: [
    // PWA: Service Worker генерируется Workbox на этапе сборки (dist/sw.js).
    // Заменяет старый ручной public/sw.js, который кэшировал только './',
    // './index.html' и './manifest.json' - при хэшируемых бандлах Vite это
    // ломало и обновления, и полноценный офлайн.
    VitePWA({
      // SW обновляется автоматически: при следующей загрузке страницы
      // новый precache-манифест подхватывается без UI-диалогов.
      registerType: 'autoUpdate',
      // Иконка PWA и другие некэшируемые по хэшу ассеты должны попасть в precache.
      includeAssets: ['icons/lumivore-icon.svg'],
      // Манифест перенесён сюда из public/manifest.json (теперь плагин
      // генерирует dist/manifest.webmanifest и сам вставляет <link rel="manifest">).
      manifest: {
        name: 'LUMIVORE // THE LIVING FRACTAL',
        short_name: 'LUMIVORE',
        start_url: './',
        display: 'standalone',
        background_color: '#020304',
        theme_color: '#020304',
        description:
          'Bio-Evolutive WebGPU Roguelite: Physarum slime simulation meets Vampire Survivors.',
        icons: [
          {
            // Иконка в стиле игры: живой фрактал (спрайт player-nucleus.svg
            // из старого манифеста был битым путём - файл удалён из репо).
            src: './icons/lumivore-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: './icons/lumivore-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // SPA-fallback: любые навигации отдаём index.html из precache.
        navigateFallback: 'index.html',
        // Precache всех хэшируемых бандлов Vite + статических ассетов.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Старые кэши (в т.ч. 'lumivore-cache-v2' от ручного sw.js) удаляются
        // при активации новой версии SW.
        cleanupOutdatedCaches: true,
        // Внешние ресурсы (шрифты Google Fonts и прочие CDN) - CacheFirst.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.|^https:\/\/cdn\./,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      // В dev-сервере SW не активен: регистрация './sw.js' в main.ts
      // промолчит через .catch(() => {}).
      devOptions: { enabled: false },
    }),
  ],
});
