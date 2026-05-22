import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { onThreadReadOptimistic } from "@/lib/chat/activeThread";

/**
 * App-wide chat awareness:
 * - tracks the total unread count across every thread the device participates in
 * - shows an in-app toast when an incoming message arrives from another user,
 *   unless the user is actively viewing that thread (controlled via `activeThreadId`).
 *
 * Gated: when there is no signed-in user AND no guest flag, we skip all
 * protected queries / realtime subscriptions to avoid noisy 401s and
 * startup-time auth pressure.
 */
export function useGlobalChat(activeThreadId?: string | null) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const evaluate = (hasSession: boolean) => {
      if (cancelled) return;
      let guestOk = false;
      try { guestOk = localStorage.getItem("rufayq_guest_ok") === "1"; } catch { /* noop */ }
      const next = hasSession || guestOk;
      setEnabled(next);
      if (!next) {
        console.info("[RufayqStartup] Global chat skipped: unauthenticated");
      } else {
        console.info("[RufayqStartup] Global chat setup start");
      }
    };
    supabase.auth.getSession().then(({ data: { session } }) => evaluate(!!session?.user)).catch(() => evaluate(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => evaluate(!!session?.user));
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const recompute = useCallback(async () => {
    if (!enabled) { setTotalUnread(0); return; }
    const deviceId = getDeviceId();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;
    // One grouped query, user-scoped (with device fallback for guests), so
    // reading on any signed-in device clears the badge everywhere.
    const { data: rows } = await supabase.rpc("chat_unread_counts_for_device", {
      _device_id: deviceId,
      _user_id: userId,
    });
    const total = (rows ?? []).reduce(
      (sum: number, r: { unread_count: number }) => sum + (Number(r.unread_count) || 0),
      0,
    );
    setTotalUnread(total);
  }, [enabled]);

  useEffect(() => { recompute(); }, [recompute]);

  useEffect(() => {
    if (!enabled) return;
    const deviceId = getDeviceId();
    const ch = supabase
      .channel(`ga:${deviceId}`)
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

          // If the user is actively reading this thread, skip the recompute —
          // markRead() will fire and keep the badge at 0. This is what
          // prevents the temporary +1 bump for on-screen threads.
          if (activeThreadId && activeThreadId === m.thread_id) return;

          recompute();

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
    // Optimistic clears: when the user marks a thread read, immediately
    // refresh the total so the badge doesn't lag behind the DB round-trip.
    const off = onThreadReadOptimistic(() => { recompute(); });
    return () => { supabase.removeChannel(ch); off(); };
  }, [recompute, activeThreadId, enabled]);

  return { totalUnread, refresh: recompute };
}
