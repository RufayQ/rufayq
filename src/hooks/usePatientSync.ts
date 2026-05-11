import { useCallback, useState } from "react";
import { refreshAll, type EntityRefreshResult } from "@/lib/sync/syncEngine";

/** Drives global pull-to-refresh. Calls refreshAll() and tracks status. */
export function usePatientSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResults, setLastResults] = useState<EntityRefreshResult[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsSyncing(true);
    try {
      const results = await refreshAll();
      setLastResults(results);
      setLastSyncedAt(new Date().toISOString());
      return results;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { refresh, isSyncing, lastResults, lastSyncedAt };
}
