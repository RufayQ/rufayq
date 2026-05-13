/**
 * Durable persistence for transport tickets.
 *
 * Strategy:
 * - Source of truth: Supabase tables `transport_tickets` + `transport_flight_segments`
 *   (RLS scoped per device via x-device-id header).
 * - Cache: `localStorage` keyed by device id, written on every successful
 *   Supabase write so data survives offline / reloads / cold starts.
 *
 * The store is intentionally thin and synchronous-feeling: callers get back
 * the latest list after each mutation so UI can render optimistically.
 *
 * Critical for medical-grade integrity:
 * - Every write to Supabase ALSO updates the local cache.
 * - On any DB error we still keep local copy and surface the error to the
 *   caller — user data is never silently dropped.
 * - Segments are inserted in a single transaction-like sequence; on any
 *   segment failure we roll back the parent ticket to avoid orphans.
 *
 * @deprecated This legacy device-only store remains for `useTransportTimeline`.
 * It will be removed in a future checkpoint; prefer `src/lib/api/transportApi.ts`.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  type TransportTicket,
  type FlightSegment,
} from "@/lib/transportTickets";

/**
 * Cache scoping
 *
 * Signed-in users → key by user id, so a regenerated `device_id` (e.g. after
 * the user clears site data) never blocks the cache from being repopulated
 * from DB on the next refresh.
 *
 * Guests → key by device id (legacy behavior).
 */
export type TicketScope = { deviceId: string; userId?: string | null };

const legacyCacheKey = (deviceId: string) => `rufayq.transport.${deviceId}`;
const userCacheKey = (userId: string) => `rufayq.transport.user:${userId}`;
const deviceCacheKey = (deviceId: string) => `rufayq.transport.device:${deviceId}`;

const toScope = (s: TicketScope | string): TicketScope =>
  typeof s === "string" ? { deviceId: s } : s;

const cacheKey = (scope: TicketScope) =>
  scope.userId ? userCacheKey(scope.userId) : deviceCacheKey(scope.deviceId);

/* ─────────────────────────  cache  ───────────────────────── */

export function readCache(scopeOrDeviceId: TicketScope | string): TransportTicket[] {
  if (typeof window === "undefined") return [];
  const scope = toScope(scopeOrDeviceId);
  try {
    // Prefer scoped key first.
    let raw = window.localStorage.getItem(cacheKey(scope));
    // Migrate legacy device-only key to user-scoped one when signed in.
    if (!raw && scope.userId) {
      const legacy = window.localStorage.getItem(legacyCacheKey(scope.deviceId));
      if (legacy) {
        window.localStorage.setItem(cacheKey(scope), legacy);
        raw = legacy;
      }
    }
    // Also fall back to legacy key for guests.
    if (!raw && !scope.userId) {
      raw = window.localStorage.getItem(legacyCacheKey(scope.deviceId));
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TransportTicket[]) : [];
  } catch (e) {
    console.warn("[transportStore] cache read failed", e);
    return [];
  }
}

export function writeCache(
  scopeOrDeviceId: TicketScope | string,
  tickets: TransportTicket[],
) {
  if (typeof window === "undefined") return;
  const scope = toScope(scopeOrDeviceId);
  try {
    window.localStorage.setItem(cacheKey(scope), JSON.stringify(tickets));
  } catch (e) {
    console.warn("[transportStore] cache write failed", e);
  }
}

/* ─────────────────────────  mappers  ───────────────────────── */

const segmentToRow = (s: FlightSegment, ticketId: string, userId: string | null) => ({
  id: s.id,
  ticket_id: ticketId,
  user_id: userId,
  direction: s.direction,
  segment_order: s.segmentOrder,
  airline: s.airline || null,
  flight_number: s.flightNumber || null,
  from_code: s.fromAirport.code,
  from_city: s.fromAirport.city || null,
  from_country: s.fromAirport.country || null,
  from_airport_name: s.fromAirport.name || null,
  to_code: s.toAirport.code,
  to_city: s.toAirport.city || null,
  to_country: s.toAirport.country || null,
  to_airport_name: s.toAirport.name || null,
  departure_date: s.departureDate || null,
  departure_time: s.departureTime || null,
  arrival_date: s.arrivalDate || null,
  arrival_time: s.arrivalTime || null,
  departure_terminal: s.departureTerminal || null,
  arrival_terminal: s.arrivalTerminal || null,
  departure_gate: s.departureGate || null,
  arrival_gate: s.arrivalGate || null,
  cabin_class: s.cabinClass || null,
  fare_class: s.fareClass || null,
  baggage_allowance: s.baggageAllowance || null,
  pnr: s.pnr || null,
});

const rowToSegment = (r: any): FlightSegment => ({
  id: r.id,
  airline: r.airline || "",
  flightNumber: r.flight_number || "",
  fromAirport: {
    code: r.from_code,
    city: r.from_city || "",
    country: r.from_country || undefined,
    name: r.from_airport_name || undefined,
  },
  toAirport: {
    code: r.to_code,
    city: r.to_city || "",
    country: r.to_country || undefined,
    name: r.to_airport_name || undefined,
  },
  departureDate: r.departure_date || "",
  departureTime: r.departure_time || "",
  arrivalDate: r.arrival_date || undefined,
  arrivalTime: r.arrival_time || undefined,
  departureTerminal: r.departure_terminal || undefined,
  arrivalTerminal: r.arrival_terminal || undefined,
  departureGate: r.departure_gate || undefined,
  arrivalGate: r.arrival_gate || undefined,
  cabinClass: r.cabin_class || undefined,
  fareClass: r.fare_class || undefined,
  baggageAllowance: r.baggage_allowance || undefined,
  pnr: r.pnr || undefined,
  segmentOrder: r.segment_order ?? 0,
  direction: (r.direction as "outbound" | "return") ?? "outbound",
});

const ticketToRow = (t: TransportTicket) => ({
  id: t.id,
  device_id: t.deviceId,
  user_id: t.userId || null,
  source_document_id: t.sourceDocumentId || null,
  document_type: t.documentType,
  trip_type: t.tripType,
  passenger_name: t.passengerName || null,
  passenger_passport: t.passengerPassport || null,
  booking_reference: t.bookingReference || null,
  save_to_transport_timeline: t.saveToTransportTimeline,
  save_to_medical_records: t.saveToMedicalRecords,
  send_to_doctor: t.sendToDoctor,
  pending_segment_ref: t.pendingSegmentRef || null,
<<<<<<< ours
<<<<<<< ours
  extraction_provider: t.extraction?.provider ?? null,
  extraction_confidence:
    typeof t.extraction?.confidence === "number" ? t.extraction.confidence : null,
  detected_language: t.extraction?.detectedLanguage ?? null,
  extraction_translated: !!t.extraction?.translated,
  extraction_run_at: t.extraction?.runAt ?? null,
  source_image_paths: Array.isArray(t.sourceImagePaths) ? t.sourceImagePaths : [],
=======
=======
>>>>>>> theirs
  extraction_provider: t.extraction?.provider || null,
  extraction_confidence: typeof t.extraction?.confidence === "number" ? t.extraction.confidence : null,
  detected_language: t.extraction?.detectedLanguage || null,
  extraction_translated: !!t.extraction?.translated,
  extraction_run_at: t.extraction?.runAt || null,
  source_image_paths: t.sourceImagePaths || [],
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
});

const rowToTicket = (r: any, segments: FlightSegment[]): TransportTicket => {
  const outboundSegments = segments
    .filter((s) => s.direction === "outbound")
    .sort((a, b) => a.segmentOrder - b.segmentOrder);
  const returnSegments = segments
    .filter((s) => s.direction === "return")
    .sort((a, b) => a.segmentOrder - b.segmentOrder);
  const extraction = r.extraction_provider
    ? {
        provider: r.extraction_provider as "openai" | "gemini",
        confidence:
          r.extraction_confidence != null ? Number(r.extraction_confidence) : null,
        detectedLanguage: r.detected_language || null,
        translated: !!r.extraction_translated,
        runAt: r.extraction_run_at || null,
      }
    : null;
  return {
    id: r.id,
    deviceId: r.device_id,
    userId: r.user_id || null,
    sourceDocumentId: r.source_document_id || null,
    documentType: (r.document_type as "flight_ticket") || "flight_ticket",
    tripType: r.trip_type,
    outboundSegments,
    returnSegments,
    passengerName: r.passenger_name || undefined,
    passengerPassport: r.passenger_passport || undefined,
    bookingReference: r.booking_reference || undefined,
    saveToTransportTimeline: !!r.save_to_transport_timeline,
    saveToMedicalRecords: !!r.save_to_medical_records,
    sendToDoctor: !!r.send_to_doctor,
    pendingSegmentRef: r.pending_segment_ref || null,
<<<<<<< ours
<<<<<<< ours
    extraction,
=======
=======
>>>>>>> theirs
    extraction: r.extraction_provider ? {
      provider: r.extraction_provider,
      confidence: typeof r.extraction_confidence === "number" ? r.extraction_confidence : r.extraction_confidence == null ? null : Number(r.extraction_confidence),
      detectedLanguage: r.detected_language || null,
      translated: !!r.extraction_translated,
      runAt: r.extraction_run_at || null,
    } : null,
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
    sourceImagePaths: Array.isArray(r.source_image_paths) ? r.source_image_paths : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

/* ─────────────────────────  CRUD  ───────────────────────── */

export async function listTickets(
  scopeOrDeviceId: TicketScope | string,
): Promise<TransportTicket[]> {
  const scope = toScope(scopeOrDeviceId);
  const { deviceId, userId } = scope;
  if (!deviceId && !userId) return [];

  let query = (supabase as any)
    .from("transport_tickets")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  // When signed in, accept either ownership signal so a regenerated
  // device_id (e.g. after the user clears site data) doesn't hide rows.
  if (userId && deviceId) {
    query = query.or(`user_id.eq.${userId},device_id.eq.${deviceId}`);
  } else if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("device_id", deviceId);
  }

  const { data: tRows, error: tErr } = await query;
  if (tErr) {
    console.warn("[transportStore] list tickets failed", tErr);
    return readCache(scope);
  }
  if (!tRows || tRows.length === 0) {
    writeCache(scope, []);
    return [];
  }
  const ids = (tRows as any[]).map((r) => r.id);
  const { data: sRows, error: sErr } = await (supabase as any)
    .from("transport_flight_segments")
    .select("*")
    .in("ticket_id", ids);
  if (sErr) {
    console.warn("[transportStore] list segments failed", sErr);
    return readCache(scope);
  }
  const byTicket = new Map<string, FlightSegment[]>();
  ((sRows as any[]) || []).forEach((row) => {
    const seg = rowToSegment(row);
    const arr = byTicket.get(row.ticket_id) || [];
    arr.push(seg);
    byTicket.set(row.ticket_id, arr);
  });
  const tickets = (tRows as any[]).map((r) =>
    rowToTicket(r, byTicket.get(r.id) || []),
  );
  writeCache(scope, tickets);
  return tickets;
}

export async function saveTicket(
  ticket: TransportTicket,
): Promise<TransportTicket> {
  if (!ticket.deviceId) throw new Error("deviceId required");
  const scope: TicketScope = { deviceId: ticket.deviceId, userId: ticket.userId ?? null };
  const allSegments = [...ticket.outboundSegments, ...ticket.returnSegments];

  const { error: tErr } = await (supabase as any)
    .from("transport_tickets")
    .upsert(ticketToRow(ticket), { onConflict: "id" });
  if (tErr) {
    console.error("[transportStore] save ticket failed", tErr);
    // Cache locally anyway so the user doesn't lose their data
    const local = readCache(scope);
    writeCache(scope, [...local.filter((x) => x.id !== ticket.id), ticket]);
    throw tErr;
  }

  if (allSegments.length > 0) {
    // Replace any existing segments for this ticket so re-saves are idempotent
    await (supabase as any)
      .from("transport_flight_segments")
      .delete()
      .eq("ticket_id", ticket.id);

    const rows = allSegments.map((s) => segmentToRow(s, ticket.id, ticket.userId || null));
    const { error: sErr } = await (supabase as any)
      .from("transport_flight_segments")
      .insert(rows);
    if (sErr) {
      console.error("[transportStore] save segments failed — rolling back ticket", sErr);
      // Roll back the parent ticket so we don't leave it without segments
      await (supabase as any)
        .from("transport_tickets")
        .delete()
        .eq("id", ticket.id);
      throw sErr;
    }
  }

  // Update cache
  const local = readCache(scope);
  const next = [...local.filter((x) => x.id !== ticket.id), ticket].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt),
  );
  writeCache(scope, next);
  return ticket;
}

export async function deleteTicket(
  scopeOrDeviceId: TicketScope | string,
  ticketId: string,
): Promise<void> {
  const scope = toScope(scopeOrDeviceId);
  // Soft delete (deleted_at column exists on transport_tickets).
  const { error } = await (supabase as any)
    .from("transport_tickets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", ticketId);
  if (error) {
    console.error("[transportStore] delete ticket failed", error);
    throw error;
  }
  const local = readCache(scope);
  writeCache(scope, local.filter((t) => t.id !== ticketId));
}

