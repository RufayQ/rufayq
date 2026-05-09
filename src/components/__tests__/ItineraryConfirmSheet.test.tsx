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
  describe("edit + confirm flow", () => {
    it("forwards edited outbound + return fields to onConfirm only after Apply", () => {
      const { onConfirm, onCancel } = renderSheet();

      const outboundEditor = screen.getByText(/OUTBOUND/i).closest("div")!.parentElement!;
      const airlineInput = within(outboundEditor).getByDisplayValue("Saudia") as HTMLInputElement;
      fireEvent.change(airlineInput, { target: { value: "Air Arabia" } });

      const flightNoInput = within(outboundEditor).getByDisplayValue("SV123") as HTMLInputElement;
      fireEvent.change(flightNoInput, { target: { value: "G9123" } });

      const returnEditor = screen.getByText(/RETURN/i).closest("div")!.parentElement!;
      const seatInput = within(returnEditor).getByDisplayValue("12A") as HTMLInputElement;
      fireEvent.change(seatInput, { target: { value: "14C" } });

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

      const outboundEditor = screen.getByText(/OUTBOUND/i).closest("div")!.parentElement!;
      const airlineInput = within(outboundEditor).getByDisplayValue("Saudia") as HTMLInputElement;
      fireEvent.change(airlineInput, { target: { value: "DISCARDED" } });

      // Use the bottom Cancel text button to avoid colliding with the close (X) icon.
      fireEvent.click(screen.getByRole("button", { name: /^Cancel/i }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("discards edits when the close (X) button is tapped", () => {
      const { onConfirm, onCancel } = renderSheet();
      const outboundEditor = screen.getByText(/OUTBOUND/i).closest("div")!.parentElement!;
      const airlineInput = within(outboundEditor).getByDisplayValue("Saudia") as HTMLInputElement;
      fireEvent.change(airlineInput, { target: { value: "DISCARDED" } });

      // The close button is a 32×32 button containing the X icon — pick first
      // button rendered (top-right) that isn't a labelled action.
      const closeBtns = screen.getAllByRole("button");
      // The first button is the close (top-right) per render order.
      fireEvent.click(closeBtns[0]);

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
