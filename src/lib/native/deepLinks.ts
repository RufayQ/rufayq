/**
 * Deep-link handler — bridges Android Auto / native intents into the SPA.
 *
 * Android Auto's CarAppService dispatches `rufayq://...` URIs to the host
 * app; Capacitor's `App` plugin surfaces them via `appUrlOpen`. We translate
 * each known path into a React Router navigation + a tab/screen request that
 * `Index.tsx` already understands.
 *
 * Supported (v1 Auto scope):
 *   rufayq://meds/next            → MedicationsScreen
 *   rufayq://appointment/next     → JourneyScreen (appointments)
 *   rufayq://journey/current      → JourneyScreen
 *   rufayq://emergency            → ProfileScreen + tel: intent
 */
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { isNative } from "./index";

export type DeepLinkTarget =
  | { kind: "meds-next" }
  | { kind: "appointment-next" }
  | { kind: "journey-current" }
  | { kind: "emergency" };

export function parseDeepLink(url: string): DeepLinkTarget | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "rufayq:") return null;
    const path = `${u.host}${u.pathname}`.replace(/\/$/, "");
    switch (path) {
      case "meds/next":         return { kind: "meds-next" };
      case "appointment/next":  return { kind: "appointment-next" };
      case "journey/current":   return { kind: "journey-current" };
      case "emergency":         return { kind: "emergency" };
      default: return null;
    }
  } catch {
    return null;
  }
}

/**
 * Subscribe to incoming deep links. Returns an unsubscribe function.
 * Safe no-op on web — the listener simply never fires.
 */
export async function onDeepLink(
  cb: (target: DeepLinkTarget, raw: string) => void,
): Promise<() => void> {
  if (!isNative) return () => {};
  const handle = await App.addListener("appUrlOpen", (e: URLOpenListenerEvent) => {
    const t = parseDeepLink(e.url);
    if (t) cb(t, e.url);
  });
  return () => handle.remove();
}
