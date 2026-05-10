/**
 * useTransportTimeline — single source of truth for the Journey transport UI.
 *
 * - Reads from localStorage cache immediately (instant paint, even offline).
 * - Refreshes from Supabase in the background.
 * - Exposes flattened `TransportSegment[]` for legacy renderers + raw
 *   `TransportTicket[]` for new flight chaining UI.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import {
  listTickets,
  saveTicket,
  deleteTicket,
  readCache,
} from "@/lib/transportStore";
import {
  type TransportTicket,
  ticketToTransportSegments,
} from "@/lib/transportTickets";
import type { TransportSegment } from "@/components/TransportCard";

export function useTransportTimeline() {
  const deviceId = getDeviceId();
  const [tickets, setTickets] = useState<TransportTicket[]>(() => readCache(deviceId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const fresh = await listTickets(deviceId);
      setTickets(fresh);
      setError(null);
    } catch (e) {
      console.warn("[useTransportTimeline] refresh failed, falling back to cache", e);
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addTicket = useCallback(
    async (ticket: TransportTicket) => {
      // Optimistic local update so the UI never feels laggy
      setTickets((prev) => {
        const without = prev.filter((t) => t.id !== ticket.id);
        return [...without, ticket].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        );
      });
      try {
        await saveTicket(ticket);
      } catch (e) {
        // We keep the optimistic update — readCache already preserved it.
        console.error("[useTransportTimeline] saveTicket failed", e);
        setError(e as Error);
      }
    },
    [],
  );

  const removeTicket = useCallback(
    async (ticketId: string) => {
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      try {
        await deleteTicket(deviceId, ticketId);
      } catch (e) {
        console.error("[useTransportTimeline] removeTicket failed", e);
        setError(e as Error);
      }
    },
    [deviceId],
  );

  // Flat TransportSegment[] for legacy renderers (TicketsTab, FlightTripSummary)
  const segments: TransportSegment[] = useMemo(
    () => tickets.flatMap((t) => ticketToTransportSegments(t)),
    [tickets],
  );

  return {
    tickets,
    segments,
    loading,
    error,
    addTicket,
    removeTicket,
    refresh,
    deviceId,
    /** Replace the entire list (used for guest-mode seeding). */
    setTickets,
  };
}
