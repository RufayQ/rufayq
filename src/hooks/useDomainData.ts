/**
 * Generic React hook factory for patient-data domains.
 * Pattern: cache-first paint → DB refresh → optimistic save/remove rollback.
 */
import { useCallback, useEffect, useState } from "react";

export interface DomainApiShape<Row extends { id: string }> {
  list: () => Promise<Row[]>;
  listCached: () => Row[];
  save: (input: Partial<Row> & { id?: string }) => Promise<Row>;
  remove: (id: string) => Promise<void>;
  lastSyncedAt: () => string | null;
}

export interface DomainHookResult<Row extends { id: string }> {
  items: Row[];
  isLoading: boolean;
  isSyncing: boolean;
  error: Error | null;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
  save: (input: Partial<Row> & { id?: string }) => Promise<Row>;
  remove: (id: string) => Promise<void>;
}

export function useDomainData<Row extends { id: string }>(
  api: DomainApiShape<Row>,
): DomainHookResult<Row> {
  const [items, setItems] = useState<Row[]>(() => api.listCached());
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(api.lastSyncedAt());

  const refresh = useCallback(async () => {
    setIsSyncing(true);
    try {
      const fresh = await api.list();
      setItems(fresh);
      setLastSyncedAt(api.lastSyncedAt());
      setError(null);
    } catch (e: any) {
      console.warn("[useDomainData] refresh failed", e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: Partial<Row> & { id?: string }) => {
      const row = await api.save(input);
      setItems((prev) => {
        const without = prev.filter((r) => r.id !== row.id);
        return [row, ...without];
      });
      setLastSyncedAt(api.lastSyncedAt());
      return row;
    },
    [api],
  );

  const remove = useCallback(
    async (id: string) => {
      const snapshot = items;
      setItems((prev) => prev.filter((r) => r.id !== id));
      try {
        await api.remove(id);
      } catch (e) {
        console.error("[useDomainData] remove failed; rolling back", e);
        setItems(snapshot);
        throw e;
      }
    },
    [api, items],
  );

  return { items, isLoading, isSyncing, error, lastSyncedAt, refresh, save, remove };
}
