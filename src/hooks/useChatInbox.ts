import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

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

function ensureSharedChannel() {
  if (sharedChannel) return;
  sharedChannel = supabase
    .channel("chat-inbox-shared")
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, scheduleReloadAll)
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, scheduleReloadAll)
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const deviceId = getDeviceId();
    // Threads where this device participates
    const { data: myParts } = await supabase
      .from("chat_participants")
      .select("thread_id, last_read_at")
      .eq("device_id", deviceId);
    const lastReadByThread: Record<string, string | null> = {};
    for (const p of myParts ?? []) lastReadByThread[p.thread_id] = p.last_read_at;
    const ids = (myParts ?? []).map((p) => p.thread_id);
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
      .select("thread_id, device_id, organization_id, display_name, last_read_at")
      .in("thread_id", ids);
    const byThread: Record<string, ParticipantRow[]> = {};
    for (const p of (allParts ?? []) as ParticipantRow[]) {
      (byThread[p.thread_id] ||= []).push(p);
    }
    setParticipants(byThread);

    // Single grouped RPC replaces the previous N+1 per-thread COUNT queries.
    // Threads with zero unread don't appear in the result, so default to 0.
    void lastReadByThread; // last_read_at is now evaluated server-side inside the RPC
    const unread: Record<string, number> = {};
    for (const tid of ids) unread[tid] = 0;
    const { data: unreadRows } = await supabase.rpc("chat_unread_counts_for_device", {
      _device_id: deviceId,
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
    return () => {
      reloaders.delete(load);
      teardownSharedChannel();
    };
  }, [load]);

  const totalUnread = Object.values(unreadByThread).reduce((a, b) => a + b, 0);

  return { threads, participants, unreadByThread, totalUnread, loading, reload: load };
}
