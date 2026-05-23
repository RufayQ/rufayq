import { useEffect } from "react";

/**
 * Lightweight LIFO back-handler registry.
 *
 * Why a registry instead of plain props?
 * The hardware/browser back button is wired once at the app shell
 * (Index.tsx), but the "right" back action depends on whatever sub-screen
 * is currently expanded — an open chat thread, a record detail sheet, etc.
 * Each of those screens calls `useBackHandler(fn, active)` to push a
 * handler while it's visible. The shell drains the stack (LIFO) before
 * falling back to the tab→home reset.
 *
 * Handlers return `true` if they consumed the back press, `false` to let
 * the next handler down the stack try.
 */
export type BackHandler = () => boolean;

const stack: BackHandler[] = [];

export function consumeBack(): boolean {
  // Iterate from top of stack downward so the most-recently mounted screen
  // gets first dibs.
  for (let i = stack.length - 1; i >= 0; i--) {
    try {
      if (stack[i]()) return true;
    } catch {
      /* swallow — a faulty handler must not lock the back button */
    }
  }
  return false;
}

/**
 * Register a back handler while `active` is true.
 * The handler should pop one level inside its own screen and return true,
 * or return false if it has nothing left to pop (letting the shell continue).
 */
export function useBackHandler(handler: BackHandler, active: boolean) {
  useEffect(() => {
    if (!active) return;
    stack.push(handler);
    return () => {
      const idx = stack.lastIndexOf(handler);
      if (idx >= 0) stack.splice(idx, 1);
    };
    // We intentionally don't depend on `handler` identity — callers should
    // keep it stable (useCallback) or accept that the latest closure runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, handler]);
}
