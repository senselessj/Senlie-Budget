const STATIC_CACHE = 'senlie-static-v4'
const OFFLINE_URL = '/offline.html'
const STATIC_ASSETS = [
  OFFLINE_URL,
  '/logo.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never cache authenticated/API/third-party financial data.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // For pages, always prefer the network so authenticated state and app updates stay fresh.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // Cache immutable Next.js static assets and Senlie's public app assets only.
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    STATIC_ASSETS.includes(url.pathname)

  if (!isStatic) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)

      return cached || fresh
    })
  )
})
