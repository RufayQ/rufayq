import { useEffect, useState } from "react";
import { resolveContact, type ResolvedContact } from "@/lib/contactResolver";

/** React hook wrapper around resolveContact(). Re-runs when threadId or kind change. */
export function useResolvedContact(
  threadId: string | null | undefined,
  kind: "direct" | "provider",
): ResolvedContact | null {
  const [contact, setContact] = useState<ResolvedContact | null>(null);
  useEffect(() => {
    if (!threadId || kind !== "direct") {
      setContact(null);
      return;
    }
    let cancelled = false;
    resolveContact(threadId, kind).then((c) => {
      if (!cancelled) setContact(c);
    });
    return () => {
      cancelled = true;
    };
  }, [threadId, kind]);
  return contact;
}
