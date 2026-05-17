import { useCallback, useEffect, useState } from "react";

/**
 * Per-category notification preferences for the notifications panel.
 * Persisted to localStorage so the user's choices survive reloads.
 * "chats" controls whether unread chat threads appear alongside alerts.
 */
export type NotificationCategoryId =
  | "chats"
  | "appointments"
  | "meds"
  | "care"
  | "billing";

export type NotificationPrefs = Record<NotificationCategoryId, boolean>;

const STORAGE_KEY = "rufayq.notif.prefs.v1";

const DEFAULT_PREFS: NotificationPrefs = {
  chats: true,
  appointments: true,
  meds: true,
  care: true,
  billing: true,
};

function readStored(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

// Simple cross-hook subscription so toggles in one place sync everywhere.
const subscribers = new Set<(p: NotificationPrefs) => void>();

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(readStored);

  useEffect(() => {
    const cb = (p: NotificationPrefs) => setPrefs(p);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  const update = useCallback((next: NotificationPrefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private mode */
    }
    subscribers.forEach((cb) => cb(next));
  }, []);

  const toggle = useCallback(
    (id: NotificationCategoryId) => {
      const next = { ...prefs, [id]: !prefs[id] };
      update(next);
    },
    [prefs, update],
  );

  return { prefs, toggle, setPrefs: update };
}
