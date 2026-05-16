import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

/**
 * Tracks the most recent `last_read_at` from every OTHER participant in a
 * chat thread. The returned timestamp powers WhatsApp-style "seen" ticks —
 * any outgoing message older than `othersLastReadAt` is considered read.
 */
export function useThreadReadReceipts(threadId: string | null) {
  const [othersLastReadAt, setOthersLastReadAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!threadId) { setOthersLastReadAt(null); return; }
    const me = getDeviceId();
    const { data } = await supabase
      .from("chat_participants")
      .select("device_id, organization_id, last_read_at")
      .eq("thread_id", threadId);
    let max: string | null = null;
    for (const p of data ?? []) {
      if (p.device_id && p.device_id === me) continue; // skip self
      if (!p.last_read_at) continue;
      if (!max || p.last_read_at > max) max = p.last_read_at;
    }
    setOthersLastReadAt(max);
  }, [threadId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`chat-receipts-${threadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_participants", filter: `thread_id=eq.${threadId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, load]);

  return { othersLastReadAt, refresh: load };
}
