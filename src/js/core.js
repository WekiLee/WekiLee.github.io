// core.js — 全站共享逻辑：主题管理、移动端菜单、滚动渐入、页脚年份
// 单一来源：被首页 main.js（import）与各详情页（直接引用）复用，
// 消除此前在 5 个详情页中各自内联复制同一套脚本的维护问题。
(function() {
    'use strict';

    var html = document.documentElement;

    /* ================================================================
     * 主题管理
     * 未显式保存过偏好时，跟随系统 prefers-color-scheme（#4 改进）
     * ================================================================ */
    var saved = localStorage.getItem('theme');
    if (!saved) {
        saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    html.setAttribute('data-theme', saved);

    function setThemeUI(theme) {
        var isDark = theme === 'dark';
        var icon = document.getElementById('themeIcon');
        var toggle = document.getElementById('themeToggle');
        if (icon) icon.textContent = isDark ? '🌙' : '☀️';
        if (toggle) toggle.setAttribute('aria-label', isDark ? '切换到亮色模式' : '切换到暗色模式');
        var iconM = document.getElementById('themeIconMobile');
        var toggleM = document.getElementById('themeToggleMobile');
        if (iconM) iconM.textContent = isDark ? '🌙' : '☀️';
        if (toggleM) toggleM.setAttribute('aria-label', isDark ? '切换到亮色模式' : '切换到暗色模式');

        var meta = document.querySelector('meta[name="theme-color"]:not([media])');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        meta.content = isDark ? '#000000' : '#ffffff';
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
    }

    var dtToggle = document.getElementById('themeToggle');
    var mbToggle = document.getElementById('themeToggleMobile');
    if (dtToggle) dtToggle.addEventListener('click', toggleTheme);
    if (mbToggle) mbToggle.addEventListener('click', toggleTheme);


    /* ================================================================
     * 移动端汉堡菜单
     * ================================================================ */
    var hamburger = document.getElementById('hamburgerBtn');
    var mobileMenu = document.getElementById('mobileMenu');
    if (hamburger && mobileMenu) {
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
    }


    /* ================================================================
     * 滚动渐入动画 — Intersection Observer（全站统一初始化）
     * 注意：首页项目卡片是 renderProjects 异步注入的新节点，
     * 本函数在加载时先观察当前 DOM；首页渲染后通过 window.initScrollAnimations
     * 再次调用，补充观察新注入的卡片。
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
    initScrollAnimations();

    // 暴露给首页：项目卡片异步注入后需再次初始化滚动观察（见 main.js）
    window.initScrollAnimations = initScrollAnimations;


    /* ================================================================
     * 页脚年份
     * ================================================================ */
    var yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
