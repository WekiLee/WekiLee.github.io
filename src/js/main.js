import './core.js';

(function() {
    'use strict';

    /* ================================================================
     *  GitHub Stats 图片（亮暗主题预加载双份，CSS 控制可见性）
     *  主题切换时图片显隐由 styles.css 的 [data-theme] 规则控制，
     *  无需在 JS 中重新加载 src。
     * ================================================================ */
    function updateGitHubStatsImages() {
        var lightStats = document.getElementById('gh-stats-light');
        var darkStats = document.getElementById('gh-stats-dark');
        var lightLangs = document.getElementById('gh-langs-light');
        var darkLangs = document.getElementById('gh-langs-dark');

        if (lightStats && !lightStats.src) lightStats.src = '/assets/stats/github-stats-light.svg';
        if (darkStats && !darkStats.src) darkStats.src = '/assets/stats/github-stats-dark.svg';
        if (lightLangs && !lightLangs.src) lightLangs.src = '/assets/stats/top-langs-light.svg';
        if (darkLangs && !darkLangs.src) darkLangs.src = '/assets/stats/top-langs-dark.svg';
    }


    /* ================================================================
     *  GitHub API — 动态获取用户统计数据
     * ================================================================ */
    function applyStatFallback(stars, repos, projs) {
        var starsEl = document.getElementById('stat-stars');
        var reposEl = document.getElementById('stat-repos');
        var projsEl = document.getElementById('stat-projects');
        if (starsEl) { starsEl.textContent = String(stars ?? 0); starsEl.classList.remove('loading'); }
        if (reposEl) { reposEl.textContent = String(repos ?? 0); reposEl.classList.remove('loading'); }
        if (projsEl) { projsEl.textContent = String(projs ?? 0); projsEl.classList.remove('loading'); }
    }

    function fetchWithTimeout(url, timeoutMs) {
        return new Promise(function(resolve, reject) {
            var controller = new AbortController();
            var timer = setTimeout(function() {
                controller.abort();
                reject(new Error('Request timeout'));
            }, timeoutMs || 5000);
            fetch(url, { signal: controller.signal })
                .then(function(r) {
                    clearTimeout(timer);
                    resolve(r);
                })
                .catch(function(err) {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    }

    function fetchGitHubStats() {
        Promise.all([
            fetchWithTimeout('https://api.github.com/users/WekiLee', 5000).then(function(r) { return r.json(); }),
            fetchWithTimeout('https://api.github.com/users/WekiLee/repos?per_page=100&sort=updated', 5000).then(function(r) { return r.json(); })
        ]).then(function(results) {
            var user = results[0];
            var repos = Array.isArray(results[1]) ? results[1] : [];

            var totalStars = repos.reduce(function(sum, repo) {
                return sum + (repo.stargazers_count || 0);
            }, 0);

            var ownRepos = repos.filter(function(r) { return !r.fork; });

            applyStatFallback(totalStars, user.public_repos || 0, ownRepos.length);
        }).catch(function(err) {
            console.warn('GitHub API 请求失败，尝试本地 fallback:', err.message);
            // 优先从 stats.json 读取 fallback 值（统一数据源）
            fetch('data/stats.json').then(function(r) { return r.json(); }).then(function(data) {
                var fb = (data && data.fallback) ? data.fallback : {};
                applyStatFallback(fb.stars, fb.publicRepos, fb.ownRepos);
            }).catch(function() {
                // stats.json 也加载失败时使用硬编码兜底
                applyStatFallback(0, 19, 6);
            });
        });
    }


    /* ================================================================
     *  动态渲染项目与技术栈
     * ================================================================ */
    function renderProjects(items) {
        var grid = document.getElementById('projects-grid');
        if (!grid) return;
        var markup = '';
        for (var i = 0; i < items.length; i++) {
            var p = items[i];
            var tags = '';
            for (var t = 0; t < p.tags.length; t++) {
                tags += '<span>' + escapeHtml(p.tags[t]) + '</span>';
            }
            var features = '';
            for (var f = 0; f < p.features.length; f++) {
                features += '<li>' + escapeHtml(p.features[f]) + '</li>';
            }
            var tierClass = p.tier === 'primary' ? '' : ' minor';
            markup += '<article class="project-card-apple flex flex-col fade-in' + tierClass + '">' +
                '<div>' +
                    '<span class="project-badge">' + escapeHtml(p.badge) + '</span>' +
                    '<h3><span aria-hidden="true">' + p.emoji + '</span> ' + escapeHtml(p.name) + '</h3>' +
                    '<p class="project-desc">' + escapeHtml(p.description) + '</p>' +
                    '<div class="project-tags">' + tags + '</div>' +
                    '<ul class="project-features">' + features + '</ul>' +
                '</div>' +
                '<div class="mt-auto">' +
                    '<a href="/projects/' + escapeHtml(p.id) + '/" class="btn-project">' +
                        '<svg class="icon-github" aria-hidden="true"><use href="#icon-github"/></svg>' +
                        '详细了解' +
                    '</a>' +
                '</div>' +
            '</article>';
        }
        grid.innerHTML = markup;
    }

    function renderTechStack(categories) {
        var grid = document.getElementById('tech-grid');
        if (!grid) return;
        var markup = '';
        for (var i = 0; i < categories.length; i++) {
            var c = categories[i];
            var items = '';
            for (var j = 0; j < c.items.length; j++) {
                items += '<li>' + escapeHtml(c.items[j]) + '</li>';
            }
            markup += '<div class="tech-category fade-in">' +
                '<h3>' + escapeHtml(c.title) + '</h3>' +
                '<ul class="space-y-3">' + items + '</ul>' +
            '</div>';
        }
        grid.innerHTML = markup;
    }

    function renderPosts(items) {
        var grid = document.getElementById('posts-grid');
        if (!grid || !items || !items.length) return;
        grid.style.display = ''; // 确保容器可见
        var markup = '';
        for (var i = 0; i < items.length; i++) {
            var p = items[i];
            var tags = '';
            if (p.tags) {
                for (var t = 0; t < p.tags.length; t++) {
                    tags += '<span>' + escapeHtml(p.tags[t]) + '</span>';
                }
            }
            var sourceLabel = { 'site': '站内文章', 'wechat': '公众号', 'xiaohongshu': '小红书', 'external': '外部链接' };
            var src = sourceLabel[p.source] || '文章';
            var targetAttr = (p.url && p.url.startsWith('http')) ? ' target="_blank" rel="noopener noreferrer"' : '';
            markup += '<article class="post-card-apple fade-in">' +
                '<div class="post-card__header">' +
                    '<span class="post-card__source">' + escapeHtml(src) + '</span>' +
                    (p.date ? '<time class="post-card__date" datetime="' + escapeHtml(p.date) + '">' + escapeHtml(p.date) + '</time>' : '') +
                '</div>' +
                '<h3 class="post-card__title"><a href="' + escapeHtml(p.url || '#') + '"' + targetAttr + '>' + escapeHtml(p.title) + '</a></h3>' +
                '<p class="post-card__summary">' + escapeHtml(p.summary) + '</p>' +
                (tags ? '<div class="post-card__tags">' + tags + '</div>' : '') +
            '</article>';
        }
        grid.innerHTML = markup;
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, function(m) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
        });
    }

    function loadData() {
        Promise.all([
            fetchWithTimeout('data/projects.json', 5000).then(function(r) { return r.json(); }),
            fetchWithTimeout('data/tech-stack.json', 5000).then(function(r) { return r.json(); }),
            fetchWithTimeout('data/posts.json', 5000).then(function(r) { return r.json(); }).catch(function() { return null; })
        ]).then(function(results) {
            var projectsData = results[0];
            var techData = results[1];
            var postsData = results[2];
            if (projectsData && projectsData.items) renderProjects(projectsData.items);
            if (techData && techData.categories) renderTechStack(techData.categories);
            if (postsData && postsData.items) renderPosts(postsData.items);
            // 项目卡片与文章卡片为异步注入的新节点，渲染后需重新初始化滚动观察（core.js 已暴露）
            if (window.initScrollAnimations) window.initScrollAnimations();
        }).catch(function(err) {
            console.warn('数据加载失败，降级为静态显示:', err.message);
            if (window.initScrollAnimations) window.initScrollAnimations();
        });
    }


    /* ================================================================
     *  页面初始化
     * ================================================================ */
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(function(reg) {
                console.log('Service Worker 注册成功:', reg.scope);
            }).catch(function(err) {
                console.warn('Service Worker 注册失败:', err);
            });
        }
    }

    function init() {
        updateGitHubStatsImages();
        fetchGitHubStats();
        loadData();
        registerServiceWorker();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
