// Minimal service worker: cache-first for assets, network-first for HTML.
// Enables offline play after first visit — critical for mobile retention.

const CACHE = 'praesidium-v1';
const PRECACHE = ['./'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // cache-first for static assets (JS/CSS/SVG/manifest)
  if (url.pathname.match(/\.(js|css|svg|json|woff2)$/)) {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request).then((r) => {
        const clone = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return r;
      })),
    );
    return;
  }
  // network-first for everything else (HTML, API)
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request)),
  );
});
