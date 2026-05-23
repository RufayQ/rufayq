import { useEffect } from "react";

/**
 * Lightweight LIFO back-handler registry with optional labels for dev debug.
 *
 * Why a registry instead of plain props?
 * The hardware/browser back button is wired once at the app shell
 * (Index.tsx), but the "right" back action depends on whatever sub-screen
 * is currently expanded — an open chat thread, a record detail sheet, an
 * attachment preview, etc. Each of those screens calls
 * `useBackHandler(fn, active, label?)` to push a handler while it's
 * visible. The shell drains the stack (LIFO) before falling back to the
 * tab → home reset.
 *
 * Handlers return `true` if they consumed the back press, `false` to let
 * the next handler down the stack try.
 */
export type BackHandler = () => boolean;

interface Entry { handler: BackHandler; label: string; }

const stack: Entry[] = [];

/** Last-consumed info, surfaced by the dev overlay. */
export interface BackDebugEvent {
  consumedBy: string | null;
  remainingStack: string[];
  at: number;
}
let lastEvent: BackDebugEvent | null = null;
const DEBUG_EVENT = "rufayq:back-debug";

export function getBackStackLabels(): string[] {
  return stack.map((e) => e.label);
}
export function getLastBackEvent(): BackDebugEvent | null { return lastEvent; }

function emit(consumedBy: string | null) {
  lastEvent = { consumedBy, remainingStack: getBackStackLabels(), at: Date.now() };
  try { window.dispatchEvent(new CustomEvent(DEBUG_EVENT, { detail: lastEvent })); } catch { /* noop */ }
}

export function consumeBack(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) {
    try {
      if (stack[i].handler()) { emit(stack[i].label); return true; }
    } catch {
      /* swallow — a faulty handler must not lock the back button */
    }
  }
  emit(null);
  return false;
}

/** Manually emit a debug event from outside the stack (Index shell branches). */
export function logBackBranch(branch: string) { emit(branch); }

/**
 * Register a back handler while `active` is true.
 * The handler should pop one level inside its own screen and return true,
 * or return false if it has nothing left to pop (letting the shell continue).
 */
export function useBackHandler(handler: BackHandler, active: boolean, label = "unknown") {
  useEffect(() => {
    if (!active) return;
    const entry: Entry = { handler, label };
    stack.push(entry);
    try { window.dispatchEvent(new CustomEvent(DEBUG_EVENT, { detail: { consumedBy: null, remainingStack: getBackStackLabels(), at: Date.now() } })); } catch { /* noop */ }
    return () => {
      const idx = stack.lastIndexOf(entry);
      if (idx >= 0) stack.splice(idx, 1);
      try { window.dispatchEvent(new CustomEvent(DEBUG_EVENT, { detail: { consumedBy: null, remainingStack: getBackStackLabels(), at: Date.now() } })); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, handler, label]);
}
