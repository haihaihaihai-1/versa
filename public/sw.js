/* Versa · Service Worker (v15.0) - built output */
const VERSION = 'v15.0.0';
const STATIC_CACHE = `versa-static-${VERSION}`;
const RUNTIME_CACHE = `versa-runtime-${VERSION}`;
const IMAGE_CACHE = `versa-images-${VERSION}`;
const API_CACHE = `versa-api-${VERSION}`;
const STATIC_ASSETS = ['./', './index.html', './manifest.webmanifest', './offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isImage = (req) => req.destination === 'image';
const isStatic = (req) => ['script', 'style', 'font', 'manifest'].includes(req.destination) ||
  /\.(js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|avif|ico)$/i.test(new URL(req.url).pathname);
const isAPI = (url) => url.includes('/api/') || url.includes('pocketbase') || url.includes('localhost:8090');
const isHTML = (req) => req.mode === 'navigate' || (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'));

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) { if (cached) return cached; throw e; }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirst(req, timeout = 3000) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
    ]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (req.mode === 'navigate') {
      const offline = await cache.match('./offline.html');
      if (offline) return offline;
    }
    throw e;
  }
}

async function handleMutation(req) {
  try { return await fetch(req.clone()); }
  catch (e) {
    const data = await req.clone().text();
    await saveOfflineRequest({ url: req.url, method: req.method, headers: [...req.headers.entries()], body: data, ts: Date.now() });
    if ('sync' in self.registration) {
      try { await self.registration.sync.register('sync-versa-queue'); } catch {}
    }
    return new Response(JSON.stringify({ queued: true, offline: true }), { status: 202, headers: { 'Content-Type': 'application/json' } });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') {
    if (isAPI(url.href) && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      event.respondWith(handleMutation(request));
    }
    return;
  }
  if (isStatic(request)) { event.respondWith(cacheFirst(request, STATIC_CACHE)); return; }
  if (isImage(request)) { event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE)); return; }
  if (isAPI(url.href)) { event.respondWith(staleWhileRevalidate(request, API_CACHE)); return; }
  if (isHTML(request)) { event.respondWith(networkFirst(request)); return; }
});

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('versa-sw', 1);
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'ts' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveOfflineRequest(item) { const db = await openIDB(); await db.put('outbox', item); }
async function getOutboxItems() { const db = await openIDB(); return await db.getAll('outbox'); }
async function clearOutboxItem(ts) { const db = await openIDB(); await db.delete('outbox', ts); }

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-versa-queue') {
    event.waitUntil((async () => {
      const items = await getOutboxItems();
      let done = 0;
      for (const it of items) {
        try {
          const res = await fetch(it.url, { method: it.method, headers: Object.fromEntries(it.headers), body: it.body });
          if (res.ok) { await clearOutboxItem(it.ts); done++; }
        } catch {}
      }
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.postMessage({ type: 'outbox-flushed', count: done }));
    })());
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Versa', body: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Versa', {
    body: data.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png',
    data: data.url || './',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || './';
  event.waitUntil(self.clients.openWindow(url));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
  if (event.data?.type === 'GET_CACHE_SIZE') {
    event.waitUntil(caches.keys().then(async (keys) => {
      let total = 0;
      for (const k of keys) {
        const cache = await caches.open(k);
        const ks = await cache.keys();
        for (const r of ks) { const res = await cache.match(r); if (res) { const blob = await res.clone().blob(); total += blob.size; } }
      }
      event.source?.postMessage({ type: 'CACHE_SIZE', bytes: total });
    }));
  }
});
