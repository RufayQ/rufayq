import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

interface Args {
  userId?: string | null;
  /** Restrict to a specific segment_ref OR ticket_id (milestone scope). */
  segmentRef?: string | null;
  ticketId?: string | null;
  /**
   * Set to false while auth is still restoring so we don't fire the query
   * with a null userId (which would silently take the guest/device-only
   * branch and return 0 for a signed-in user on a fresh device).
   */
  enabled?: boolean;
}

/**
 * Counts non-deleted transport_attachments rows visible to the current user.
 * - Global (no segmentRef/ticketId): used by Home "Records & artefacts".
 * - Scoped (segmentRef/ticketId): used by MilestoneSheet header artifact count.
 */
export function useArtifactCount({ userId, segmentRef, ticketId, enabled = true }: Args = {}) {
  const [count, setCount] = useState(0);
  const deviceId = getDeviceId();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const run = async () => {
      let q = supabase
        .from("transport_attachments")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);

      if (userId) {
        q = q.or(`user_id.eq.${userId},device_id.eq.${deviceId}`);
      } else {
        q = q.eq("device_id", deviceId);
      }

      if (ticketId && segmentRef) {
        q = q.or(`segment_ref.eq.${segmentRef},ticket_id.eq.${ticketId}`);
      } else if (ticketId) {
        q = q.eq("ticket_id", ticketId);
      } else if (segmentRef) {
        q = q.eq("segment_ref", segmentRef);
      }

      const { count: c, error } = await q;
      if (cancelled) return;
      if (error) {
        console.warn("[useArtifactCount] failed", error);
        return;
      }
      setCount(c ?? 0);
    };

    void run();

    // Refresh when the underlying table changes (uploads / soft-deletes).
    const channel = supabase
      .channel(`artifact-count-${userId ?? "guest"}-${segmentRef ?? "*"}-${ticketId ?? "*"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transport_attachments" },
        () => { void run(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId, segmentRef, ticketId, deviceId, enabled]);

  return count;
}
