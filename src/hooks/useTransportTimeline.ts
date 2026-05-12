/**
 * useTransportTimeline — single source of truth for the Journey transport UI.
 *
 * Auth-aware:
 * - Tracks the current Supabase user via getSession + onAuthStateChange.
 * - Reads/writes cache scoped to user_id when signed in (prevents loss
 *   after a `device_id` regeneration following a site-data clear).
 * - Lists tickets where `user_id = me OR device_id = me`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import {
  listTickets,
  saveTicket,
  deleteTicket,
  readCache,
  type TicketScope,
} from "@/lib/transportStore";
import {
  type TransportTicket,
  ticketToTransportSegments,
} from "@/lib/transportTickets";
import type { TransportSegment } from "@/components/TransportCard";

export function useTransportTimeline() {
  const deviceId = getDeviceId();
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const scope: TicketScope = useMemo(
    () => ({ deviceId, userId }),
    [deviceId, userId],
  );

  const [tickets, setTickets] = useState<TransportTicket[]>(() => readCache({ deviceId }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastUserRef = useRef<string | null>(null);

  // Resolve auth before doing anything authoritative.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user?.id ?? null;
      setUserId((prev) => (prev === next ? prev : next));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Repaint cache when the active identity changes, then refresh.
  useEffect(() => {
    if (!authReady) return;
    if (lastUserRef.current !== userId) {
      lastUserRef.current = userId;
      // Clear in-memory tickets so we don't paint another identity's data.
      setTickets(readCache(scope));
    }
  }, [authReady, userId, scope]);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);
    try {
      const fresh = await listTickets(scope);
      setTickets(fresh);
      setError(null);
    } catch (e) {
      console.warn("[useTransportTimeline] refresh failed, falling back to cache", e);
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [authReady, scope]);

  useEffect(() => {
    if (authReady) void refresh();
  }, [authReady, refresh]);

  const addTicket = useCallback(
    async (ticket: TransportTicket) => {
      // Always stamp the current authenticated user (if any) so the ticket
      // remains accessible by user_id even if device_id changes later.
      let resolvedUserId: string | null = ticket.userId ?? userId ?? null;
      if (!resolvedUserId) {
        try {
          const { data } = await supabase.auth.getUser();
          resolvedUserId = data.user?.id ?? null;
        } catch {
          /* unauthenticated — keep device-only */
        }
      }
      const enriched: TransportTicket = {
        ...ticket,
        deviceId: ticket.deviceId || deviceId,
        userId: resolvedUserId,
      };

      setTickets((prev) => {
        const without = prev.filter((t) => t.id !== enriched.id);
        return [...without, enriched].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        );
      });
      try {
        await saveTicket(enriched);
      } catch (e) {
        console.error("[useTransportTimeline] saveTicket failed", e);
        setError(e as Error);
      }
    },
    [deviceId, userId],
  );

  const removeTicket = useCallback(
    async (ticketId: string) => {
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      try {
        await deleteTicket(scope, ticketId);
      } catch (e) {
        console.error("[useTransportTimeline] removeTicket failed", e);
        setError(e as Error);
      }
    },
    [scope],
  );

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
    userId,
    setTickets,
  };
}
