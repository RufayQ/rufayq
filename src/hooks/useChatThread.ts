import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  sender_kind: "patient" | "org_member" | "ai" | "system";
  sender_device_id: string | null;
  sender_org_id: string | null;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

/** Loads messages for a single thread and subscribes to new ones in realtime. */
export function useChatThread(threadId: string | null) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("id, thread_id, sender_kind, sender_device_id, sender_org_id, body, metadata, created_at")
      .eq("thread_id", threadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(500);
    setMessages((data ?? []) as ChatMessageRow[]);
    setLoading(false);
  }, [threadId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`chat-thread-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const m = payload.new as ChatMessageRow;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId]);

  const send = useCallback(
    async (body: string) => {
      if (!threadId || !body.trim()) return;
      const deviceId = getDeviceId();
      const { error } = await supabase.from("chat_messages").insert({
        thread_id: threadId,
        sender_kind: "patient",
        sender_device_id: deviceId,
        body: body.trim(),
      });
      if (error) throw error;
    },
    [threadId],
  );

  const markRead = useCallback(async () => {
    if (!threadId) return;
    const deviceId = getDeviceId();
    await supabase
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .eq("device_id", deviceId);
  }, [threadId]);

  return { messages, loading, send, markRead, reload: load };
}
