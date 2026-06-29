import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logocircular.jpeg'],
      manifest: {
        name: 'YV English Hub',
        short_name: 'YV Hub',
        description: 'Plataforma de ensino YV English',
        theme_color: '#05002e',
        background_color: '#05002e',
        display: 'standalone',
        icons: [
          {
            src: 'logocircular.jpeg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'logocircular.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
})
