// scripts/inject-project-nav.mjs
// 从 public/data/projects.json 读取项目顺序，
// 往每个 projects/*/index.html 的 <footer> 区域插入「上一个 / 下一个项目」导航。
//
// 用法：node scripts/inject-project-nav.mjs [--dry]
//   --dry  只打印改动，不实际写入

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROJECTS_DIR = join(ROOT, 'projects');
const DATA_PATH = join(ROOT, 'public', 'data', 'projects.json');

// 注入锚点：footer 区域的 .pd-footer-empty 容器（详情页模板中 footer 的操作区）
// 将三栏导航 [上一个 | 返回首页 | 下一个] 直接注入其中
const ANCHOR_REGEX = /(<div class="pd-footer-extra">)/;

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function main() {
  const dry = process.argv.includes('--dry');
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  const items = data.items;
  const ids = items.map(p => p.id);

  if (!ids.length) {
    console.error('⚠️ projects.json 中没有项目');
    process.exit(1);
  }

  let totalChanged = 0;

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const htmlPath = join(PROJECTS_DIR, id, 'index.html');

    try {
      let html = readFileSync(htmlPath, 'utf-8');

      // 如果已经用新格式（含 pd-footer-actions wrapper）注入过就跳过
      if (html.includes('class="pd-footer-actions"')) {
        if (dry) console.log(`  [SKIP] ${id}/index.html — 已存在导航（新格式）`);
        continue;
      }

      // 旧格式残留清理
      html = html.replace(/<nav class="pd-proj-nav"[\s\S]*?<\/nav>\n?/g, '');
      html = html.replace(/<a\s+href="\/"\s+class="pd-footer-back[^"]*">[\s\S]*?<\/a>\n?/g, '');

      // 构建三栏导航 HTML：[上一个] — [返回首页] — [下一个]（纯文字，统一风格）
      const prev = i > 0 ? items[i - 1] : null;
      const next = i < ids.length - 1 ? items[i + 1] : null;

      let navHtml = '\n                <div class="pd-footer-actions">';

      // 左侧：上一个
      if (prev) {
        navHtml += `\n                    <a href="/projects/${prev.id}/" class="pd-proj-nav__link pd-proj-nav__prev">`;
        navHtml += `<svg aria-hidden="true"><use href="#icon-arrow-left"/></svg> 上一个`;
        navHtml += `</a>`;
      } else {
        navHtml += `\n                    <span class="pd-proj-nav__empty"></span>`;
      }

      // 中间：返回首页（↑ 向上 = 回到顶层）
      navHtml += '\n                    <a href="/" class="pd-footer-back pd-footer-back--center">';
      navHtml += '\n                        <svg aria-hidden="true"><use href="#icon-arrow-up"/></svg>';
      navHtml += '\n                        返回首页';
      navHtml += '\n                    </a>';

      // 右侧：下一个
      if (next) {
        navHtml += `\n                    <a href="/projects/${next.id}/" class="pd-proj-nav__link pd-proj-nav__next">`;
        navHtml += `下一个 <svg aria-hidden="true"><use href="#icon-arrow-right"/></svg>`;
        navHtml += `</a>`;
      } else {
        navHtml += `\n                    <span class="pd-proj-nav__empty"></span>`;
      }

      navHtml += '\n                </div>';

      // 在「返回首页」链接之后注入
      if (!ANCHOR_REGEX.test(html)) {
        console.error(`  [ERROR] ${id}/index.html — 未找到锚点「返回首页」`);
        continue;
      }

      html = html.replace(ANCHOR_REGEX, `$1${navHtml}`);

      if (dry) {
        console.log(`  [DRY] ${id}/index.html ← 上一个: ${prev?.id || '(无)'} | 下一个: ${next?.id || '(无)'}`);
      } else {
        writeFileSync(htmlPath, html, 'utf-8');
        console.log(`  ✅ ${id}/index.html ← 上一个: ${prev?.id || '(无)'} | 下一个: ${next?.id || '(无)'}`);
        totalChanged++;
      }
    } catch (err) {
      console.error(`  [ERROR] ${id}/index.html: ${err.message}`);
    }
  }

  if (!dry && totalChanged > 0) {
    console.log(`\n✅ 共注入 ${totalChanged} 个详情页的项目导航`);
  } else if (dry) {
    console.log('\n[Dry-run 完成，未写入文件]');
  }
}

main();
