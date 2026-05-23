import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { markThreadReadOptimistic } from "@/lib/chat/activeThread";

export type ChatMessageStatus = "sending" | "sent" | "failed";

export type ReplyPreview = {
  id: string;
  body: string;
  sender_device_id: string | null;
};

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  sender_kind: "patient" | "org_member" | "ai" | "system";
  sender_device_id: string | null;
  sender_org_id: string | null;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
  reply_to_id?: string | null;
  reply_to?: ReplyPreview | null;
  /** Client-side delivery status. Server rows default to "sent". */
  status?: ChatMessageStatus;
  edited_at?: string | null;
  edit_history?: Array<{ body: string; at: string }>;
  deleted_at?: string | null;
};

const SELECT_COLS =
  "id, thread_id, sender_kind, sender_device_id, sender_org_id, body, metadata, created_at, reply_to_id";

/** Loads messages for a single thread and subscribes to new ones in realtime. */
export function useChatThread(threadId: string | null) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const hydrateReplies = useCallback(
    async (rows: ChatMessageRow[]): Promise<ChatMessageRow[]> => {
      const ids = Array.from(
        new Set(rows.map((r) => r.reply_to_id).filter((x): x is string => !!x)),
      );
      if (ids.length === 0) return rows;
      const { data } = await supabase
        .from("chat_messages")
        .select("id, body, sender_device_id")
        .in("id", ids);
      const byId = new Map<string, ReplyPreview>();
      for (const p of (data ?? []) as ReplyPreview[]) byId.set(p.id, p);
      return rows.map((r) =>
        r.reply_to_id ? { ...r, reply_to: byId.get(r.reply_to_id) ?? null } : r,
      );
    },
    [],
  );

  const load = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select(SELECT_COLS)
      .eq("thread_id", threadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(500);
    const rows = ((data ?? []) as ChatMessageRow[]).map((m) => ({ ...m, status: "sent" as const }));
    const hydrated = await hydrateReplies(rows);
    setMessages(hydrated);
    setLoading(false);
  }, [threadId, hydrateReplies]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`ct:${threadId}:${getDeviceId()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const raw = payload.new as ChatMessageRow;
          const m: ChatMessageRow = { ...raw, status: "sent" };
          const [hydrated] = await hydrateReplies([m]);
          setMessages((prev) => {
            if (prev.some((x) => x.id === hydrated.id)) return prev;
            const me = getDeviceId();
            if (hydrated.sender_device_id === me) {
              const tempIdx = prev.findIndex(
                (x) => x.id.startsWith("temp-") && x.body === hydrated.body,
              );
              if (tempIdx >= 0) {
                const next = prev.slice();
                next[tempIdx] = hydrated;
                return next;
              }
            }
            return [...prev, hydrated];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, hydrateReplies]);

  const send = useCallback(
    async (body: string, opts?: { replyToId?: string | null }) => {
      const trimmed = body.trim();
      if (!threadId || !trimmed) return;
      const deviceId = getDeviceId();
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const replyToId = opts?.replyToId ?? null;
      const optimistic: ChatMessageRow = {
        id: tempId,
        thread_id: threadId,
        sender_kind: "patient",
        sender_device_id: deviceId,
        sender_org_id: null,
        body: trimmed,
        metadata: {},
        created_at: new Date().toISOString(),
        reply_to_id: replyToId,
        status: "sending",
      };
      // Attach reply preview from local cache for instant UI
      setMessages((prev) => {
        const replyPreview = replyToId
          ? prev.find((m) => m.id === replyToId)
          : null;
        const withPreview: ChatMessageRow = replyPreview
          ? {
              ...optimistic,
              reply_to: {
                id: replyPreview.id,
                body: replyPreview.body,
                sender_device_id: replyPreview.sender_device_id,
              },
            }
          : optimistic;
        return [...prev, withPreview];
      });
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          thread_id: threadId,
          sender_kind: "patient",
          sender_device_id: deviceId,
          body: trimmed,
          reply_to_id: replyToId,
        })
        .select(SELECT_COLS)
        .single();
      if (error) {
        setMessages((prev) => prev.map((x) => (x.id === tempId ? { ...x, status: "failed" } : x)));
        throw error;
      }
      if (data) {
        const sent: ChatMessageRow = { ...(data as ChatMessageRow), status: "sent" };
        const [hydrated] = await hydrateReplies([sent]);
        setMessages((prev) => {
          if (prev.some((x) => x.id === hydrated.id)) {
            return prev.filter((x) => x.id !== tempId);
          }
          return prev.map((x) => (x.id === tempId ? hydrated : x));
        });
      }
    },
    [threadId, hydrateReplies],
  );

  const retry = useCallback(
    async (failedId: string) => {
      const msg = messages.find((m) => m.id === failedId);
      if (!msg || msg.status !== "failed") return;
      setMessages((prev) => prev.filter((x) => x.id !== failedId));
      await send(msg.body, { replyToId: msg.reply_to_id ?? null });
    },
    [messages, send],
  );

  const markRead = useCallback(async () => {
    if (!threadId) return;
    const deviceId = getDeviceId();
    // Optimistic: zero the badge for this thread instantly so the inbox UI
    // doesn't flash a +1 between message-arrival and the DB update returning.
    markThreadReadOptimistic(threadId);
    await supabase
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .eq("device_id", deviceId);
  }, [threadId]);

  return { messages, loading, send, retry, markRead, reload: load };
}
