(function() {
        'use strict';

        var html = document.documentElement;

        /* ================================================================
         *  1. 主题管理
         * ================================================================ */
        var saved = localStorage.getItem('theme') || 'light';
        html.setAttribute('data-theme', saved);

        function setThemeUI(theme) {
            var isDark = theme === 'dark';
            // 桌面端切换按钮
            var icon = document.getElementById('themeIcon');
            var toggle = document.getElementById('themeToggle');
            if (icon) icon.textContent = isDark ? '🌙' : '☀️';
            if (toggle) toggle.setAttribute('aria-label', isDark ? '切换到亮色模式' : '切换到暗色模式');
            // 移动端切换按钮
            var iconM = document.getElementById('themeIconMobile');
            var toggleM = document.getElementById('themeToggleMobile');
            if (iconM) iconM.textContent = isDark ? '🌙' : '☀️';
            if (toggleM) toggleM.setAttribute('aria-label', isDark ? '切换到亮色模式' : '切换到暗色模式');

            // 更新浏览器 chrome 主题色（移动端地址栏颜色）
            var metaGeneric = document.querySelector('meta[name="theme-color"]:not([media])');
            if (!metaGeneric) {
                metaGeneric = document.createElement('meta');
                metaGeneric.name = 'theme-color';
                document.head.appendChild(metaGeneric);
            }
            metaGeneric.content = isDark ? '#000000' : '#ffffff';
        }
        setThemeUI(saved);

        function toggleTheme() {
            var current = html.getAttribute('data-theme');
            var next = current === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            setThemeUI(next);
            var announce = document.getElementById('theme-announce');
            if (announce) {
                announce.textContent = next === 'dark' ? '已切换到暗色模式' : '已切换到亮色模式';
            }
            // 主题切换时重新加载统计图（使用新配色参数）
            updateGitHubStatsImages();
        }

        document.getElementById('themeToggle').addEventListener('click', toggleTheme);
        document.getElementById('themeToggleMobile').addEventListener('click', toggleTheme);


        /* ================================================================
         *  2. 移动端汉堡菜单
         * ================================================================ */
        var hamburger = document.getElementById('hamburgerBtn');
        var mobileMenu = document.getElementById('mobileMenu');
        var menuOpen = false;

        function openMenu() {
            menuOpen = true;
            hamburger.classList.add('open');
            mobileMenu.classList.add('open');
            hamburger.setAttribute('aria-label', '关闭菜单');
            hamburger.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            var firstLink = mobileMenu.querySelector('a');
            if (firstLink) setTimeout(function() { firstLink.focus(); }, 100);
        }

        function closeMenu() {
            menuOpen = false;
            hamburger.classList.remove('open');
            mobileMenu.classList.remove('open');
            hamburger.setAttribute('aria-label', '打开菜单');
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            hamburger.focus();
        }

        hamburger.addEventListener('click', function() {
            menuOpen ? closeMenu() : openMenu();
        });

        var menuLinks = mobileMenu.querySelectorAll('a[role="menuitem"]');
        menuLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                closeMenu();
            });
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && menuOpen) closeMenu();
        });

        document.addEventListener('click', function(e) {
            if (menuOpen && !mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
                closeMenu();
            }
        });


        /* ================================================================
         *  3. GitHub Stats 图片（亮暗主题预加载双份，CSS 控制可见性）
         * ================================================================ */
        function updateGitHubStatsImages() {
            var cacheBuster = '?v=' + new Date().toISOString().slice(0, 10);

            var lightStats = document.getElementById('gh-stats-light');
            var darkStats = document.getElementById('gh-stats-dark');
            var lightLangs = document.getElementById('gh-langs-light');
            var darkLangs = document.getElementById('gh-langs-dark');

            if (lightStats && !lightStats.src) lightStats.src = '/assets/stats/github-stats-light.svg' + cacheBuster;
            if (darkStats && !darkStats.src) darkStats.src = '/assets/stats/github-stats-dark.svg' + cacheBuster;
            if (lightLangs && !lightLangs.src) lightLangs.src = '/assets/stats/top-langs-light.svg' + cacheBuster;
            if (darkLangs && !darkLangs.src) darkLangs.src = '/assets/stats/top-langs-dark.svg' + cacheBuster;
        }


        /* ================================================================
         *  4. GitHub API — 动态获取用户统计数据
         * ================================================================ */
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

                var starsEl  = document.getElementById('stat-stars');
                var reposEl  = document.getElementById('stat-repos');
                var projsEl  = document.getElementById('stat-projects');

                if (starsEl) { starsEl.textContent = totalStars; starsEl.classList.remove('loading'); }
                if (reposEl) { reposEl.textContent = user.public_repos || '--'; reposEl.classList.remove('loading'); }
                if (projsEl) { projsEl.textContent = ownRepos.length; projsEl.classList.remove('loading'); }
            }).catch(function(err) {
                console.warn('GitHub API 请求失败，使用默认统计值:', err.message);
                var starsEl = document.getElementById('stat-stars');
                var reposEl = document.getElementById('stat-repos');
                var projsEl = document.getElementById('stat-projects');
                if (starsEl) { starsEl.textContent = '0'; starsEl.classList.remove('loading'); }
                if (reposEl) { reposEl.textContent = '19'; reposEl.classList.remove('loading'); }
                if (projsEl) { projsEl.textContent = '6';  projsEl.classList.remove('loading'); }
            });
        }


        /* ================================================================
         *  5. 滚动渐入动画 — Intersection Observer
         * ================================================================ */
        function initScrollAnimations() {
            if (!('IntersectionObserver' in window)) {
                var allFadeEls = document.querySelectorAll('.fade-in');
                for (var i = 0; i < allFadeEls.length; i++) {
                    allFadeEls[i].classList.add('visible');
                }
                return;
            }

            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                root: null,
                threshold: 0.08,
                rootMargin: '0px 0px -20px 0px'
            });

            var fadeElements = document.querySelectorAll('.fade-in');
            for (var j = 0; j < fadeElements.length; j++) {
                observer.observe(fadeElements[j]);
            }
        }


        /* ================================================================
         *  X. 动态渲染项目与技术栈
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

        function escapeHtml(text) {
            return String(text).replace(/[&<>"']/g, function(m) {
                return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
            });
        }

        function loadData() {
            Promise.all([
                fetchWithTimeout('data/projects.json', 5000).then(function(r) { return r.json(); }),
                fetchWithTimeout('data/tech-stack.json', 5000).then(function(r) { return r.json(); })
            ]).then(function(results) {
                var projectsData = results[0];
                var techData = results[1];
                if (projectsData && projectsData.items) renderProjects(projectsData.items);
                if (techData && techData.categories) renderTechStack(techData.categories);
                initScrollAnimations();
            }).catch(function(err) {
                console.warn('数据加载失败:', err.message);
            });
        }


        /* ================================================================
         *  6. 页面初始化
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
            document.getElementById('footerYear').textContent = new Date().getFullYear();
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