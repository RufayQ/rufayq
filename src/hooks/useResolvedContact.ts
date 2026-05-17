import { useEffect, useState } from "react";
import { resolveContact, type ResolvedContact } from "@/lib/contactResolver";

// Tiny in-memory cache so scrolling the inbox doesn't refetch per row.
const cache = new Map<string, ResolvedContact>();

/** React hook wrapper around resolveContact(). Re-runs when threadId or kind change. */
export function useResolvedContact(
  threadId: string | null | undefined,
  kind: "direct" | "provider",
): ResolvedContact | null {
  const cacheKey = threadId ? `${kind}:${threadId}` : null;
  const [contact, setContact] = useState<ResolvedContact | null>(
    cacheKey ? cache.get(cacheKey) ?? null : null,
  );
  useEffect(() => {
    if (!threadId || kind !== "direct") {
      setContact(null);
      return;
    }
    const key = `${kind}:${threadId}`;
    const cached = cache.get(key);
    if (cached) setContact(cached);
    let cancelled = false;
    resolveContact(threadId, kind).then((c) => {
      cache.set(key, c);
      if (!cancelled) setContact(c);
    });
    return () => {
      cancelled = true;
    };
  }, [threadId, kind]);
  return contact;
}
