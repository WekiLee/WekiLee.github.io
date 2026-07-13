// Service Worker — 运行时缓存策略（无预缓存）
//
// 策略说明：
//   导航请求 (HTML)     → network-first（始终拿最新页面，离线降级到缓存）
//   静态资源 (JS/CSS/...)  → stale-while-revalidate（先给缓存秒开，后台静默更新）
//   外部请求             → 不缓存，直接透传
//
// 优势：
//   - 无预缓存清单 → 构建产物 hash 变化不影响 SW 安装（修复原 cache.addAll 因 404 失败的 bug）
//   - stale-while-revalidate → 用户每次访问都能看到更新后的版本（不再被旧缓存卡死）
//   - skipWaiting + clients.claim → 新版 SW 立即激活，无需等用户关闭所有标签页

const CACHE_PREFIX = 'wekilee-static-';

/* ================================================================
 * install — 无预缓存，直接激活
 * ================================================================ */
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

/* ================================================================
 * activate — 清理旧版本缓存 + 接管所有页面
 * ================================================================ */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          // 只清理本站前缀的旧缓存，不碰其他来源的缓存
          return key.startsWith(CACHE_PREFIX);
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* ================================================================
 * fetch — 分策略路由
 * ================================================================ */
self.addEventListener('fetch', function(event) {
  var request = event.request;

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  var url = new URL(request.url);

  // 不缓存外部请求（跨域、API 等）
  if (url.origin !== location.origin) return;

  // 导航请求 (HTML 页面)：network-first（保证内容最新）
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function(response) {
          // 成功则缓存并返回
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_PREFIX + 'pages').then(function(cache) {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(function() {
          // 离线时回退到缓存的 index.html
          return caches.match('/index.html');
        })
    );
    return;
  }

  // 静态资源 (JS/CSS/PNG/SVG/WebP/JSON/字体)：stale-while-revalidate
  event.respondWith(
    caches.match(request).then(function(cached) {
      // 有缓存就先返回（秒开），同时后台拉取更新
      var fetchPromise = fetch(request).then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
          caches.open(CACHE_PREFIX + 'assets').then(function(cache) {
            cache.put(request, response.clone());
          });
        }
        return response;
      });

      // 有缓存就直接返回（用户立刻看到），fetch 在后台跑
      if (cached) return cached;
      // 没有缓存就等网络结果
      return fetchPromise;
    })
  );
});
