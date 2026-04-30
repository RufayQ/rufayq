/**
 * SW lifecycle helper.
 *
 * Lovable previews run inside an iframe; a caching service worker would
 * lock devices to a stale shell. We therefore:
 *   - Never register a real SW from this codebase.
 *   - Actively unregister any leftover SW from earlier builds.
 *   - Clean up its caches so nothing is served from disk.
 *
 * Call once from `main.tsx`. Safe to call repeatedly.
 */
export function registerOfflineSW() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // Always run in dev/preview AND prod — we want to remove any historical
  // worker from any device that ever installed it.
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {
      /* ignore — private mode etc. */
    });

  if ("caches" in window) {
    caches
      .keys()
      .then((keys) => keys.forEach((k) => caches.delete(k)))
      .catch(() => {
        /* ignore */
      });
  }
}
