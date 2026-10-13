// Golem OS Service Worker
//
// Caches static, non-personal assets only (Next build output + icons).
// Pages, RSC payloads and API responses carry private data and are never
// stored; they always go to the network. Caches are also wiped on sign-out.
const CACHE = 'golem-static-v2'

const isStatic = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  /^\/(icon-\d+\.png|favicon\.ico)$/.test(url.pathname)

self.addEventListener('install', () => {
  self.skipWaiting()
})

// Remove every older cache (including the v1 cache that held pages)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (!isStatic(url)) return // navigations, RSC, /api: network only

  // Static assets are content-hashed: cache-first is safe
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) cache.put(request, response.clone())
      return response
    })
  )
})
