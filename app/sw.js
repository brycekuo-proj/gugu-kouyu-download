/* 咕咕英语口语 · 离线缓存
 * 页面：先联网取最新，断网时用缓存；录音和图标：先用缓存，没有再联网并存起来。 */
const CACHE = 'gzky-1.1.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('gzky-') && k !== CACHE && k !== 'gzky-audio').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // 录音文件名是内容哈希，永不变化，单独放一个跨版本的缓存
  if (url.pathname.includes('/audio/')) {
    if (req.headers.has('range')) return; // 交给网络，避免 Safari 范围请求出错
    e.respondWith(caches.open('gzky-audio').then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
