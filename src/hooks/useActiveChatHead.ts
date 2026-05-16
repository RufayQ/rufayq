import { useCallback, useEffect, useState } from "react";
import { useChatInbox, type ChatThreadRow } from "@/hooks/useChatInbox";

const POS_KEY = "rufayq.chathead.pos.v1";
const PIN_KEY = "rufayq.chathead.pinned.v1";
const DISMISS_KEY = "rufayq.chathead.dismissed.v1";

type StoredPos = { y: number; side: "left" | "right" };

function readPos(): StoredPos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return { y: 0.55, side: "right" };
    return JSON.parse(raw) as StoredPos;
  } catch {
    return { y: 0.55, side: "right" };
  }
}
function writePos(p: StoredPos) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function readPinned(): string | null {
  try { return localStorage.getItem(PIN_KEY); } catch { return null; }
}
function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch { return new Set(); }
}
function writeDismissed(s: Set<string>) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(s))); } catch { /* ignore */ }
}

/**
 * Picks the chat thread to surface as a floating chat-head bubble. Prefers a
 * thread the user explicitly minimized; otherwise the most recently active
 * human thread with unread messages. Suppressed if the user dismissed it.
 */
export function useActiveChatHead(opts: { suppressThreadId?: string | null }) {
  const { threads, participants, unreadByThread } = useChatInbox();
  const [pinnedId, setPinnedId] = useState<string | null>(() => readPinned());
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());
  const [pos, setPos] = useState<StoredPos>(() => readPos());

  const pin = useCallback((threadId: string) => {
    try { localStorage.setItem(PIN_KEY, threadId); } catch { /* ignore */ }
    setPinnedId(threadId);
    setDismissed((prev) => {
      if (!prev.has(threadId)) return prev;
      const next = new Set(prev);
      next.delete(threadId);
      writeDismissed(next);
      return next;
    });
  }, []);

  const unpin = useCallback(() => {
    try { localStorage.removeItem(PIN_KEY); } catch { /* ignore */ }
    setPinnedId(null);
  }, []);

  const dismiss = useCallback((threadId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(threadId);
      writeDismissed(next);
      return next;
    });
    if (pinnedId === threadId) unpin();
  }, [pinnedId, unpin]);

  const updatePos = useCallback((p: StoredPos) => {
    setPos(p);
    writePos(p);
  }, []);

  // Resolve the active thread
  let active: ChatThreadRow | null = null;
  if (pinnedId) {
    active = threads.find((t) => t.id === pinnedId) ?? null;
  }
  if (!active) {
    // Pick newest human thread with unread, not dismissed, not suppressed.
    const candidates = threads
      .filter((t) => t.kind !== "ai")
      .filter((t) => (unreadByThread[t.id] ?? 0) > 0)
      .filter((t) => !dismissed.has(t.id));
    active = candidates[0] ?? null;
  }

  // Hide if it's the thread currently open
  if (active && opts.suppressThreadId && active.id === opts.suppressThreadId) {
    active = null;
  }

  const unread = active ? unreadByThread[active.id] ?? 0 : 0;
  const participantsForActive = active ? participants[active.id] ?? [] : [];

  return {
    active,
    unread,
    participants: participantsForActive,
    pos,
    setPos: updatePos,
    pin,
    unpin,
    dismiss,
    isPinned: !!pinnedId,
  };
}
