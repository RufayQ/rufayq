import { useEffect } from "react";

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
      // If our sentinel is still on top, pop it so we don't leak history entries.
      try {
        if (window.history.state && (window.history.state as any).__overlay) {
          window.history.back();
        }
      } catch {
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
