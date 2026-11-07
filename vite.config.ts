import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // File watching is disabled when DISABLE_HMR=true to save CPU during edits.
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
  build: {
    // The only chunk above 500 KB is the on-demand @react-pdf/renderer bundle
    // (fetched when a user clicks "Export PDF", never on first paint), so the
    // warning limit is raised to keep build output clean.
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        // Manual vendor splitting (P2): React core stays separate from the
        // animation/icon bundle and from the heavy docx library.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['motion/react', 'lucide-react'],
          docs: ['docx', 'file-saver'],
        },
      },
    },
  },
});
