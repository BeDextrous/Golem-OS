// Golem OS Service Worker — stale-while-revalidate strategy
const CACHE = 'golem-v1'

// Pages to pre-cache on install
const SHELL = [
  '/',
  '/life',
  '/dextrous',
  '/work',
  '/focus',
]

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll fails if any request fails — use individual adds with fallback
      Promise.allSettled(SHELL.map((url) => cache.add(url)))
    )
  )
  self.skipWaiting()
})

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch: stale-while-revalidate for navigation + GET assets ─────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET requests from our own origin
  if (request.method !== 'GET') return
  if (!request.url.startsWith(self.location.origin)) return

  // Skip Next.js internals (_next/webpack-hmr, etc.) in dev
  if (request.url.includes('_next/webpack-hmr')) return
  if (request.url.includes('__nextjs')) return

  // For API routes — network-only, no caching
  if (request.url.includes('/api/')) return

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request)

      const networkFetch = fetch(request)
        .then((response) => {
          // Cache fresh successful responses
          if (response && response.ok && response.status < 400) {
            cache.put(request, response.clone())
          }
          return response
        })
        .catch(() => cached) // network failed → fall back to cache

      // Return cached immediately if available, update in background
      return cached || networkFetch
    })
  )
})
