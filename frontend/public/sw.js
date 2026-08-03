// Deliberately inert service worker. This app has no offline functionality —
// its only job is to exist (satisfying the fetch-handler requirement for PWA
// installability on Android/Chrome) without caching anything. Vite's
// content-hashed asset filenames + no-cache headers on index.html already
// handle cache-busting; adding a caching layer here would just risk serving
// a stale build against a rebuilt backend.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up any caches from a future version that might add caching,
      // so "clear cache" from the app always has a clean slate to work with.
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', () => {
  // No respondWith() — let the browser handle every request normally.
})
