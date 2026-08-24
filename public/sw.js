/*
 * Let's Get Close — service worker.
 *
 * Deliberately minimal. The game is real-time and every meaningful screen
 * depends on live Supabase data, so caching game state would show couples
 * stale rooms and stale turns. This worker therefore only:
 *   1. makes the app installable (a fetch handler is required for that), and
 *   2. serves a cached app shell when the network is unavailable, so a lost
 *      connection shows the app instead of the browser's error page.
 *
 * Never cache: Supabase (auth, REST, realtime, functions) or Stripe. Those
 * are always network-only — a cached auth or payment response would be a bug.
 */

const CACHE = 'lgc-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/app-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Anything that is not our own origin (Supabase, Stripe, fonts) stays
  // network-only.
  if (url.origin !== self.location.origin) return;

  // Navigations: try the network first so a running app is always current,
  // and fall back to the cached shell only when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r || Response.error()))
    );
    return;
  }

  // Static build assets are content-hashed by Vite, so a cache hit is always
  // the right answer for them.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
});
