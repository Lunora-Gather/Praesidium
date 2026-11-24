// Production injects an integrity manifest for the whole release. Never mix releases.
const RELEASE = 'praesidium-development';
const REVISION = 'development';
const PRECACHE = [];

const scope = self.registration.scope;
const prefix = `praesidium:${scope}:`;
const cacheName = `${prefix}${RELEASE}-${REVISION}`;
const shell = new URL('./index.html', scope);
const root = new URL(scope);
const assets = new Map(PRECACHE.map(([path, digest]) => [new URL(path, scope).href, digest]));

async function verified(url, expected) {
  const response = await fetch(new Request(url, { cache: 'reload', redirect: 'error' }));
  if (!response.ok) throw new Error(`Incomplete release: ${url} returned ${response.status}`);
  const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== expected) throw new Error(`Release integrity mismatch: ${url}`);
  return response;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    if (!assets.has(shell.href)) throw new Error('Offline manifest is missing its shell');
    const responses = await Promise.all([...assets].map(async ([url, expected]) => [url, await verified(url, expected)]));
    const cache = await caches.open(cacheName);
    try {
      await Promise.all(responses.map(([url, response]) => cache.put(url, response)));
    } catch (error) {
      await caches.delete(cacheName);
      throw error;
    }
    // No skipWaiting: active clients keep this release until their tabs close.
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'praesidium:progress-protocol') event.ports[0]?.postMessage('indexeddb-v1');
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function serve(url) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(url);
  if (cached) return cached;
  // Even when recovering an evicted resource, accept only bytes from this release.
  try {
    const response = await verified(url, assets.get(url));
    await cache.put(url, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  const url = new URL(request.url);
  if (request.mode === 'navigate' && (url.pathname === root.pathname || url.pathname === shell.pathname)) {
    event.respondWith(serve(shell.href));
  } else if (assets.has(url.href)) event.respondWith(serve(url.href));
});
