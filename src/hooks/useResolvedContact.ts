import { useEffect, useState } from "react";
import { resolveContact, type ResolvedContact } from "@/lib/contactResolver";

// Tiny in-memory cache so scrolling the inbox doesn't refetch per row.
const cache = new Map<string, ResolvedContact>();

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
  const cached = cacheKey ? cache.get(cacheKey) ?? null : null;
  const [contact, setContact] = useState<ResolvedContact | null>(cached);
  const [loading, setLoading] = useState<boolean>(!!cacheKey && !cached);
  useEffect(() => {
    if (!threadId || kind !== "direct") {
      setContact(null);
      setLoading(false);
      return;
    }
    const key = `${kind}:${threadId}`;
    const hit = cache.get(key);
    if (hit) {
      setContact(hit);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    resolveContact(threadId, kind).then((c) => {
      cache.set(key, c);
      if (!cancelled) {
        setContact(c);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [threadId, kind]);
  return { contact, loading };
}
