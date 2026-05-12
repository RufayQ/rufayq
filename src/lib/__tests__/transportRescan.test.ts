/**
 * Unit tests for the typed re-scan helper.
 *
 * Covers: manual rejection, no-images rejection, storage/extraction/save
 * error wrapping, zero-segment guard, identity preservation, and idempotent
 * retry behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mocks (must be declared before importing the module under test) ----

const fetchScanImagesAsDataUrlsMock = vi.fn();
const extractFlightTicketMock = vi.fn();
const saveTicketMock = vi.fn();

vi.mock("@/lib/transportScanStorage", () => {
  class ScanStorageError extends Error {
    constructor(message: string, public cause?: unknown) {
      super(message);
      this.name = "ScanStorageError";
    }
  }
  return {
    ScanStorageError,
    fetchScanImagesAsDataUrls: (...args: unknown[]) =>
      fetchScanImagesAsDataUrlsMock(...args),
  };
});

vi.mock("@/lib/flightExtraction", () => ({
  extractFlightTicket: (...args: unknown[]) => extractFlightTicketMock(...args),
}));

vi.mock("@/lib/transportStore", () => ({
  saveTicket: (...args: unknown[]) => saveTicketMock(...args),
}));

import { rescanTicket, RescanError } from "@/lib/transportRescan";
import type { TransportTicket } from "@/lib/transportTickets";

// ---- Helpers -----------------------------------------------------------

const baseTicket = (overrides: Partial<TransportTicket> = {}): TransportTicket => ({
  id: "ticket-1",
  deviceId: "device-1",
  userId: "user-1",
  sourceDocumentId: null,
  documentType: "flight_ticket",
  tripType: "one-way",
  outboundSegments: [
    {
      id: "seg-old",
      airline: "Saudia",
      flightNumber: "SV 100",
      fromAirport: { iata: "JED", name: "Jeddah", city: "Jeddah", country: "SA" } as any,
      toAirport: { iata: "LHR", name: "Heathrow", city: "London", country: "GB" } as any,
      departureDate: "2026-01-01",
      departureTime: "08:00",
      segmentOrder: 0,
      direction: "outbound",
    },
  ],
  returnSegments: [],
  passengerName: "Old Name",
  passengerPassport: "OLD123",
  bookingReference: "OLDREF",
  saveToTransportTimeline: true,
  saveToMedicalRecords: false,
  sendToDoctor: false,
  pendingSegmentRef: "pending-x",
  traveler: "patient",
  source: "ocr",
  extraction: {
    provider: "openai",
    confidence: 0.5,
    detectedLanguage: "english",
    translated: false,
    runAt: "2026-01-01T00:00:00.000Z",
  },
  sourceImagePaths: ["user-1/ticket-1/page-1.png"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const okExtraction = {
  provider: "openai" as const,
  confidence: 0.9,
  detectedLanguage: "english",
  translated: false,
  passengerFirstName: "Mohammed",
  passengerLastName: "Al-Rashidi",
  passportNumber: "K482916",
  rawOutbound: [
    {
      airline: "Saudia",
      flightNumber: "SV 215",
      bookingRef: "NEWREF",
      fromAirport: "JED",
      fromCity: "Jeddah",
      toAirport: "LHR",
      toCity: "London",
      departureDateTime: "2026-05-10T08:30",
      arrivalDateTime: "2026-05-10T13:00",
    },
  ],
  rawReturn: [],
};

const scope = { deviceId: "device-1", userId: "user-1" };

beforeEach(() => {
  fetchScanImagesAsDataUrlsMock.mockReset();
  extractFlightTicketMock.mockReset();
  saveTicketMock.mockReset();
  saveTicketMock.mockImplementation(async (t) => t);
});

// ---- Tests -------------------------------------------------------------

describe("rescanTicket — typed errors", () => {
  it("rejects manual tickets with code 'manual'", async () => {
    const err = await rescanTicket(baseTicket({ source: "manual" }), scope).catch((e) => e);
    expect(err).toBeInstanceOf(RescanError);
    expect(err.code).toBe("manual");
    expect(fetchScanImagesAsDataUrlsMock).not.toHaveBeenCalled();
    expect(extractFlightTicketMock).not.toHaveBeenCalled();
    expect(saveTicketMock).not.toHaveBeenCalled();
  });

  it("rejects tickets with no source images with code 'no-images'", async () => {
    const err = await rescanTicket(baseTicket({ sourceImagePaths: [] }), scope).catch((e) => e);
    expect(err).toBeInstanceOf(RescanError);
    expect(err.code).toBe("no-images");
    expect(fetchScanImagesAsDataUrlsMock).not.toHaveBeenCalled();
  });

  it("wraps storage failures with code 'storage' and preserves cause", async () => {
    const cause = new FakeScanStorageError("sign failed");
    fetchScanImagesAsDataUrlsMock.mockRejectedValue(cause);
    const err = await rescanTicket(baseTicket(), scope).catch((e) => e);
    expect(err).toBeInstanceOf(RescanError);
    expect(err.code).toBe("storage");
    expect(err.cause).toBe(cause);
    expect(extractFlightTicketMock).not.toHaveBeenCalled();
    expect(saveTicketMock).not.toHaveBeenCalled();
  });

  it("wraps extraction failures with code 'extraction'", async () => {
    fetchScanImagesAsDataUrlsMock.mockResolvedValue(["data:image/png;base64,A"]);
    extractFlightTicketMock.mockRejectedValue(new Error("AI down"));
    const err = await rescanTicket(baseTicket(), scope).catch((e) => e);
    expect(err).toBeInstanceOf(RescanError);
    expect(err.code).toBe("extraction");
    expect(saveTicketMock).not.toHaveBeenCalled();
  });

  it("guards against zero-segment extraction (does not save)", async () => {
    fetchScanImagesAsDataUrlsMock.mockResolvedValue(["data:image/png;base64,A"]);
    extractFlightTicketMock.mockResolvedValue({
      ...okExtraction,
      rawOutbound: [],
      rawReturn: [],
    });
    const err = await rescanTicket(baseTicket(), scope).catch((e) => e);
    expect(err).toBeInstanceOf(RescanError);
    expect(err.code).toBe("extraction");
    expect(saveTicketMock).not.toHaveBeenCalled();
  });

  it("wraps save failures with code 'save'", async () => {
    fetchScanImagesAsDataUrlsMock.mockResolvedValue(["data:image/png;base64,A"]);
    extractFlightTicketMock.mockResolvedValue(okExtraction);
    saveTicketMock.mockRejectedValue(new Error("db down"));
    const err = await rescanTicket(baseTicket(), scope).catch((e) => e);
    expect(err).toBeInstanceOf(RescanError);
    expect(err.code).toBe("save");
  });
});

describe("rescanTicket — happy path", () => {
  it("preserves identity, refreshes segments + metadata, calls saveTicket once", async () => {
    fetchScanImagesAsDataUrlsMock.mockResolvedValue(["data:image/png;base64,A"]);
    extractFlightTicketMock.mockResolvedValue(okExtraction);

    const original = baseTicket();
    const updated = await rescanTicket(original, scope);

    // Identity preserved
    expect(updated.id).toBe(original.id);
    expect(updated.deviceId).toBe(original.deviceId);
    expect(updated.userId).toBe(original.userId);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.traveler).toBe(original.traveler);
    expect(updated.saveToTransportTimeline).toBe(original.saveToTransportTimeline);
    expect(updated.saveToMedicalRecords).toBe(original.saveToMedicalRecords);
    expect(updated.sendToDoctor).toBe(original.sendToDoctor);
    expect(updated.pendingSegmentRef).toBe(original.pendingSegmentRef);
    expect(updated.sourceImagePaths).toEqual(original.sourceImagePaths);

    // Refreshed
    expect(updated.outboundSegments).toHaveLength(1);
    expect(updated.outboundSegments[0].flightNumber).toContain("215");
    expect(updated.passengerName).toBe("Mohammed Al-Rashidi");
    expect(updated.passengerPassport).toBe("K482916");
    expect(updated.bookingReference).toBe("NEWREF");
    expect(updated.extraction?.provider).toBe("openai");
    expect(updated.extraction?.confidence).toBe(0.9);
    expect(updated.extraction?.detectedLanguage).toBe("english");
    expect(updated.extraction?.translated).toBe(false);
    expect(updated.extraction?.runAt).toBeTruthy();
    expect(updated.updatedAt).not.toBe(original.updatedAt);

    expect(saveTicketMock).toHaveBeenCalledTimes(1);
    expect(saveTicketMock.mock.calls[0][0].id).toBe(original.id);
  });

  it("falls back to scope.deviceId / userId when ticket lacks them", async () => {
    fetchScanImagesAsDataUrlsMock.mockResolvedValue(["data:image/png;base64,A"]);
    extractFlightTicketMock.mockResolvedValue(okExtraction);

    const ticket = baseTicket({ deviceId: "", userId: null });
    const updated = await rescanTicket(ticket, { deviceId: "fallback-device", userId: "fallback-user" });

    expect(updated.deviceId).toBe("fallback-device");
    expect(updated.userId).toBe("fallback-user");
  });

  it("is idempotent — sequential calls keep same id and createdAt", async () => {
    fetchScanImagesAsDataUrlsMock.mockResolvedValue(["data:image/png;base64,A"]);
    extractFlightTicketMock.mockResolvedValue(okExtraction);

    const original = baseTicket();
    const first = await rescanTicket(original, scope);
    const second = await rescanTicket(first, scope);

    expect(second.id).toBe(original.id);
    expect(second.createdAt).toBe(original.createdAt);
    expect(saveTicketMock).toHaveBeenCalledTimes(2);
    expect(saveTicketMock.mock.calls[0][0].id).toBe(original.id);
    expect(saveTicketMock.mock.calls[1][0].id).toBe(original.id);
  });
});
