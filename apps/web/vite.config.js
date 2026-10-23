import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

// mode "static": the whole app + simulation engine in one self-contained HTML file (static hosting demo, no backend).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'static' ? [viteSingleFile()] : [])],
  define: { __EMBEDDED__: JSON.stringify(mode === 'static') },
  resolve: { alias: [
    { find: /^@gateline\/core$/, replacement: path.resolve(__dirname, '../../packages/core/src/index.js') },
    { find: /^@gateline\/core\/(.*)$/, replacement: path.resolve(__dirname, '../../packages/core/src') + '/$1' },
    { find: '@samples', replacement: path.resolve(__dirname, '../../data/samples') },
  ] },
  server: { port: 5173, host: true, proxy: { '/api': { target: process.env.API_URL || 'http://localhost:8080', changeOrigin: true } } },
  build: { outDir: mode === 'static' ? 'dist-static' : 'dist', chunkSizeWarningLimit: 3000, assetsInlineLimit: mode === 'static' ? 100000000 : 4096 },
}));
