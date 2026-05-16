import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

/**
 * App-wide chat awareness:
 * - tracks the total unread count across every thread the device participates in
 * - shows an in-app toast when an incoming message arrives from another user,
 *   unless the user is actively viewing that thread (controlled via `activeThreadId`).
 *
 * Designed to be mounted once at the shell level (Index.tsx).
 */
export function useGlobalChat(activeThreadId?: string | null) {
  const [totalUnread, setTotalUnread] = useState(0);

  const recompute = useCallback(async () => {
    const deviceId = getDeviceId();
    const { data: myParts } = await supabase
      .from("chat_participants")
      .select("thread_id, last_read_at")
      .eq("device_id", deviceId);
    if (!myParts || myParts.length === 0) { setTotalUnread(0); return; }

    let total = 0;
    await Promise.all(
      myParts.map(async (p) => {
        const since = p.last_read_at ?? new Date(0).toISOString();
        const { count } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", p.thread_id)
          .is("deleted_at", null)
          .neq("sender_device_id", deviceId)
          .gt("created_at", since);
        total += count ?? 0;
      }),
    );
    setTotalUnread(total);
  }, []);

  useEffect(() => { recompute(); }, [recompute]);

  useEffect(() => {
    const deviceId = getDeviceId();
    const ch = supabase
      .channel("global-chat-awareness")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const m = payload.new as {
            id: string;
            thread_id: string;
            sender_device_id: string | null;
            body: string;
          };
          // Ignore our own messages
          if (m.sender_device_id === deviceId) return;
          // Verify we participate in this thread before toasting/counting
          const { data: part } = await supabase
            .from("chat_participants")
            .select("thread_id")
            .eq("thread_id", m.thread_id)
            .eq("device_id", deviceId)
            .maybeSingle();
          if (!part) return;

          recompute();

          // Suppress toast if user is actively reading this thread
          if (activeThreadId && activeThreadId === m.thread_id) return;

          // Look up sender display name for a richer overlay/toast
          const { data: senderRow } = await supabase
            .from("chat_participants")
            .select("display_name")
            .eq("thread_id", m.thread_id)
            .eq("device_id", m.sender_device_id ?? "")
            .maybeSingle();
          const who = senderRow?.display_name ?? "New message";

          // Dispatch a global event consumed by <IncomingMessageOverlay/>.
          // The overlay renders a WhatsApp-style heads-up card with quick reply.
          window.dispatchEvent(new CustomEvent("rufayq:incoming-chat", {
            detail: { threadId: m.thread_id, body: m.body, sender: who, messageId: m.id },
          }));

          void toast; // kept available for caller-side opt-in; overlay handles UX
        
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_participants" }, () => recompute())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [recompute, activeThreadId]);

  return { totalUnread, refresh: recompute };
}
