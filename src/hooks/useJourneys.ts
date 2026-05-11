import { useCallback, useEffect, useMemo, useState } from "react";
import { journeyApi, type JourneyRow } from "@/lib/api/journeyApi";
import { dbJourneyToTrip, tripToDbJourneyInput } from "@/lib/journeyMappers";
import type { TripData } from "@/components/AddTripSheet";
import { useGuestMode } from "@/hooks/useGuestMode";

export interface UseJourneysResult {
  journeys: TripData[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  save: (trip: TripData) => Promise<TripData>;
  archive: (id: string) => Promise<void>;
}

/**
 * Cache-first list of journeys for the signed-in patient.
 * Guest mode returns the caller-provided seed (handled in JourneyScreen).
 */
export function useJourneys(guestSeed: TripData[] = []): UseJourneysResult {
  const isGuest = useGuestMode();
  const [rows, setRows] = useState<JourneyRow[]>(() => {
    try {
      return (journeyApi as any).listCached?.() ?? [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(!isGuest);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (isGuest) {
      setIsLoading(false);
      return;
    }
    try {
      const fresh = await journeyApi.list();
      setRows(fresh);
      setError(null);
    } catch (e: any) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const journeys = useMemo<TripData[]>(() => {
    if (isGuest) return guestSeed;
    return rows.filter((r) => !r.deleted_at).map(dbJourneyToTrip);
  }, [rows, isGuest, guestSeed]);

  const save = useCallback(
    async (trip: TripData): Promise<TripData> => {
      if (isGuest) return trip; // demo mode — no persistence
      const input = tripToDbJourneyInput(trip);
      const row = await journeyApi.save(input);
      setRows((prev) => {
        const without = prev.filter((r) => r.id !== row.id);
        return [row, ...without];
      });
      return dbJourneyToTrip(row);
    },
    [isGuest],
  );

  const archive = useCallback(
    async (id: string) => {
      if (isGuest) return;
      await journeyApi.remove(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    },
    [isGuest],
  );

  return { journeys, isLoading, error, refresh, save, archive };
}
