import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlightSegment, TransportTicket } from "@/lib/transportTickets";

const db = {
  tickets: [] as any[],
  segments: [] as any[],
};

const makeQuery = (table: "transport_tickets" | "transport_flight_segments") => {
  let ticketIds: string[] | null = null;
  let eqField: string | null = null;
  let eqValue: any = null;
  const query: any = {
    select: () => query,
    is: () => query,
    order: () => query,
    or: () => query,
    eq: (field: string, value: any) => { eqField = field; eqValue = value; return query; },
    in: (field: string, values: string[]) => { if (field === "ticket_id") ticketIds = values; return query; },
    upsert: async (row: any) => {
      db.tickets = [...db.tickets.filter((t) => t.id !== row.id), { ...row, created_at: row.created_at || "2026-01-01T00:00:00.000Z", updated_at: row.updated_at || "2026-01-01T00:00:00.000Z", deleted_at: null }];
      return { data: row, error: null };
    },
    insert: async (rows: any[]) => {
      db.segments.push(...rows);
      return { data: rows, error: null };
    },
    delete: () => ({
      eq: async (field: string, value: any) => {
        if (table === "transport_flight_segments" && field === "ticket_id") db.segments = db.segments.filter((s) => s.ticket_id !== value);
        if (table === "transport_tickets" && field === "id") db.tickets = db.tickets.filter((t) => t.id !== value);
        return { data: null, error: null };
      },
    }),
    update: (patch: any) => ({
      eq: async (field: string, value: any) => {
        if (table === "transport_tickets" && field === "id") db.tickets = db.tickets.map((t) => t.id === value ? { ...t, ...patch } : t);
        return { data: null, error: null };
      },
    }),
    then: (resolve: any) => {
      if (table === "transport_tickets") {
        let rows = db.tickets.filter((t) => !t.deleted_at);
        if (eqField) rows = rows.filter((t) => t[eqField!] === eqValue);
        return resolve({ data: rows, error: null });
      }
      let rows = db.segments;
      if (ticketIds) rows = rows.filter((s) => ticketIds!.includes(s.ticket_id));
      return resolve({ data: rows, error: null });
    },
  };
  return query;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: "transport_tickets" | "transport_flight_segments") => makeQuery(table),
  },
}));

const seg = (overrides: Partial<FlightSegment> = {}): FlightSegment => ({
  id: overrides.id || "seg-1",
  airline: overrides.airline || "Saudia",
  flightNumber: overrides.flightNumber || "SV215",
  fromAirport: overrides.fromAirport || { code: "JED", city: "Jeddah" },
  toAirport: overrides.toAirport || { code: "LHR", city: "London" },
  departureDate: overrides.departureDate || "2026-05-10",
  departureTime: overrides.departureTime || "08:30",
  arrivalDate: overrides.arrivalDate || "2026-05-10",
  arrivalTime: overrides.arrivalTime || "13:00",
  pnr: overrides.pnr || "ABC123",
  segmentOrder: overrides.segmentOrder ?? 0,
  direction: overrides.direction || "outbound",
});

const ticket = (overrides: Partial<TransportTicket> = {}): TransportTicket => ({
  id: "ticket-1",
  deviceId: "device-1",
  userId: "user-1",
  sourceDocumentId: null,
  documentType: "flight_ticket",
  tripType: "one-way",
  outboundSegments: [seg()],
  returnSegments: [],
  passengerName: "Patient",
  bookingReference: "ABC123",
  saveToTransportTimeline: true,
  saveToMedicalRecords: false,
  sendToDoctor: false,
  pendingSegmentRef: null,
  traveler: "patient",
  source: "manual",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  db.tickets = [];
  db.segments = [];
  window.localStorage.clear();
});

describe("transportStore CRUD", () => {
  it("saves, lists, updates and soft-deletes a flight ticket", async () => {
    const { saveTicket, listTickets, deleteTicket } = await import("@/lib/transportStore");
    const scope = { deviceId: "device-1", userId: "user-1" };

    await saveTicket(ticket());
    expect(await listTickets(scope)).toHaveLength(1);

    await saveTicket(ticket({ outboundSegments: [seg({ flightNumber: "SV216", pnr: "XYZ789" })], bookingReference: "XYZ789" }));
    const updated = await listTickets(scope);
    expect(updated).toHaveLength(1);
    expect(updated[0].outboundSegments[0].flightNumber).toBe("SV216");
    expect(updated[0].bookingReference).toBe("XYZ789");

    await deleteTicket(scope, "ticket-1");
    expect(await listTickets(scope)).toEqual([]);
  });
});
