import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { isNative, platform } from "@/lib/native";
import { consumeOverlayInternalPop } from "@/shared/ui/overlay/useOverlayBack";

/**
 * Android hardware back-button handler.
 *
 * Problem: by default Capacitor's WebView pops history on hardware back —
 * which throws Rufayq users out of the app the moment they're past the
 * initial history entry. That's a confusing experience for a single-page
 * shell with no URL-driven sub-screens.
 *
 * Behaviour we want (matches WhatsApp / Instagram conventions):
 *   1. If the in-app stack can pop (modal, sub-screen, non-Home tab),
 *      run `onBack()` to navigate one step back inside the app.
 *   2. Otherwise (we're at the root: Home tab, no overlays), the first
 *      back press shows a bilingual toast warning. A second press within
 *      ~2 seconds actually exits the app.
 *
 * Web fallback: we also listen to `popstate` so the browser back button
 * (and Android browser chrome) behaves the same way inside the PWA.
 */
interface Options {
  /** Return true if an in-app back navigation was handled. False = we're at the root. */
  onBack: () => boolean;
  /** Disable while a critical flow (e.g. OAuth redirect) is in progress. */
  enabled?: boolean;
}

const EXIT_WINDOW_MS = 2000;

export function useAndroidBackButton({ onBack, enabled = true }: Options) {
  const lastExitPromptRef = useRef<number>(0);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!enabled) return;

    const handleAttemptExit = async (exit: () => Promise<void> | void) => {
      const now = Date.now();
      if (now - lastExitPromptRef.current < EXIT_WINDOW_MS) {
        // Second tap within the window → actually leave.
        await exit();
        return;
      }
      lastExitPromptRef.current = now;
      toast("Press back again to exit", {
        description: "اضغط رجوع مرة أخرى للخروج",
        duration: EXIT_WINDOW_MS,
      });
    };

    // ----- Native (Capacitor / Android) -----
    let nativeCleanup: (() => void) | null = null;
    if (isNative && platform === "android") {
      (async () => {
        try {
          const { App } = await import("@capacitor/app");
          const handle = await App.addListener("backButton", async () => {
            const handled = onBackRef.current();
            if (handled) return;
            await handleAttemptExit(async () => {
              try { await App.exitApp(); } catch { /* noop */ }
            });
          });
          nativeCleanup = () => { handle.remove(); };
        } catch (err) {
          console.warn("[back] native back listener unavailable", err);
        }
      })();
    }

    // ----- Web / PWA fallback -----
    // We push a sentinel history entry so the browser back button fires
    // popstate instead of leaving the SPA. After handling we re-push so
    // the next back press is intercepted too.
    const SENTINEL = "rufayq-back-guard";
    const pushGuard = () => {
      try { window.history.pushState({ [SENTINEL]: true }, ""); } catch { /* noop */ }
    };
    let popHandler: ((e: PopStateEvent) => void) | null = null;
    if (!isNative) {
      pushGuard();
      popHandler = () => {
        // If this popstate is from an overlay closing (sentinel cleanup
        // called history.back()), swallow it: re-push the guard and bail.
        // Otherwise the user gets bounced out of the current tab whenever
        // they pick/cancel from a picker.
        if (consumeOverlayInternalPop()) {
          pushGuard();
          return;
        }
        const handled = onBackRef.current();
        if (handled) {
          pushGuard();
          return;
        }
        // Root: warn once, then on second press allow the browser to leave.
        const now = Date.now();
        if (now - lastExitPromptRef.current < EXIT_WINDOW_MS) {
          // Don't re-push — let the next pop actually unwind history.
          try { window.history.back(); } catch { /* noop */ }
          return;
        }
        lastExitPromptRef.current = now;
        pushGuard();
        toast("Press back again to leave", {
          description: "اضغط رجوع مرة أخرى للمغادرة",
          duration: EXIT_WINDOW_MS,
        });
      };
      window.addEventListener("popstate", popHandler);
    }

    return () => {
      nativeCleanup?.();
      if (popHandler) window.removeEventListener("popstate", popHandler);
    };
  }, [enabled]);
}
