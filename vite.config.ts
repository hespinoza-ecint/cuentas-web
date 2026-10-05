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
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'maskable-icon.svg'],
      manifest: {
        name: 'Cuentas',
        short_name: 'Cuentas',
        description: 'Asistente financiero personal: efectivo, ingresos, gastos y tarjetas.',
        lang: 'es-MX',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'maskable-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
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
  },
})
