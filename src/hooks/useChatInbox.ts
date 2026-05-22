import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import {
  getActiveThread,
  markThreadReadOptimistic,
  onThreadReadOptimistic,
} from "@/lib/chat/activeThread";

export type ChatThreadRow = {
  id: string;
  kind: "ai" | "direct" | "provider";
  title: string | null;
  ai_persona: string | null;
  organization_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
};

export type ParticipantRow = {
  thread_id: string;
  device_id: string | null;
  organization_id: string | null;
  display_name: string | null;
  last_read_at: string | null;
  muted?: boolean | null;
};

// Shared realtime channel across every mounted useChatInbox so multiple
// inbox-aware components (ChatInbox, BottomNav badge, ChatHeadBubble, etc.)
// don't each open their own Postgres subscription or trigger a full reload
// per row change.
type Reloader = () => void;
const reloaders = new Set<Reloader>();
let sharedChannel: ReturnType<typeof supabase.channel> | null = null;
let reloadTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleReloadAll() {
  if (reloadTimer) return;
  // Coalesce bursts (a single message insert can fire 2-3 change events).
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    reloaders.forEach((cb) => cb());
  }, 120);
}

function handleMessageChange(payload: { eventType?: string; new?: { thread_id?: string } }) {
  // If a new message lands in the thread the user is actively reading, don't
  // schedule a reload — the badge is already 0 optimistically and the
  // upcoming markRead() will keep it that way. Also re-emit an optimistic
  // read event so any inbox already showing this thread keeps it at 0.
  const active = getActiveThread();
  const tid = payload?.new?.thread_id;
  if (payload?.eventType === "INSERT" && tid && active && tid === active) {
    markThreadReadOptimistic(tid);
    return;
  }
  scheduleReloadAll();
}

function ensureSharedChannel() {
  if (sharedChannel) return;
  const deviceId = getDeviceId();
  sharedChannel = supabase
    .channel(`ci:${deviceId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, scheduleReloadAll)
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, handleMessageChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_participants" }, scheduleReloadAll)
    .subscribe();
}

function teardownSharedChannel() {
  if (reloaders.size > 0 || !sharedChannel) return;
  if (reloadTimer) { clearTimeout(reloadTimer); reloadTimer = null; }
  supabase.removeChannel(sharedChannel);
  sharedChannel = null;
}

/** Lists every chat thread the current device participates in, with realtime updates. */
export function useChatInbox() {
  const [threads, setThreads] = useState<ChatThreadRow[]>([]);
  const [participants, setParticipants] = useState<Record<string, ParticipantRow[]>>({});
  const [unreadByThread, setUnreadByThread] = useState<Record<string, number>>({});
  const [mutedByThread, setMutedByThread] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const deviceId = getDeviceId();
    // User scope: if signed in, every participant row owned by this user counts
    // as the same inbox, so reading on one device clears unread on all of them.
    // Guests fall back to device-only scope.
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    // Threads where this device OR this user participates
    let partsQuery = supabase
      .from("chat_participants")
      .select("thread_id, last_read_at, user_id, device_id, muted");
    partsQuery = userId
      ? partsQuery.or(`device_id.eq.${deviceId},user_id.eq.${userId}`)
      : partsQuery.eq("device_id", deviceId);
    const { data: myParts } = await partsQuery;
    const ids = Array.from(new Set((myParts ?? []).map((p) => p.thread_id)));
    // A thread is "muted for me" if ANY of my participant rows for it is muted.
    const muted: Record<string, boolean> = {};
    for (const p of (myParts ?? []) as Array<{ thread_id: string; muted?: boolean | null }>) {
      if (p.muted) muted[p.thread_id] = true;
    }
    setMutedByThread(muted);
    if (ids.length === 0) {
      setThreads([]); setParticipants({}); setUnreadByThread({}); setLoading(false); return;
    }
    const { data: tRows } = await supabase
      .from("chat_threads")
      .select("id, kind, title, ai_persona, organization_id, last_message_at, last_message_preview")
      .in("id", ids)
      .order("last_message_at", { ascending: false });
    setThreads((tRows ?? []) as ChatThreadRow[]);

    const { data: allParts } = await supabase
      .from("chat_participants")
      .select("thread_id, device_id, organization_id, display_name, last_read_at, muted")
      .in("thread_id", ids);
    const byThread: Record<string, ParticipantRow[]> = {};
    for (const p of (allParts ?? []) as ParticipantRow[]) {
      (byThread[p.thread_id] ||= []).push(p);
    }
    setParticipants(byThread);

    // Single grouped RPC replaces the previous N+1 per-thread COUNT queries.
    // Threads with zero unread don't appear in the result, so default to 0.
    const unread: Record<string, number> = {};
    for (const tid of ids) unread[tid] = 0;
    const { data: unreadRows } = await supabase.rpc("chat_unread_counts_for_device", {
      _device_id: deviceId,
      _user_id: userId,
    });
    for (const row of (unreadRows ?? []) as Array<{ thread_id: string; unread_count: number }>) {
      unread[row.thread_id] = Number(row.unread_count) || 0;
    }
    setUnreadByThread(unread);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    reloaders.add(load);
    ensureSharedChannel();
    const off = onThreadReadOptimistic((tid) => {
      // Zero this thread instantly; the eventual reload will reconcile.
      setUnreadByThread((prev) => (prev[tid] === 0 ? prev : { ...prev, [tid]: 0 }));
    });
    return () => {
      reloaders.delete(load);
      off();
      teardownSharedChannel();
    };
  }, [load]);

  const totalUnread = Object.values(unreadByThread).reduce((a, b) => a + b, 0);

  // Actions ----------------------------------------------------------------

  const setThreadMuted = useCallback(async (threadId: string, next: boolean) => {
    const deviceId = getDeviceId();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;
    // Optimistic UI
    setMutedByThread((prev) => ({ ...prev, [threadId]: next }));
    const { error } = await supabase.rpc("chat_set_thread_muted", {
      _thread_id: threadId,
      _device_id: deviceId,
      _muted: next,
      _user_id: userId,
    });
    if (error) {
      // Revert on failure
      setMutedByThread((prev) => ({ ...prev, [threadId]: !next }));
      throw error;
    }
  }, []);

  const markThreadUnread = useCallback(async (threadId: string) => {
    const deviceId = getDeviceId();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;
    // Optimistic: show at least 1 unread immediately.
    setUnreadByThread((prev) => ({ ...prev, [threadId]: Math.max(1, prev[threadId] ?? 0) }));
    const { error } = await supabase.rpc("chat_mark_thread_unread", {
      _thread_id: threadId,
      _device_id: deviceId,
      _user_id: userId,
    });
    if (error) throw error;
    // Reload to get accurate count from server.
    load();
  }, [load]);

  /** Mark every visible thread as read for this device / user. */
  const markAllThreadsRead = useCallback(async () => {
    const deviceId = getDeviceId();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;
    const ids = Object.keys(unreadByThread).filter((tid) => (unreadByThread[tid] ?? 0) > 0);
    if (ids.length === 0) return;
    // Optimistic: zero every thread immediately so badges across the app clear.
    setUnreadByThread((prev) => {
      const next = { ...prev };
      for (const tid of ids) {
        next[tid] = 0;
        markThreadReadOptimistic(tid);
      }
      return next;
    });
    const now = new Date().toISOString();
    let q = supabase
      .from("chat_participants")
      .update({ last_read_at: now })
      .in("thread_id", ids);
    q = userId
      ? q.or(`device_id.eq.${deviceId},user_id.eq.${userId}`)
      : q.eq("device_id", deviceId);
    const { error } = await q;
    if (error) {
      // Reconcile with server on failure.
      load();
      throw error;
    }
  }, [unreadByThread, load]);

  return {
    threads,
    participants,
    unreadByThread,
    mutedByThread,
    totalUnread,
    loading,
    reload: load,
    setThreadMuted,
    markThreadUnread,
    markAllThreadsRead,
  };
}
