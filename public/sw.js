/**
 * Kill-switch service worker.
 *
 * The previous version of this file shipped a real cache. That conflicts
 * with Lovable's preview iframe model and can serve stale shells to users
 * who already registered the old SW. This worker replaces it on next
 * visit, deletes every cache, navigates open windows once to bust state,
 * and unregisters itself. Keep this file in place for at least one
 * release cycle, then delete it.
 *
 * Offline behavior now lives in `src/lib/offline/cache.ts` (in-memory +
 * sessionStorage), which does not require a service worker.
 */
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      await self.clients.claim();
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      await Promise.all(
        clients.map((c) => {
          const url = new URL(c.url);
          url.searchParams.set("sw-cleanup", Date.now().toString());
          return c.navigate(url.toString());
        }),
      );
      await self.registration.unregister();
    })(),
  ),
);
