/**
 * Splash handoff
 * ──────────────
 * Controlled "React is alive" signal for the Capacitor native splash.
 *
 * Without this, the native splash relies entirely on Capacitor defaults and
 * can hang indefinitely if:
 *   - the WebView fails to reach `server.url`
 *   - the bundled `dist/` shell fails to boot
 *   - a route chunk / auth call stalls
 *
 * Strategy:
 *   1. After the first React paint (rAF + microtask), call SplashScreen.hide().
 *   2. Also arm a 2500ms fallback timer so the splash CANNOT stay forever.
 *   3. Web preview / desktop browser: no-op.
 *   4. All calls are wrapped in try/catch so a missing plugin never blocks UI.
 */
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

let handed = false;

async function hideSplashOnce(reason: string) {
  if (handed) return;
  handed = true;
  try {
    await SplashScreen.hide({ fadeOutDuration: 200 });
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info(`[splash] hidden (${reason})`);
    }
  } catch {
    /* plugin unavailable — ignore */
  }
}

export function initSplashHandoff() {
  try {
    if (!Capacitor.isNativePlatform()) return;
  } catch {
    return;
  }

  // Hide after first paint.
  if (typeof window !== "undefined" && typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void hideSplashOnce("first-paint");
      });
    });
  } else {
    void hideSplashOnce("immediate");
  }

  // Fallback: never let the native splash stay past 2.5s.
  setTimeout(() => {
    void hideSplashOnce("fallback-timeout");
  }, 2500);
}
