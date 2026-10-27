/* UNIGEN Desk — service worker: app shell works fully offline (data lives in IndexedDB) */
const V = 'ug-desk-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;               // API calls (script.google.com) go straight to network
  if (r.mode === 'navigate') {                            // open instantly from cache, refresh in background
    e.respondWith((async () => {
      const cache = await caches.open(V);
      const hit = await cache.match('index.html');
      const net = fetch('index.html', { cache: 'no-cache' }).then(res => { if (res.ok) cache.put('index.html', res.clone()); return res; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || Response.error();
    })());
    return;
  }
  e.respondWith(caches.match(r).then(c => c || fetch(r).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(V).then(ch => ch.put(r, cp)); }
    return res;
  })));
});
