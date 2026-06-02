const CACHE_VERSION = 'v1'
const STATIC_CACHE = `versa-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `versa-runtime-${CACHE_VERSION}`

const PRECACHE_URLS = [
  '/versa/',
  '/versa/manifest.webmanifest',
  '/versa/favicon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() => caches.match('/versa/').then((r) => r || caches.match(request)))
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        if (res.status === 200) {
          const copy = res.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
        }
        return res
      }).catch(() => cached)
    })
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
