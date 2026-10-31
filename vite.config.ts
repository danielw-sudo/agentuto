import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  // A project page on GitHub Pages is served from a sub-path, so the deploy sets
  // VITE_BASE=/agentuto/. Anything else (local dev, custom domain, Vercel) keeps "/".
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom', 'lucide-react'],
        },
      },
    },
  },
});
