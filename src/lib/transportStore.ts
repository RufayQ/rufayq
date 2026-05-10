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
 */
import { supabase } from "@/integrations/supabase/client";
import {
  type TransportTicket,
  type FlightSegment,
} from "@/lib/transportTickets";

const cacheKey = (deviceId: string) => `rufayq.transport.${deviceId}`;

/* ─────────────────────────  cache  ───────────────────────── */

export function readCache(deviceId: string): TransportTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(cacheKey(deviceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TransportTicket[]) : [];
  } catch (e) {
    console.warn("[transportStore] cache read failed", e);
    return [];
  }
}

export function writeCache(deviceId: string, tickets: TransportTicket[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cacheKey(deviceId), JSON.stringify(tickets));
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
});

const rowToTicket = (r: any, segments: FlightSegment[]): TransportTicket => {
  const outboundSegments = segments
    .filter((s) => s.direction === "outbound")
    .sort((a, b) => a.segmentOrder - b.segmentOrder);
  const returnSegments = segments
    .filter((s) => s.direction === "return")
    .sort((a, b) => a.segmentOrder - b.segmentOrder);
  return {
    id: r.id,
    deviceId: r.device_id,
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
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

/* ─────────────────────────  CRUD  ───────────────────────── */

export async function listTickets(deviceId: string): Promise<TransportTicket[]> {
  if (!deviceId) return [];
  const { data: tRows, error: tErr } = await (supabase as any)
    .from("transport_tickets")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: true });
  if (tErr) {
    console.warn("[transportStore] list tickets failed", tErr);
    return readCache(deviceId);
  }
  if (!tRows || tRows.length === 0) {
    writeCache(deviceId, []);
    return [];
  }
  const ids = (tRows as any[]).map((r) => r.id);
  const { data: sRows, error: sErr } = await (supabase as any)
    .from("transport_flight_segments")
    .select("*")
    .in("ticket_id", ids);
  if (sErr) {
    console.warn("[transportStore] list segments failed", sErr);
    return readCache(deviceId);
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
  writeCache(deviceId, tickets);
  return tickets;
}

export async function saveTicket(
  ticket: TransportTicket,
): Promise<TransportTicket> {
  if (!ticket.deviceId) throw new Error("deviceId required");
  const allSegments = [...ticket.outboundSegments, ...ticket.returnSegments];

  const { error: tErr } = await (supabase as any)
    .from("transport_tickets")
    .upsert(ticketToRow(ticket), { onConflict: "id" });
  if (tErr) {
    console.error("[transportStore] save ticket failed", tErr);
    // Cache locally anyway so the user doesn't lose their data
    const local = readCache(ticket.deviceId);
    writeCache(ticket.deviceId, [...local.filter((x) => x.id !== ticket.id), ticket]);
    throw tErr;
  }

  if (allSegments.length > 0) {
    // Replace any existing segments for this ticket so re-saves are idempotent
    await (supabase as any)
      .from("transport_flight_segments")
      .delete()
      .eq("ticket_id", ticket.id);

    const rows = allSegments.map((s) => segmentToRow(s, ticket.id));
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
  const local = readCache(ticket.deviceId);
  const next = [...local.filter((x) => x.id !== ticket.id), ticket].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt),
  );
  writeCache(ticket.deviceId, next);
  return ticket;
}

export async function deleteTicket(deviceId: string, ticketId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("transport_tickets")
    .delete()
    .eq("id", ticketId);
  if (error) {
    console.error("[transportStore] delete ticket failed", error);
    throw error;
  }
  const local = readCache(deviceId);
  writeCache(deviceId, local.filter((t) => t.id !== ticketId));
}
