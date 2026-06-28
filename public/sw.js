// Minimal service worker — installability only (not full offline caching).
// The app needs a live connection to Supabase, so we deliberately avoid
// caching API responses. We pre-cache the app shell so "Add to Home Screen"
// works and the app opens instantly.

const CACHE = 'lift-shell-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Never intercept Supabase / cross-origin calls — always go to network.
  if (url.origin !== self.location.origin) return

  // App shell: network-first, fall back to cache when offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (request.mode === 'navigate') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy))
        }
        return res
      })
      .catch(() => caches.match(request).then((r) => r ?? caches.match('/'))),
  )
})
