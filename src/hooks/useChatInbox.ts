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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const deviceId = getDeviceId();
    // Threads where this device participates
    const { data: myParts } = await supabase
      .from("chat_participants")
      .select("thread_id, last_read_at")
      .eq("device_id", deviceId);
    const ids = (myParts ?? []).map((p) => p.thread_id);
    if (ids.length === 0) {
      setThreads([]); setParticipants({}); setLoading(false); return;
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
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("chat-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { threads, participants, loading, reload: load };
}
