import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TransportCard, { type TransportSegment } from "@/components/TransportCard";
import { withQcArtifacts } from "@/test/qcArtifacts";


// `toast` is invoked from action-row helpers but not from the tap path. Stub
// to keep the test environment quiet.
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const baseSeg = (over: Partial<TransportSegment>): TransportSegment => ({
  id: "seg-x",
  type: "flight",
  status: "upcoming",
  fromCity: "Riyadh",
  fromCode: "RUH",
  toCity: "Frankfurt",
  toCode: "FRA",
  departureDateTime: "2026-07-01T10:00:00",
  arrivalDateTime: "2026-07-01T16:00:00",
  ...over,
});

const cases: { label: string; over: Partial<TransportSegment> }[] = [
  { label: "flight",  over: { type: "flight",  airline: "Lufthansa", flightNumber: "LH123" } },
  { label: "train",   over: { type: "train",   trainOperator: "DB",  trainNumber: "ICE 78" } },
  { label: "taxi",    over: { type: "taxi",    taxiProvider: "Uber" } },
  { label: "rental",  over: { type: "rental",  rentalCompany: "Sixt", carModel: "Audi A4" } }, // "car"
];

describe("TransportCard — Tap for details (E2E expand)", () => {
  it.each(cases)("fires onTap when the $label card is tapped", ({ over }) => {
    const onTap = vi.fn();
    render(<TransportCard seg={baseSeg(over)} onTap={onTap} />);
    // The whole card is the tap target — find the "Tap for details" affordance
    // and click an ancestor to mimic a real user tap.
    const hint = screen.getByText(/Tap for details/i);
    fireEvent.click(hint.closest("div.card-press") || hint);
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("does not throw when onTap is undefined", () => {
    render(<TransportCard seg={baseSeg({ type: "flight" })} />);
    const hint = screen.getByText(/Tap for details/i);
    expect(() => fireEvent.click(hint.closest("div.card-press") || hint)).not.toThrow();
  });
});
