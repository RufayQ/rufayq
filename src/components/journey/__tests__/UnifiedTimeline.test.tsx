import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import UnifiedTimeline, { buildTimelineItems } from "@/components/journey/UnifiedTimeline";
import type { TripData } from "@/components/AddTripSheet";

const trip = (over: Partial<TripData> = {}): TripData => ({
  id: "t1", destination: "Berlin", hospital: "Charité", specialty: "Ortho", specialtyEmoji: "🦴",
  departureDate: "2026-06-01", returnDate: "2026-06-10", treatingDoctor: "", companion: false,
  companionName: "", insuranceRef: "", status: "active",
  outboundFlight: {
    airline: "SV", flightNumber: "123", bookingRef: "X", fromAirport: "RUH", fromCity: "Riyadh",
    fromAirportFull: "RUH", toAirport: "BER", toCity: "Berlin", toAirportFull: "BER",
    departureDateTime: "2026-06-01T08:00:00Z", arrivalDateTime: "2026-06-01T14:00:00Z",
    seatClass: "Y", seatNumber: "12A",
  },
  returnFlight: null, ...over,
});

describe("UnifiedTimeline", () => {
  it("orders flight → lab → physician chronologically", () => {
    const items = buildTimelineItems(trip(), [
      { id: "p", kind: "physician", whenIso: "2026-06-03T10:00:00Z", title: "Dr Mueller" },
      { id: "l", kind: "lab", whenIso: "2026-06-02T09:00:00Z", title: "Blood test" },
    ]);
    expect(items.map(i => i.kind)).toEqual(["flight", "lab", "physician"]);
  });

  it("renders provider badge for provider-sourced items", () => {
    render(<UnifiedTimeline activeTrip={null} appointments={[
      { id: "a", kind: "physician", whenIso: "2026-06-02T09:00:00Z", title: "Follow-up", source: "provider" },
    ]} />);
    expect(screen.getByText(/FROM PROVIDER/i)).toBeInTheDocument();
  });

  it("shows empty state with no items", () => {
    render(<UnifiedTimeline activeTrip={null} appointments={[]} />);
    expect(screen.getByText(/No timeline items yet/i)).toBeInTheDocument();
  });
});
