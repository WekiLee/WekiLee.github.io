import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync, existsSync } from 'fs';

function findProjectPages() {
  const base = resolve(__dirname, 'projects');
  const entries = {};
  if (!existsSync(base)) return entries;
  const dirs = readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const d of dirs) {
    const htmlPath = resolve(base, d.name, 'index.html');
    if (existsSync(htmlPath)) {
      entries[`projects/${d.name}`] = htmlPath;
    }
  }
  return entries;
}

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...findProjectPages(),
      },
    },
  },
  publicDir: 'public',
});
