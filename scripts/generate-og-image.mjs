// 生成社交分享封面图 (Open Graph / Twitter Card)
// 思路与 generate-github-stats.mjs 一致：纯 SVG 描述 -> resvg 渲染为 PNG
// 输出：public/og-cover.png (1200x630，符合 OG 标准尺寸)
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

// resvg 为 CJS 包；用 createRequire 加载，运行时通过 NODE_PATH 指向 managed workspace
const require = createRequire(import.meta.url);
const { Resvg } = require('@resvg/resvg-js');

const __dirname = dirname(fileURLToPath(import.meta.url));

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#1d1d1f"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- 头像圆环 -->
  <circle cx="600" cy="220" r="72" fill="#1d1d1f" stroke="#0071e3" stroke-width="3"/>
  <text x="600" y="252" font-family="Helvetica, Arial, sans-serif" font-size="84" font-weight="700" fill="#ffffff" text-anchor="middle">W</text>

  <!-- 姓名 -->
  <text x="600" y="382" font-family="Helvetica, Arial, sans-serif" font-size="70" font-weight="700" fill="#f5f5f7" text-anchor="middle">Weki Lee</text>

  <!-- 副标题 -->
  <text x="600" y="438" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#86868b" text-anchor="middle">AI &amp; Open Source Developer</text>

  <!-- 装饰线 -->
  <rect x="540" y="468" width="120" height="3" rx="1.5" fill="#0071e3"/>

  <!-- 域名 -->
  <text x="600" y="525" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#515154" text-anchor="middle" letter-spacing="2">wekilee.github.io</text>
</svg>`;

const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
const png = resvg.render().asPng();

const out = resolve(__dirname, '../public/og-cover.png');
writeFileSync(out, png);
console.log(`✅ OG image written -> ${out} (${png.length} bytes)`);
