const fs = require('fs');
const path = require('path');

const projectsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/projects.json'), 'utf8'));

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function renderLayer(layer) {
  let items = '';
  for (const item of layer.items) {
    items += `<li>${esc(item)}</li>`;
  }
  return `<div class="arch-layer"><h4>${esc(layer.name)}</h4><ul>${items}</ul></div>`;
}

function renderHighlight(h) {
  return `<div class="highlight-card"><h4>${esc(h.title)}</h4><p>${esc(h.desc)}</p></div>`;
}

function renderTechGroup(label, items) {
  if (!items || items.length === 0) return '';
  let lis = '';
  for (const item of items) { lis += `<li>${esc(item)}</li>`; }
  return `<div class="tech-detail-group"><h4>${esc(label)}</h4><ul>${lis}</ul></div>`;
}

function generatePage(project) {
  const d = project.detail;
  let archLayers = '';
  for (const layer of d.architecture.layers) {
    archLayers += renderLayer(layer);
  }

  let highlights = '';
  for (const h of d.highlights) {
    highlights += renderHighlight(h);
  }

  let techDetail = '';
  if (d.techDetail.backend.length > 0) techDetail += renderTechGroup('后端', d.techDetail.backend);
  if (d.techDetail.frontend.length > 0) techDetail += renderTechGroup('前端', d.techDetail.frontend);
  if (d.techDetail.infra.length > 0) techDetail += renderTechGroup('基础设施', d.techDetail.infra);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${esc(project.name)} — ${esc(d.subtitle)}" />
    <title>${esc(project.name)} · ${esc(d.subtitle)}</title>
    <link rel="stylesheet" href="/src/css/styles.css" />
    <link rel="stylesheet" href="/src/css/project-detail.css" />
</head>
<body>

    <a href="/" class="skip-link">跳到主内容</a>

    <main id="main-content" class="project-detail-page">
        <div class="container-page">

            <header class="project-detail-header">
                <a href="/" class="back-link">
                    <svg viewBox="0 0 12 12"><path d="M10 6H2M6 10l-4-4 4-4"/></svg>
                    返回首页
                </a>
                <span class="detail-emoji" aria-hidden="true">${project.emoji}</span>
                <h1>${esc(project.name)}</h1>
                <p class="detail-subtitle">${esc(d.subtitle)}</p>
                <span class="detail-status">${esc(d.status)}</span>
                <div class="detail-links">
                    <a href="${esc(project.github)}" target="_blank" rel="noopener noreferrer" class="btn-apple btn-apple-primary">
                        <svg class="icon-github" aria-hidden="true" style="width:16px;height:16px;fill:currentColor;"><use href="#icon-github"/></svg>
                        GitHub
                    </a>
                </div>
            </header>

            <section class="detail-section">
                <h2>概述</h2>
                <p>${esc(d.overview)}</p>
            </section>

            <section class="detail-section">
                <h2>架构设计</h2>
                <p>${esc(d.architecture.description)}</p>
                <div class="arch-layers">${archLayers}</div>
            </section>

            <section class="detail-section">
                <h2>核心特性</h2>
                <div class="highlights-grid">${highlights}</div>
            </section>

            <section class="detail-section">
                <h2>技术细节</h2>
                <div class="tech-detail-grid">${techDetail}</div>
            </section>

        </div>
    </main>

    <!-- SVG Icons -->
    <svg style="display:none;" aria-hidden="true">
        <symbol id="icon-github" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/>
        </symbol>
    </svg>

    <footer class="detail-footer">
        <div class="container-page text-center">
            <p style="font-size:13px;color:var(--text-secondary);">
                <a href="/" style="color:var(--color-brand);text-decoration:none;">← 返回首页</a>
            </p>
        </div>
    </footer>

</body>
</html>`;
}

for (const project of projectsData.items) {
  const dir = path.join(__dirname, '../public/projects', project.id);
  fs.mkdirSync(dir, { recursive: true });
  const html = generatePage(project);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log('Generated:', project.id);
}

console.log('All project detail pages generated.');
