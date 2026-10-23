import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

// mode "playground": the whole app + simulation engine in one self-contained HTML file (hosted demo).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'playground' ? [viteSingleFile()] : [])],
  define: { __EMBEDDED__: JSON.stringify(mode === 'playground') },
  resolve: { alias: { '@gateline/core': path.resolve(__dirname, '../../packages/core/src/index.js'), '@samples': path.resolve(__dirname, '../../data/samples') } },
  server: { port: 5173, host: true, proxy: { '/api': { target: process.env.API_URL || 'http://localhost:8080', changeOrigin: true } } },
  build: { outDir: mode === 'playground' ? 'dist-playground' : 'dist', chunkSizeWarningLimit: 3000, assetsInlineLimit: mode === 'playground' ? 100000000 : 4096 },
}));
