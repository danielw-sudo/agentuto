import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Sandboxes load on demand, so an installed copy would only work offline for the ones its owner had
// already opened. This lists every built asset so the service worker can fetch them all when it installs.
const precacheManifest = (): Plugin => ({
  name: 'agentuto-precache-manifest',
  apply: 'build',
  generateBundle(_options, bundle) {
    const files = Object.keys(bundle).filter((name) => /\.(js|css)$/.test(name));
    this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) });
  },
});

// https://vite.dev/config/
export default defineConfig({
  // A project page on GitHub Pages is served from a sub-path, so the deploy sets
  // VITE_BASE=/agentuto/. Anything else (local dev, custom domain, Vercel) keeps "/".
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    tailwindcss(),
    react(),
    precacheManifest(),
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
