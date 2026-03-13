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
      disable: mode === 'development',
      registerType: 'autoUpdate',
      injectRegister: mode === 'production' ? 'auto' : false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
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
      } : false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      devOptions: {
        enabled: false,
        type: 'module'
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    https: (() => {
      const keyPath = path.resolve(__dirname, '.cert/key.pem');
      const certPath = path.resolve(__dirname, '.cert/cert.pem');
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
      }
      return undefined;
    })(),
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
          router: ['react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          charts: ['recharts'],
          pdf: ['jspdf', 'pdf-lib'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities']
        }
      }
    }
  },
  define: {
    'process.env': process.env
  }
}));
