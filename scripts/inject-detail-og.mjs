// scripts/inject-detail-og.mjs
// 往每个 projects/*/index.html 的 <head> 中注入 og:image / twitter:card meta，
// 让详情页分享时有封面缩略图。
//
// 用法：node scripts/inject-detail-og.mjs [--dry]

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROJECTS_DIR = join(ROOT, 'projects');
const DATA_PATH = join(ROOT, 'public', 'data', 'projects.json');

// 注入锚点：og:type 之后
const ANCHOR_REGEX = /(<meta property="og:type" content="website" \/>)/;

function main() {
  const dry = process.argv.includes('--dry');
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  const items = data.items || [];

  // 建立 id→item 映射
  const itemMap = {};
  items.forEach(p => { itemMap[p.id] = p; });

  const projectDirs = readdirSync(PROJECTS_DIR).filter(name => {
    return statSync(join(PROJECTS_DIR, name)).isDirectory();
  });

  let totalChanged = 0;

  for (const id of projectDirs) {
    const htmlPath = join(PROJECTS_DIR, id, 'index.html');
    try {
      let html = readFileSync(htmlPath, 'utf-8');

      if (html.includes('og:image')) {
        if (dry) console.log(`  [SKIP] ${id}/index.html — 已有 og:image`);
        continue;
      }

      const item = itemMap[id] || {};
      const name = item.name || id;

      const ogMeta =
        '\n    <meta property="og:url" content="https://wekilee.github.io/projects/' + id + '/" />' +
        '\n    <meta property="og:image" content="https://wekilee.github.io/og-cover.png" />' +
        '\n    <meta property="og:image:width" content="1200" />' +
        '\n    <meta property="og:image:height" content="630" />' +
        '\n    <meta property="og:image:alt" content="' + name.replace(/[&<>"']/g, '') + ' — Weki Lee" />' +
        '\n    <meta name="twitter:card" content="summary_large_image" />' +
        '\n    <meta name="twitter:title" content="' + name.replace(/[&<>"']/g, '') + ' — Weki Lee" />';

      if (!ANCHOR_REGEX.test(html)) {
        console.error(`  [ERROR] ${id}/index.html — 未找到 og:type 锚点`);
        continue;
      }

      html = html.replace(ANCHOR_REGEX, `$1${ogMeta}`);

      if (dry) {
        console.log(`  [DRY] ${id}/index.html ← og:image + twitter:card`);
      } else {
        writeFileSync(htmlPath, html, 'utf-8');
        console.log(`  ✅ ${id}/index.html ← og:image + twitter:card`);
        totalChanged++;
      }
    } catch (err) {
      console.error(`  [ERROR] ${id}/index.html: ${err.message}`);
    }
  }

  if (!dry && totalChanged > 0) {
    console.log(`\n✅ 共注入 ${totalChanged} 个详情页的 OG 分享图 meta`);
  } else if (dry) {
    console.log('\n[Dry-run 完成]');
  }
}

main();
