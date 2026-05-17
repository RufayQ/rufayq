import { useEffect, useState } from "react";
import { resolveContact, type ResolvedContact } from "@/lib/contactResolver";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// In-memory cache with TTL + realtime invalidation
// ---------------------------------------------------------------------------
// Why: scrolling the inbox shouldn't refetch per row, but profile photos /
// display names DO change mid-session (user uploads avatar, links Google,
// edits name). Without invalidation those rows show stale data for the rest
// of the session.
//
// Strategy:
//   1. Each entry has a fetched-at timestamp; reads older than TTL re-resolve.
//   2. Subscribers (the hook) can be notified to refetch via a version bump.
//   3. A single realtime channel watches public.profiles UPDATEs and drops
//      every cache entry whose otherDeviceId matches the changed row.
//   4. invalidateContactCache(threadId?) is exported for manual busting
//      (e.g. after the current user edits their own profile, or for tests).

type Entry = { contact: ResolvedContact; fetchedAt: number };

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, Entry>();

// Per-key subscribers so an avatar update for ONE contact only re-renders the
// hooks watching that contact — not every mounted inbox row. A small "*"
// bucket handles global invalidations.
const keySubs = new Map<string, Set<() => void>>();
const GLOBAL = "*";
let realtimeStarted = false;
let notifyScheduled = false;
const pendingKeys = new Set<string>();

function scheduleNotify(key: string) {
  pendingKeys.add(key);
  if (notifyScheduled) return;
  notifyScheduled = true;
  // Coalesce bursts of cache mutations (e.g. realtime UPDATE + manual
  // invalidate) into a single render pass per affected key.
  queueMicrotask(() => {
    notifyScheduled = false;
    const keys = Array.from(pendingKeys);
    pendingKeys.clear();
    const fired = new Set<() => void>();
    for (const k of keys) {
      const subs = keySubs.get(k);
      if (subs) for (const cb of subs) fired.add(cb);
    }
    // Global subscribers always get notified once per flush.
    const globals = keySubs.get(GLOBAL);
    if (globals) for (const cb of globals) fired.add(cb);
    fired.forEach((cb) => cb());
  });
}

function subscribeKey(key: string, cb: () => void): () => void {
  let set = keySubs.get(key);
  if (!set) { set = new Set(); keySubs.set(key, set); }
  set.add(cb);
  return () => {
    const s = keySubs.get(key);
    if (!s) return;
    s.delete(cb);
    if (s.size === 0) keySubs.delete(key);
  };
}

/** Drop one or all entries from the cache and re-render every active hook. */
export function invalidateContactCache(threadId?: string) {
  if (!threadId) {
    cache.clear();
    scheduleNotify(GLOBAL);
  } else {
    for (const key of cache.keys()) {
      if (key.endsWith(`:${threadId}`)) {
        cache.delete(key);
        scheduleNotify(key);
      }
    }
  }
}

function dropByDeviceId(deviceId: string) {
  for (const [key, entry] of cache) {
    if (entry.contact.otherDeviceId === deviceId) {
      cache.delete(key);
      scheduleNotify(key);
    }
  }
}

function ensureRealtime() {
  if (realtimeStarted) return;
  realtimeStarted = true;
  try {
    supabase
      .channel("resolved-contact-cache")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const next = (payload.new ?? {}) as { device_id?: string | null };
          const prev = (payload.old ?? {}) as { device_id?: string | null };
          const id = next.device_id ?? prev.device_id;
          if (id) dropByDeviceId(id);
        },
      )
      .subscribe();
  } catch {
    // Realtime isn't critical; TTL still keeps things fresh.
    realtimeStarted = false;
  }
}

function readCache(key: string): ResolvedContact | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.contact;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** React hook wrapper around resolveContact(). Re-runs when threadId or kind change. */
export function useResolvedContact(
  threadId: string | null | undefined,
  kind: "direct" | "provider",
): ResolvedContact | null {
  return useResolvedContactState(threadId, kind).contact;
}

/** Same as useResolvedContact but also reports a `loading` flag for skeleton UIs. */
export function useResolvedContactState(
  threadId: string | null | undefined,
  kind: "direct" | "provider",
): { contact: ResolvedContact | null; loading: boolean } {
  const cacheKey = threadId && kind === "direct" ? `${kind}:${threadId}` : null;
  const cached = cacheKey ? readCache(cacheKey) : null;
  const [contact, setContact] = useState<ResolvedContact | null>(cached);
  const [loading, setLoading] = useState<boolean>(!!cacheKey && !cached);
  // Bump on cache invalidation so the effect below re-runs and refetches.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    ensureRealtime();
    // Only subscribe to this hook's own key (plus the global bucket for
    // wholesale clears) so unrelated invalidations don't trigger renders.
    const cb = () => setVersion((v) => v + 1);
    const unsubKey = cacheKey ? subscribeKey(cacheKey, cb) : () => {};
    const unsubGlobal = subscribeKey(GLOBAL, cb);
    return () => { unsubKey(); unsubGlobal(); };
  }, [cacheKey]);

  useEffect(() => {
    if (!threadId || kind !== "direct") {
      setContact(null);
      setLoading(false);
      return;
    }
    const key = `${kind}:${threadId}`;
    const hit = readCache(key);
    if (hit) {
      setContact(hit);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    resolveContact(threadId, kind).then((c) => {
      cache.set(key, { contact: c, fetchedAt: Date.now() });
      if (!cancelled) {
        setContact(c);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [threadId, kind, version]);

  return { contact, loading };
}
