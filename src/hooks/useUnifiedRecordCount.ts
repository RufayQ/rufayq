import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import {
  listAllRecordsForUser,
  domainOf,
  type RecordDomain,
  type UnifiedRecord,
} from "@/lib/records/recordSources";
import { subscribeToScannedRecords } from "@/lib/scannedRecordsStore";
import { subscribeToTravelScannedRecords } from "@/lib/travelScannedRecordsStore";
import { subscribeLoungeMemberships } from "@/lib/loungeMemberships";

interface Args {
  userId?: string | null;
  /** Defer until auth has restored so signed-in users aren't shown a guest count. */
  enabled?: boolean;
}

interface RecordCounts {
  total: number;
  byDomain: Record<RecordDomain, number>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Single source-of-truth record count used by Home dashboard AND the Records
 * Travel chip, so the two surfaces can NEVER disagree. Reads from
 * `listAllRecordsForUser` (the same canonical merger the picker uses) and
 * subscribes to every underlying store so updates propagate in real time.
 */
export function useUnifiedRecordCount({ userId, enabled = true }: Args = {}): RecordCounts {
  const [rows, setRows] = useState<UnifiedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const deviceId = getDeviceId();

  useEffect(() => {
    if (!enabled) {
      setIsLoading(true);
      return;
    }
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        const all = await listAllRecordsForUser({
          userId: userId ?? null,
          deviceId,
          fileBackedOnly: false,
        });
        if (!cancelled) {
          setRows(all);
          setError(null);
        }
      } catch (e) {
        console.warn("[useUnifiedRecordCount] load failed", e);
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();

    // Realtime: transport_attachments table changes.
    const channel = supabase
      .channel(`unified-record-count-${userId ?? "guest"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transport_attachments" },
        () => { void run(); },
      )
      .subscribe();

    // LocalStorage-backed sources.
    const offMedical = subscribeToScannedRecords(() => { void run(); });
    const offTravel = subscribeToTravelScannedRecords(() => { void run(); });
    const offLounge = subscribeLoungeMemberships(() => { void run(); });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
      offMedical?.();
      offTravel?.();
      offLounge?.();
    };
  }, [userId, deviceId, enabled]);

  return useMemo<RecordCounts>(() => {
    const byDomain: Record<RecordDomain, number> = { travel: 0, medical: 0 };
    for (const r of rows) byDomain[domainOf(r)] += 1;
    return { total: rows.length, byDomain, isLoading, error };
  }, [rows, isLoading, error]);
}
