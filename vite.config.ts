import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';

// Helper function to determine the correct hostname for HMR
function getHmrHostname() {
  // Check if we're in a development environment
  if (process.env.NODE_ENV === 'development') {
    // For development, always use localhost for HMR
    return 'localhost';
  }
  // For production, this won't be used as HMR is disabled
  return 'localhost';
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      disable: mode === 'development', // Disable PWA in development to avoid SSL issues
      registerType: 'autoUpdate',
      injectRegister: mode === 'production' ? 'auto' : false, // Don't inject SW register in dev
      manifest: mode === 'production' ? {
        name: 'Curser Inspection App',
        short_name: 'Inspection',
        start_url: '/',
        display: 'standalone',
        background_color: '#024FFF',
        theme_color: '#024FFF',
        icons: [
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      } : false, // Disable manifest in development
      workbox: mode === 'production' ? {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      } : undefined,
      devOptions: {
        enabled: false, // Explicitly disable in development
        type: 'module'
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    ...(fs.existsSync(path.resolve(__dirname, '.cert/key.pem')) && {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, '.cert/key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, '.cert/cert.pem')),
      }
    }),
    hmr: false // Disable HMR to avoid WebSocket conflicts with our app
  },
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    minify: mode === 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom']
        }
      }
    }
  },
  define: {
    'process.env': process.env
  }
}));
