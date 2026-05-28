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
  // On failure each variant dumps an HTML + SVG snapshot under
  // `test-artifacts/qc/transport-<label>/` so the QC portal upload script can
  // categorize the screenshot by milestone (flight/train/taxi/rental).
  it.each(cases)("fires onTap when the $label card is tapped", async ({ over, label }) =>
    withQcArtifacts(`transport-${label}`, () => {
      const onTap = vi.fn();
      render(<TransportCard seg={baseSeg(over)} onTap={onTap} />);
      const hint = screen.getByText(/Tap for details/i);
      fireEvent.click(hint.closest("div.card-press") || hint);
      expect(onTap).toHaveBeenCalledTimes(1);
    })(),
  );


  it("does not throw when onTap is undefined", () => {
    render(<TransportCard seg={baseSeg({ type: "flight" })} />);
    const hint = screen.getByText(/Tap for details/i);
    expect(() => fireEvent.click(hint.closest("div.card-press") || hint)).not.toThrow();
  });
});
