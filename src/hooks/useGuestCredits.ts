import { useCallback, useEffect, useState } from "react";

/**
 * Guest-mode AI credit counter.
 *
 * - 5 prompts per 24-hour window
 * - Tracked in localStorage (guests have no auth/device row server-side that we trust)
 * - Resets automatically when the rolling 24h window from the first prompt elapses
 *
 * Subscribers get a server-side counter in the `ai_usage` table — this hook is
 * for guest mode only.
 */

const KEY = "rufayq_guest_ai_credits";
export const GUEST_DAILY_LIMIT = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;

interface State {
  used: number;
  windowStart: number; // ms epoch
}

const read = (): State => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { used: 0, windowStart: Date.now() };
    const parsed = JSON.parse(raw);
    if (typeof parsed?.used !== "number" || typeof parsed?.windowStart !== "number") {
      return { used: 0, windowStart: Date.now() };
    }
    // Auto-reset if window expired
    if (Date.now() - parsed.windowStart >= WINDOW_MS) {
      return { used: 0, windowStart: Date.now() };
    }
    return parsed;
  } catch {
    return { used: 0, windowStart: Date.now() };
  }
};

const write = (s: State) => {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
};

export const useGuestCredits = () => {
  const [state, setState] = useState<State>(() => read());

  // Re-check every 30s so the UI ticks over when the window resets in the background.
  useEffect(() => {
    const i = setInterval(() => {
      const fresh = read();
      setState((prev) =>
        prev.used !== fresh.used || prev.windowStart !== fresh.windowStart ? fresh : prev,
      );
    }, 30_000);
    return () => clearInterval(i);
  }, []);

  const remaining = Math.max(0, GUEST_DAILY_LIMIT - state.used);
  const resetsAt = new Date(state.windowStart + WINDOW_MS);
  const isExhausted = remaining <= 0;

  const consume = useCallback((): boolean => {
    const cur = read();
    if (cur.used >= GUEST_DAILY_LIMIT) {
      setState(cur);
      return false;
    }
    const next: State = {
      used: cur.used + 1,
      windowStart: cur.used === 0 ? Date.now() : cur.windowStart,
    };
    write(next);
    setState(next);
    return true;
  }, []);

  const reset = useCallback(() => {
    const next: State = { used: 0, windowStart: Date.now() };
    write(next);
    setState(next);
  }, []);

  return { used: state.used, remaining, limit: GUEST_DAILY_LIMIT, isExhausted, resetsAt, consume, reset };
};
