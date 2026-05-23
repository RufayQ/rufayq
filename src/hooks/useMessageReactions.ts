import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Per-thread emoji reactions on chat_messages.
 *
 * - Loads existing reactions for the thread's message ids
 * - Subscribes to realtime INSERT/DELETE so taps appear instantly for all
 *   participants
 * - `toggle(messageId, emoji)` adds if absent for the current user, otherwise
 *   removes — same WhatsApp-style single-tap reaction model.
 */
export type ReactionRow = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

export function useMessageReactions(threadId: string | null, messageIds: string[]) {
  const [rows, setRows] = useState<ReactionRow[]>([]);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setMe(data.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  // Initial load whenever the visible message set changes meaningfully
  const idsKey = messageIds.slice().sort().join(",");
  useEffect(() => {
    if (!threadId || messageIds.length === 0) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_message_reactions")
        .select("id, message_id, user_id, emoji")
        .in("message_id", messageIds);
      if (!cancelled) setRows((data ?? []) as ReactionRow[]);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, idsKey]);

  // Realtime: filtering by thread isn't possible directly (no thread_id
  // column on reactions). We listen broadly and dedupe by visible ids.
  useEffect(() => {
    if (!threadId) return;
    const visible = new Set(messageIds);
    const ch = supabase
      .channel(`rx:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_message_reactions" },
        (payload) => {
          const r = payload.new as ReactionRow;
          if (!visible.has(r.message_id)) return;
          setRows((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_message_reactions" },
        (payload) => {
          const r = payload.old as ReactionRow;
          setRows((prev) => prev.filter((x) => x.id !== r.id));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(
    async (messageId: string, emoji: string) => {
      if (!me) return;
      const existing = rows.find(
        (r) => r.message_id === messageId && r.user_id === me && r.emoji === emoji,
      );
      if (existing) {
        // optimistic remove
        setRows((prev) => prev.filter((r) => r.id !== existing.id));
        const { error } = await supabase
          .from("chat_message_reactions")
          .delete()
          .eq("id", existing.id);
        if (error) setRows((prev) => [...prev, existing]); // rollback
        return;
      }
      // optimistic add
      const temp: ReactionRow = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        message_id: messageId,
        user_id: me,
        emoji,
      };
      setRows((prev) => [...prev, temp]);
      const { data, error } = await supabase
        .from("chat_message_reactions")
        .insert({ message_id: messageId, user_id: me, emoji })
        .select("id, message_id, user_id, emoji")
        .single();
      if (error) {
        setRows((prev) => prev.filter((r) => r.id !== temp.id));
        return;
      }
      if (data) {
        setRows((prev) =>
          prev.some((r) => r.id === (data as ReactionRow).id)
            ? prev.filter((r) => r.id !== temp.id)
            : prev.map((r) => (r.id === temp.id ? (data as ReactionRow) : r)),
        );
      }
    },
    [rows, me],
  );

  return { reactions: rows, toggle, me };
}
