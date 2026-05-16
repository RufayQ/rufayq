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

    // Compute unread counts per thread (messages from others after my last_read_at)
    const unread: Record<string, number> = {};
    await Promise.all(
      ids.map(async (tid) => {
        const since = lastReadByThread[tid] ?? new Date(0).toISOString();
        const { count } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", tid)
          .is("deleted_at", null)
          .neq("sender_device_id", deviceId)
          .gt("created_at", since);
        unread[tid] = count ?? 0;
      }),
    );
    setUnreadByThread(unread);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`chat-inbox-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_participants" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const totalUnread = Object.values(unreadByThread).reduce((a, b) => a + b, 0);

  return { threads, participants, unreadByThread, totalUnread, loading, reload: load };
}
