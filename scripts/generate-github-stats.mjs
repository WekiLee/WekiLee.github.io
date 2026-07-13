import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_USERNAME = 'WekiLee';
const REQUEST_TIMEOUT_MS = 15_000;
const THEMES = {
    light: {
        background: '#ffffff',
        border: '#d2d2d7',
        heading: '#1d1d1f',
        text: '#6e6e73',
        accent: '#0071e3',
        muted: '#e8f2fc'
    },
    dark: {
        background: '#161b22',
        border: '#30363d',
        heading: '#f0f6fc',
        text: '#8b949e',
        accent: '#58a6ff',
        muted: '#1f3b57'
    }
};

function escapeXml(value) {
    return String(value).replace(/[&<>'"]/g, function(character) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&apos;',
            '"': '&quot;'
        }[character];
    });
}

function formatNumber(value) {
    return new Intl.NumberFormat('zh-CN').format(Number(value) || 0);
}

function sleep(milliseconds) {
    return new Promise(function(resolve) {
        setTimeout(resolve, milliseconds);
    });
}

function getRequestHeaders() {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'wekilee-github-stats-generator'
    };

    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    return headers;
}

async function fetchResponse(url) {
    const controller = new AbortController();
    const timer = setTimeout(function() {
        controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
        return await fetch(url, {
            headers: getRequestHeaders(),
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }
}

async function requestJson(url) {
    let lastError;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const response = await fetchResponse(url);
            const isRateLimited = response.status === 429 ||
                (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0');
            const isServerError = response.status >= 500 && response.status <= 599;

            if ((isRateLimited || isServerError) && attempt === 0) {
                await sleep(isRateLimited ? 20_000 : 2_000);
                continue;
            }

            if (!response.ok) {
                throw new Error(`GitHub API 请求失败：HTTP ${response.status}`);
            }

            return {
                data: await response.json(),
                link: response.headers.get('link') || ''
            };
        } catch (error) {
            lastError = error;

            if (attempt === 0 && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
                await sleep(2_000);
                continue;
            }

            break;
        }
    }

    throw lastError;
}

function getNextPageUrl(linkHeader) {
    const nextLink = linkHeader.split(',').find(function(part) {
        return part.includes('rel="next"');
    });
    const match = nextLink && nextLink.match(/<([^>]+)>/);

    return match ? match[1] : null;
}

async function getAllRepositories() {
    const repositories = [];
    let nextUrl = `${GITHUB_API_BASE}/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`;

    while (nextUrl) {
        const response = await requestJson(nextUrl);

        if (!Array.isArray(response.data)) {
            throw new Error('GitHub 仓库接口返回了非数组数据。');
        }

        repositories.push(...response.data);
        nextUrl = getNextPageUrl(response.link);
    }

    return repositories;
}

async function mapWithConcurrency(items, limit, mapper) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await mapper(items[currentIndex]);
        }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
    await Promise.all(workers);

    return results;
}

function aggregateLanguages(languageMaps) {
    const totals = new Map();

    for (const languageMap of languageMaps) {
        for (const [language, bytes] of Object.entries(languageMap)) {
            totals.set(language, (totals.get(language) || 0) + bytes);
        }
    }

    return [...totals.entries()]
        .sort(function(left, right) {
            return right[1] - left[1];
        })
        .slice(0, 4);
}

export function renderStatsSvg(user, repositories, themeName) {
    const theme = THEMES[themeName];

    if (!theme) {
        throw new Error(`未知主题：${themeName}`);
    }

    const ownedRepositories = repositories.filter(function(repository) {
        return !repository.fork;
    });
    const totalStars = ownedRepositories.reduce(function(total, repository) {
        return total + (Number(repository.stargazers_count) || 0);
    }, 0);
    const metrics = [
        ['公开仓库', user.public_repos],
        ['获星总数', totalStars],
        ['关注者', user.followers],
        ['关注中', user.following]
    ];
    const metricNodes = metrics.map(function(metric, index) {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = column === 0 ? 28 : 218;
        const y = 80 + row * 38;

        return `<text x="${x}" y="${y}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="12" fill="${theme.text}">${escapeXml(metric[0])}</text>` +
            `<text x="${x}" y="${y + 20}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="18" font-weight="600" fill="${theme.heading}">${formatNumber(metric[1])}</text>`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160" viewBox="0 0 400 160" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(user.login || GITHUB_USERNAME)} 的 GitHub 统计</title>
  <rect x="0.5" y="0.5" width="399" height="159" rx="12" fill="${theme.background}" stroke="${theme.border}"/>
  <circle cx="28" cy="31" r="5" fill="${theme.accent}"/>
  <text x="42" y="36" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="16" font-weight="600" fill="${theme.heading}">GitHub 统计</text>
  <line x1="24" y1="51.5" x2="376" y2="51.5" stroke="${theme.border}"/>
  ${metricNodes}
</svg>`;
}

export function renderLanguagesSvg(languages, themeName) {
    const theme = THEMES[themeName];

    if (!theme) {
        throw new Error(`未知主题：${themeName}`);
    }

    const totalBytes = languages.reduce(function(total, entry) {
        return total + entry[1];
    }, 0);
    const languageNodes = languages.length === 0
        ? `<text x="24" y="95" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="13" fill="${theme.text}">暂无公开语言数据</text>`
        : languages.map(function(entry, index) {
            const language = entry[0];
            const bytes = entry[1];
            const y = 66 + index * 22;
            const percentage = totalBytes === 0 ? 0 : Math.round(bytes / totalBytes * 100);
            const barWidth = Math.max(2, Math.round(percentage / 100 * 140));

            return `<text x="24" y="${y + 9}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="12" fill="${theme.text}">${escapeXml(language)}</text>` +
                `<rect x="142" y="${y}" width="140" height="10" rx="5" fill="${theme.muted}"/>` +
                `<rect x="142" y="${y}" width="${barWidth}" height="10" rx="5" fill="${theme.accent}"/>` +
                `<text x="296" y="${y + 9}" text-anchor="end" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="11" fill="${theme.text}">${percentage}%</text>`;
        }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160" viewBox="0 0 320 160" role="img" aria-labelledby="title">
  <title id="title">最常用的编程语言</title>
  <rect x="0.5" y="0.5" width="319" height="159" rx="12" fill="${theme.background}" stroke="${theme.border}"/>
  <text x="24" y="36" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="16" font-weight="600" fill="${theme.heading}">常用语言</text>
  <line x1="24" y1="51.5" x2="296" y2="51.5" stroke="${theme.border}"/>
  ${languageNodes}
</svg>`;
}

export function validateSvg(content, fileName) {
    if (!content.trimStart().startsWith('<svg') || !content.includes('</svg>')) {
        throw new Error(`${fileName} 不是有效的 SVG 文本。`);
    }
}

async function writeOutputFiles(outputDirectory, files) {
    await mkdir(outputDirectory, { recursive: true });
    const temporaryFiles = files.map(function(file) {
        return {
            ...file,
            temporaryPath: path.join(outputDirectory, `.${file.name}.${process.pid}.tmp`)
        };
    });

    try {
        await Promise.all(temporaryFiles.map(function(file) {
            return writeFile(file.temporaryPath, file.content, 'utf8');
        }));

        for (const file of temporaryFiles) {
            await rename(file.temporaryPath, path.join(outputDirectory, file.name));
        }
    } finally {
        await Promise.all(temporaryFiles.map(async function(file) {
            try {
                await unlink(file.temporaryPath);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
        }));
    }
}

export async function main() {
    const [userResponse, repositories] = await Promise.all([
        requestJson(`${GITHUB_API_BASE}/users/${GITHUB_USERNAME}`),
        getAllRepositories()
    ]);
    const ownedRepositories = repositories.filter(function(repository) {
        return !repository.fork;
    });
    const languageMaps = await mapWithConcurrency(ownedRepositories, 4, async function(repository) {
        const response = await requestJson(repository.languages_url);

        if (!response.data || Array.isArray(response.data)) {
            throw new Error(`${repository.full_name} 的语言接口返回了无效数据。`);
        }

        return response.data;
    });
    const languages = aggregateLanguages(languageMaps);
    const files = [
        { name: 'github-stats-light.svg', content: renderStatsSvg(userResponse.data, repositories, 'light') },
        { name: 'github-stats-dark.svg', content: renderStatsSvg(userResponse.data, repositories, 'dark') },
        { name: 'top-langs-light.svg', content: renderLanguagesSvg(languages, 'light') },
        { name: 'top-langs-dark.svg', content: renderLanguagesSvg(languages, 'dark') }
    ];

    for (const file of files) {
        validateSvg(file.content, file.name);
    }

    const outputDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/assets/stats');
    await writeOutputFiles(outputDirectory, files);
    console.log(`已生成 ${files.length} 个 GitHub 统计图 SVG。`);
}

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
    main().catch(function(error) {
        console.error(`GitHub 统计图生成失败：${error.message}`);
        process.exitCode = 1;
    });
}
