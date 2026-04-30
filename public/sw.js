/**
 * Rufayq offline service worker
 * ─────────────────────────────
 * Handwritten (no Workbox runtime) so the bundle stays small. Strategies:
 *
 *   - Static assets (JS / CSS / fonts / images) → cache-first
 *   - HTML navigations                          → network-first, fallback to
 *                                                 cached /app shell
 *   - Supabase REST GETs for Home/Journey/Records → stale-while-revalidate
 *
 * Cache versioning uses BUILD_ID. Bumping it (during the build pipeline) is
 * what evicts old assets.
 */
const BUILD_ID = "v1";
const STATIC_CACHE = `rufayq-static-${BUILD_ID}`;
const RUNTIME_CACHE = `rufayq-runtime-${BUILD_ID}`;
const API_CACHE = `rufayq-api-${BUILD_ID}`;

const APP_SHELL = ["/", "/app", "/manifest.webmanifest", "/favicon.svg"];

// Endpoints we're allowed to cache for offline reads. Keep this list narrow
// so we never serve stale clinical data from screens we didn't intend.
const CACHEABLE_API_PATHS = [
  "/rest/v1/journeys",
  "/rest/v1/journey_steps",
  "/rest/v1/medical_records",
  "/rest/v1/medications",
  "/rest/v1/appointments",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache OAuth round-trip
  if (url.pathname.startsWith("/~oauth")) return;

  // Supabase REST GETs we care about → SWR
  if (CACHEABLE_API_PATHS.some((p) => url.pathname.includes(p))) {
    event.respondWith(staleWhileRevalidate(req, API_CACHE));
    return;
  }

  // HTML navigations → network-first w/ shell fallback
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Static assets → cache-first
  if (
    url.origin === self.location.origin &&
    /\.(js|css|woff2?|png|jpg|svg|ico)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, RUNTIME_CACHE));
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(req, res.clone());
    return res;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    return (await cache.match(req)) || (await cache.match("/app")) || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}
