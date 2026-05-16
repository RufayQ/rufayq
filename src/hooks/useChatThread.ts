import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export type ChatMessageStatus = "sending" | "sent" | "failed";

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  sender_kind: "patient" | "org_member" | "ai" | "system";
  sender_device_id: string | null;
  sender_org_id: string | null;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
  /** Client-side delivery status. Server rows default to "sent". */
  status?: ChatMessageStatus;
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
    setMessages(((data ?? []) as ChatMessageRow[]).map((m) => ({ ...m, status: "sent" })));
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
          const raw = payload.new as ChatMessageRow;
          const m: ChatMessageRow = { ...raw, status: "sent" };
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            // Replace optimistic temp message with same body from same device
            const me = getDeviceId();
            if (m.sender_device_id === me) {
              const tempIdx = prev.findIndex(
                (x) => x.id.startsWith("temp-") && x.body === m.body,
              );
              if (tempIdx >= 0) {
                const next = prev.slice();
                next[tempIdx] = m;
                return next;
              }
            }
            return [...prev, m];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId]);

  const send = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!threadId || !trimmed) return;
      const deviceId = getDeviceId();
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const optimistic: ChatMessageRow = {
        id: tempId,
        thread_id: threadId,
        sender_kind: "patient",
        sender_device_id: deviceId,
        sender_org_id: null,
        body: trimmed,
        metadata: {},
        created_at: new Date().toISOString(),
        status: "sending",
      };
      setMessages((prev) => [...prev, optimistic]);
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          thread_id: threadId,
          sender_kind: "patient",
          sender_device_id: deviceId,
          body: trimmed,
        })
        .select("id, thread_id, sender_kind, sender_device_id, sender_org_id, body, metadata, created_at")
        .single();
      if (error) {
        // Mark optimistic message as failed so the UI shows a red ! tick + retry
        setMessages((prev) => prev.map((x) => (x.id === tempId ? { ...x, status: "failed" } : x)));
        throw error;
      }
      if (data) {
        const sent: ChatMessageRow = { ...(data as ChatMessageRow), status: "sent" };
        setMessages((prev) => {
          if (prev.some((x) => x.id === sent.id)) {
            return prev.filter((x) => x.id !== tempId);
          }
          return prev.map((x) => (x.id === tempId ? sent : x));
        });
      }
    },
    [threadId],
  );

  const retry = useCallback(
    async (failedId: string) => {
      const msg = messages.find((m) => m.id === failedId);
      if (!msg || msg.status !== "failed") return;
      setMessages((prev) => prev.filter((x) => x.id !== failedId));
      await send(msg.body);
    },
    [messages, send],
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

  return { messages, loading, send, retry, markRead, reload: load };
}
