import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ItineraryConfirmSheet from "@/components/ItineraryConfirmSheet";
import type { FlightInfo } from "@/components/AddTripSheet";

const baseLeg = (over: Partial<FlightInfo> = {}): FlightInfo => ({
  airline: "Saudia",
  flightNumber: "SV123",
  bookingRef: "ABC123",
  fromAirport: "DMM",
  fromCity: "Dammam",
  fromAirportFull: "King Fahd International",
  toAirport: "HBE",
  toCity: "Alexandria",
  toAirportFull: "Borg El Arab",
  departureDateTime: "2026-02-01T08:00",
  arrivalDateTime: "2026-02-01T11:30",
  seatClass: "Economy",
  seatNumber: "12A",
  ...over,
});

const renderSheet = (overrides: Partial<React.ComponentProps<typeof ItineraryConfirmSheet>> = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <ItineraryConfirmSheet
      open
      outbound={baseLeg()}
      returnLeg={baseLeg({ flightNumber: "SV456", fromAirport: "HBE", toAirport: "DMM",
        fromCity: "Alexandria", toCity: "Dammam",
        departureDateTime: "2026-02-10T08:00", arrivalDateTime: "2026-02-10T11:30" })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...overrides}
    />
  );
  return { ...utils, onConfirm, onCancel };
};

describe("ItineraryConfirmSheet", () => {
  /** Resolve the leg editor container by walking up from its title text. */
  const legEditor = (title: RegExp): HTMLElement => {
    const titleEl = screen.getByText(title);
    // The closest rounded-xl div wraps the entire LegEditor.
    let node: HTMLElement | null = titleEl as HTMLElement;
    while (node && !node.className?.includes("rounded-xl")) node = node.parentElement;
    if (!node) throw new Error("Leg editor not found");
    return node;
  };

  describe("edit + confirm flow", () => {
    it("forwards edited outbound + return fields to onConfirm only after Apply", () => {
      const { onConfirm, onCancel } = renderSheet();

      const out = legEditor(/OUTBOUND/i);
      fireEvent.change(within(out).getByDisplayValue("Saudia"), { target: { value: "Air Arabia" } });
      fireEvent.change(within(out).getByDisplayValue("SV123"), { target: { value: "G9123" } });

      const ret = legEditor(/RETURN/i);
      fireEvent.change(within(ret).getByDisplayValue("12A"), { target: { value: "14C" } });

      // Nothing committed yet.
      expect(onConfirm).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: /Apply to trip/i }));

      expect(onCancel).not.toHaveBeenCalled();
      expect(onConfirm).toHaveBeenCalledTimes(1);
      const [outArg, retArg] = onConfirm.mock.calls[0];
      expect(outArg.airline).toBe("Air Arabia");
      expect(outArg.flightNumber).toBe("G9123");
      expect(retArg.seatNumber).toBe("14C");
    });
  });

  describe("cancel flow", () => {
    it("discards edits and never calls onConfirm when user taps Cancel", () => {
      const { onConfirm, onCancel } = renderSheet();
      const out = legEditor(/OUTBOUND/i);
      fireEvent.change(within(out).getByDisplayValue("Saudia"), { target: { value: "DISCARDED" } });

      // Use the bottom Cancel text button.
      fireEvent.click(screen.getByRole("button", { name: /^Cancel/i }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("discards edits when the close (X) button is tapped", () => {
      const { onConfirm, onCancel } = renderSheet();
      const out = legEditor(/OUTBOUND/i);
      fireEvent.change(within(out).getByDisplayValue("Saudia"), { target: { value: "DISCARDED" } });

      // Top-right close button is the first rendered <button>.
      fireEvent.click(screen.getAllByRole("button")[0]);

      expect(onCancel).toHaveBeenCalled();
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("disables Apply when an outbound leg has missing required fields", () => {
      renderSheet({ outbound: baseLeg({ fromCity: "", fromAirport: "" }) });
      const apply = screen.getByRole("button", { name: /Apply to trip/i }) as HTMLButtonElement;
      expect(apply).toBeDisabled();
    });
  });
});
