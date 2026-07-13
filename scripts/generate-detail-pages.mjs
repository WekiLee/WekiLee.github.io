// scripts/generate-detail-pages.mjs
// 从 public/data/projects.json 读取项目数据，
// 为每个项目生成/更新完整的详情页 HTML。
//
// 用法：
//   node scripts/generate-detail-pages.mjs              # 生成所有缺失的详情页
//   node scripts/generate-detail-pages.mjs --force      # 强制覆盖已有详情页
//   node scripts/generate-detail-pages.mjs --dry        # 仅预览，不写入
//
// 生成后可配合：
//   node scripts/inject-project-nav.mjs                 # 注入项目导航
//   node scripts/inject-detail-og.mjs                   # 注入 OG 分享图 meta

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROJECTS_DIR = join(ROOT, 'projects');
const DATA_PATH = join(ROOT, 'public', 'data', 'projects.json');

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');

function esc(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function generateDetailPage(item) {
  const id = item.id;
  const d = item.detail || {};
  const arch = d.architecture || {};
  const layers = (arch.layers || []).map(l =>
    `                    <div class="pd-arch-card">\n` +
    `                        <h4>${esc(l.name)}</h4>\n` +
    `                        <ul>${(l.items || []).map(i => `<li>${esc(i)}</li>`).join('\n                        ')}\n</ul>\n` +
    `                    </div>`
  ).join('\n');

  const highlights = (d.highlights || []).map(h =>
    `                <div class="pd-feature-card fade-in">\n` +
    `                    <h4>${esc(h.title)}</h4>\n` +
    `                    <p>${esc(h.desc)}</p>\n` +
    `                </div>`
  ).join('\n');

  const techDetail = d.techDetail || {};
  const techGroups = [];
  if (techDetail.backend?.length) techGroups.push({ name: '后端', items: techDetail.backend });
  if (techDetail.frontend?.length) techGroups.push({ name: '前端', items: techDetail.frontend });
  if (techDetail.infra?.length) techGroups.push({ name: '基础设施', items: techDetail.infra });

  const techGroupHtml = techGroups.map(g =>
    `                <div class="pd-tech-group">\n` +
    `                    <h4>${esc(g.name)}</h4>\n` +
    `                    <div class="pd-tech-tags">${g.items.map(i => `<span>${esc(i)}</span>`).join('')}</div>\n` +
    `                </div>`
  ).join('\n');

  const statusBadge = {
    '活跃开发中': '<span style="background:#007AFF;color:#fff;padding:2px 10px;border-radius:6px;font-size:11px;">活跃开发</span>',
    '稳定版': '<span style="background:#34C759;color:#fff;padding:2px 10px;border-radius:6px;font-size:11px;">稳定版</span>',
    '持续维护': '<span style="background:#FF9500;color:#fff;padding:2px 10px;border-radius:6px;font-size:11px;">持续维护</span>',
    '持续迭代': '<span style="background:#FF9500;color:#fff;padding:2px 10px;border-radius:6px;font-size:11px;">持续迭代</span>',
    '持续更新': '<span style="background:#FF9500;color:#fff;padding:2px 10px;border-radius:6px;font-size:11px;">持续更新</span>',
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
    <meta name="description" content="${esc(item.name)} — ${esc(d.subtitle || item.description)}" />
    <meta name="keywords" content="${esc([item.name, ...(item.tags || [])].join(', '))}" />
    <meta property="og:title" content="${esc(item.name)} · ${esc(d.subtitle || item.name)} — Weki Lee" />
    <meta property="og:description" content="${esc(d.overview || item.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://wekilee.github.io/projects/${esc(id)}/" />
    <meta property="og:image" content="https://wekilee.github.io/og-cover.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(item.name)} — Weki Lee" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(item.name)} — Weki Lee" />
    <title>${esc(item.name)} · ${esc(d.subtitle || item.name)} — Weki Lee</title>

    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E${encodeURIComponent(item.emoji || '?')}%3C/text%3E%3C/svg%3E" />
    <link rel="stylesheet" href="/src/css/styles.css" />
    <link rel="stylesheet" href="/src/css/project-detail.css" />
</head>
<body>

    <!-- ═══ SVG SYMBOLS ═══ -->
    <svg aria-hidden="true" style="display:none;">
        <!-- 详情页需要的图标由 styles.css / core.js 引用，此处预留占位 -->
    </svg>


    <!-- ═══ NAVIGATION ═══ -->
    <nav class="nav-apple" role="navigation" aria-label="主导航">
        <div class="container-page">
            <a href="/" class="nav-logo">Weki<span>Lee</span></a>
            <div class="nav-links" id="navLinks">
                <a href="/#about">关于</a>
                <a href="/#projects">作品</a>
                <a href="/#writing">写作</a>
                <a href="/#contact">联系</a>
            </div>
            <button id="themeToggle" class="theme-toggle" aria-label="切换到暗色模式">☀️</button>
            <button id="hamburgerBtn" class="hamburger-btn" aria-label="打开菜单" aria-expanded="false">
                <span></span><span></span><span></span>
            </button>
        </div>
        <div id="mobileMenu" class="mobile-menu" role="menu" aria-hidden="true">
            <a href="/" role="menuitem">首页</a>
            <a href="/#about" role="menuitem">关于</a>
            <a href="/#projects" role="menuitem">作品</a>
            <a href="/#writing" role="menuitem">写作</a>
            <a href="/#contact" role="menuitem">联系</a>
            <button id="themeToggleMobile" class="mobile-theme-toggle" aria-label="切换主题">🌓</button>
        </div>
    </nav>


    <!-- ═══ HERO ═══ -->
    <section class="pd-hero">
        <div class="container-page">
            <p class="section-label">${esc(item.badge || '')}</p>
            <span class="pd-hero-emoji">${esc(item.emoji)}</span>
            <h1 class="pd-hero-title">${esc(item.name)}</h1>
            <p class="pd-hero-subtitle">${esc(d.subtitle || '')}</p>
            ${item.github ? `<div class="pd-hero-actions">\n                <a href="${esc(item.github)}" target="_blank" rel="noopener noreferrer" class="btn-apple btn-apple-primary">\n                    <svg class="icon-github" aria-hidden="true"><use href="#icon-github"/></svg>\n                    查看源码\n                </a>\n                <a href="/" class="btn-apple btn-apple-secondary">\n                    <svg class="nav-back-icon" aria-hidden="true" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;"><use href="#icon-arrow-left"/></svg>\n                    返回首页\n                </a>\n            </div>` : ''}
        </div>
    </section>


    <!-- ═══ OVERVIEW ═══ -->
    <section class="pd-section" aria-labelledby="pd-overview-heading">
        <div class="container-page">
            <p class="section-label">Overview</p>
            <h2 id="pd-overview-heading" class="pd-section-title fade-in">概述</h2>
            <div class="pd-overview-card fade-in">
                <p>${esc(d.overview || item.description || '暂无概述。')}</p>
                ${(d.status ? `<p style="margin-top:12px;">${statusBadge[d.status] || esc(d.status)}</p>` : '')}
            </div>
        </div>
    </section>


    ${arch.description ? `<!-- ═══ ARCHITECTURE ═══ -->
    <section class="pd-section alt-bg" aria-labelledby="pd-arch-heading">
        <div class="container-page">
            <p class="section-label">Architecture</p>
            <h2 id="pd-arch-heading" class="pd-section-title fade-in">架构设计</h2>
            <p class="fade-in" style="color:var(--text-secondary);max-width:680px;margin-bottom:32px;">${esc(arch.description)}</p>
            <div class="pd-arch-grid">
${layers}
            </div>
        </div>
    </section>


` : ''}${highlights ? `<!-- ═══ HIGHLIGHTS ═══ -->
    <section class="pd-section" aria-labelledby="pd-highlights-heading">
        <div class="container-page">
            <p class="section-label">Highlights</p>
            <h2 id="pd-highlights-heading" class="pd-section-title fade-in">核心亮点</h2>
            <div class="pd-features-grid">
${highlights}
            </div>
        </div>
    </section>


` : ''}<!-- ═══ TECH STACK ═══ -->
    <section class="pd-section alt-bg" aria-labelledby="pd-tech-heading">
        <div class="container-page">
            <p class="section-label">Tech Stack</p>
            <h2 id="pd-tech-heading" class="pd-section-title fade-in">技术栈</h2>
            <div class="pd-tech-groups">
${techGroupHtml}
            </div>
        </div>
    </section>

    </main>

    <footer class="footer-apple">
        <div class="container-page">
            <div class="pd-footer-extra">
                <a href="/" class="pd-footer-back">
                    <svg aria-hidden="true"><use href="#icon-arrow-left"/></svg>
                    返回首页
                </a>
            </div>
            <p style="margin-bottom:2px;">
                &copy; <span id="footerYear">${new Date().getFullYear()}</span> Weki Lee.
                <span style="color:var(--text-tertiary);">开源，共享。</span>
            </p>
            <p style="font-size:11px;margin-bottom:2px;color:var(--text-tertiary);">热爱分享 &middot; 持续创造 &middot; 用 &hearts; 构建</p>
            <p style="font-size:11px;font-family:SF Mono,Menlo,monospace;color:var(--text-tertiary);opacity:0.5;">wekilee.github.io</p>
        </div>
    </footer>

    <div id="theme-announce" class="visually-hidden" aria-live="polite" aria-atomic="true"></div>
    <script type="module" src="/src/js/core.js"></script>
</body>
</html>`;
}

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  const items = data.items || [];

  if (!items.length) {
    console.error('⚠️ projects.json 为空');
    process.exit(1);
  }

  let generated = 0;
  let skipped = 0;

  for (const item of items) {
    const dir = join(PROJECTS_DIR, item.id);
    const htmlPath = join(dir, 'index.html');
    const exists = (() => { try { return !!readFileSync(htmlPath); } catch { return false; } })();

    if (exists && !FORCE) {
      console.log(`  [SKIP] ${item.id}/index.html — 已存在（用 --force 覆盖）`);
      skipped++;
      continue;
    }

    const html = generateDetailPage(item);

    if (DRY) {
      console.log(`  [DRY] ${item.id}/index.html — ${html.length} 字符`);
    } else {
      if (!exists) mkdirSync(dir, { recursive: true });
      writeFileSync(htmlPath, html, 'utf-8');
      console.log(`  ✅ ${item.id}/index.html — 已生成`);
      generated++;
    }
  }

  const action = DRY ? '[Dry-run]' : (FORCE ? '[Force]' : '[New]');
  console.log(`\n${action} 生成: ${generated}, 跳过: ${skipped}, 总计: ${items.length}`);

  if (!DRY && generated > 0) {
    console.log('\n💡 提示：生成后建议执行以下命令完善页面：');
    console.log('   node scripts/inject-project-nav.mjs       # 注入项目导航');
    console.log('   node scripts/inject-detail-og.mjs         # 确认 OG meta（生成器已内置）');
  }
}

main();
