import { useEffect, useRef } from "react";

/**
 * Cross-module signal: the next `popstate` was produced by an overlay's
 * own cleanup (we called `history.back()` to pop our sentinel), NOT by a
 * real user back-press. The global Android/web back guard reads this flag
 * via `consumeOverlayInternalPop()` and skips its own "back" handling so
 * users don't get bounced out of the current tab when an overlay closes.
 */
let pendingInternalPop = false;

/** Read-and-clear the internal-pop flag. Used by the global back guard. */
export function consumeOverlayInternalPop(): boolean {
  if (pendingInternalPop) {
    pendingInternalPop = false;
    return true;
  }
  return false;
}

/**
 * Wire the hardware/browser back button (popstate) and Escape key to a close
 * handler while the overlay is open. Pushes a sentinel history entry on open
 * so the first back press closes the overlay instead of leaving the screen.
 *
 * IMPORTANT: This effect deliberately depends ONLY on `open` — never on
 * `onClose`. Callers commonly pass inline arrow functions (`() => setX(false)`)
 * whose identity changes on every render. If we depended on `onClose`, the
 * effect would tear down and re-run on every re-render of the host, and the
 * cleanup's `history.back()` would emit a popstate that the freshly-mounted
 * listener immediately interpreted as a user back-press — silently closing
 * the overlay (e.g. the scanner wizard closing as soon as the user picks a
 * category). We capture the latest handler in a ref so the listener can call
 * the current `onClose` without re-subscribing.
 */
export function useOverlayBack(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;

    // Push a sentinel state so the first `back` event closes us.
    const sentinel = { __overlay: true, at: Date.now() };
    try {
      window.history.pushState(sentinel, "");
    } catch {
      /* SSR / sandbox */
    }

    const onPop = (_e: PopStateEvent) => {
      // If this popstate was triggered by our own cleanup (history.back()),
      // ignore it — it's not a real user back-press. The flag is set in the
      // previous effect's cleanup and cleared here.
      if (pendingInternalPop) {
        pendingInternalPop = false;
        return;
      }
      onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      // If our sentinel is still on top, pop it so we don't leak history
      // entries. Flag this pop as internal so neither our own listener (on a
      // re-mount) nor the global Android back-guard treats it as a real
      // back-press.
      try {
        if (window.history.state && (window.history.state as any).__overlay) {
          pendingInternalPop = true;
          window.history.back();
        }
      } catch {
        pendingInternalPop = false;
        /* noop */
      }
    };
  }, [open]);
}

/** Lock body scroll while the overlay is open. */
export function useBodyScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}
