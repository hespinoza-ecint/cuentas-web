/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': cuando hay una version nueva se avisa y el usuario decide
      // actualizar (ver src/app/PwaUpdatePrompt.tsx). El registro lo hace el
      // hook, por eso injectRegister: null evita el script automatico.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: [
        'icon.svg',
        'maskable-icon.svg',
        'icon-192.png',
        'icon-512.png',
        'maskable-icon-512.png',
        'apple-touch-icon.png',
        'fonts/manrope-latin.woff2',
        'fonts/manrope-latin-ext.woff2',
      ],
      workbox: {
        navigateFallback: '/index.html',
        // La fuente y los iconos entran al precache (funcionan sin conexion).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Lecturas de la API: primero red y, si no hay, la última copia
            // guardada (modo sin conexión de solo lectura).
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.startsWith('/api/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cuentas-api-read',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 150, maxAgeSeconds: 86_400 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Cuentas',
        short_name: 'Cuentas',
        description: 'Asistente financiero personal: efectivo, ingresos, gastos y tarjetas.',
        lang: 'es-MX',
        // Azul medianoche de arranque (equivale al canvas oscuro de src/index.css).
        theme_color: '#0f141d',
        background_color: '#0f141d',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Mismo origen en desarrollo: asi la cookie httpOnly (SameSite=Strict)
    // del refresh viaja sin problemas de CORS.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: false },
      '/health': { target: 'http://localhost:3000', changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    restoreMocks: true,
    // La ruta del proyecto vive en OneDrive (con espacios); el pool de
    // "forks" no logra arrancar en Windows en este entorno.
    pool: 'threads',
    // Los E2E de Playwright no corren con Vitest.
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**'],
    // Este equipo (OneDrive) es lento montando jsdom y cargando chunks:
    // más de 3 workers saturan y los imports dinámicos no llegan a tiempo.
    testTimeout: 30000,
    hookTimeout: 30000,
    maxWorkers: 3,
  },
})
