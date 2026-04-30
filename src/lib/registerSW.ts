/**
 * Registers the offline service worker (`/sw.js`) on supported browsers.
 * No-op in dev to avoid stale caches. Imported once from `main.tsx`.
 */
export function registerOfflineSW() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.warn("[sw] registration failed", err));
  });
}
