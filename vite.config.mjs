import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync, existsSync } from 'fs';

// 发现指定目录下所有 <dir>/<name>/index.html 作为构建入口（projects/ 与 writing/ 通用）
function findSubdirEntries(dirName) {
  const base = resolve(__dirname, dirName);
  const entries = {};
  if (!existsSync(base)) return entries;
  const dirs = readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const d of dirs) {
    const htmlPath = resolve(base, d.name, 'index.html');
    if (existsSync(htmlPath)) {
      entries[`${dirName}/${d.name}`] = htmlPath;
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
        ...findSubdirEntries('projects'),
        ...findSubdirEntries('writing'),
      },
    },
  },
  publicDir: 'public',
});
