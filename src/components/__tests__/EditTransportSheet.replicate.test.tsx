import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EditTransportSheet from "@/components/EditTransportSheet";
import type { TransportSegment } from "@/components/TransportCard";

const draft = (over: Partial<TransportSegment> = {}): TransportSegment => ({
  id: "seg-replica",
  type: "flight",
  status: "upcoming",
  fromCity: "Riyadh",
  fromCode: "RUH",
  toCity: "Frankfurt",
  toCode: "FRA",
  airline: "Lufthansa",
  flightNumber: "LH123",
  departureDateTime: "2026-01-10T10:00:00",
  arrivalDateTime: "2026-01-10T16:00:00",
  ...over,
});

describe("EditTransportSheet — replicated trip date validation", () => {
  it("blocks save and shows inline error when the date matches the original", () => {
    const onSave = vi.fn();
    render(
      <EditTransportSheet
        open
        segment={draft({ departureDateTime: "2026-01-10T10:00:00" })}
        originalDepartureIso="2026-01-10T10:00:00"
        isReplicating
        onCancel={() => {}}
        onSave={onSave}
      />,
    );
    expect(screen.getByTestId("replicate-date-error")).toBeInTheDocument();
    const save = screen.getByTestId("edit-transport-save") as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("allows save once the user picks a new departure date", () => {
    const onSave = vi.fn();
    render(
      <EditTransportSheet
        open
        segment={draft({ departureDateTime: "2026-02-14T10:00:00", arrivalDateTime: "2026-02-14T16:00:00" })}
        originalDepartureIso="2026-01-10T10:00:00"
        isReplicating
        onCancel={() => {}}
        onSave={onSave}
      />,
    );
    expect(screen.queryByTestId("replicate-date-error")).not.toBeInTheDocument();
    const save = screen.getByTestId("edit-transport-save") as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("does not enforce the replicate rule on normal edits", () => {
    const onSave = vi.fn();
    render(
      <EditTransportSheet
        open
        segment={draft()}
        onCancel={() => {}}
        onSave={onSave}
      />,
    );
    expect(screen.queryByTestId("replicate-date-error")).not.toBeInTheDocument();
    const save = screen.getByTestId("edit-transport-save") as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });
});
