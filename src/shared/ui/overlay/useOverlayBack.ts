import { useEffect } from "react";

/**
 * Cross-module signal: the next `popstate` was produced by an overlay's
 * own cleanup (we called `history.back()` to pop our sentinel), NOT by a
 * real user back-press. The global Android/web back guard reads this flag
 * via `consumeOverlayInternalPop()` and skips its own "back" handling so
 * users don't get bounced out of the current tab when an overlay closes.
 *
 * A module-scoped boolean is the simplest correct primitive here because:
 *   - `popstate` fires AFTER our cleanup runs, so an instance ref can't be
 *     read by the global handler at the right moment.
 *   - We only ever care about the very next event after our `history.back()`.
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
 * Part of the canonical overlay contract — do not reimplement per-section.
 */
export function useOverlayBack(open: boolean, onClose: () => void) {
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
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      // If our sentinel is still on top, pop it so we don't leak history
      // entries. Flag this pop as internal so the global Android back-guard
      // doesn't treat it as a user back-press and bounce out of the tab.
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
  }, [open, onClose]);
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
