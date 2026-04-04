import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig(({ command }) => ({
  plugins: [vue()],
  base: command === 'build' ? './' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 8084,
    open: false,
  },
  build: {
    outDir: path.join(__dirname, '../public/guide'),
    emptyOutDir: true,
    sourcemap: false,
  },
}));

