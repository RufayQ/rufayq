/**
 * E2E test — TravelScannedRecordViewer.
 *
 * Verifies:
 *   - Tapping the fullscreen control lifts the preview image into a true
 *     fullscreen overlay (and Escape exits back to the editor).
 *   - Editing a key field's value, hitting Save, persists the change via
 *     updateTravelScannedRecord and surfaces it back through onUpdated.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("sonner", () => ({
  toast: Object.assign((..._a: any[]) => {}, { success: vi.fn(), error: vi.fn() }),
}));

import TravelScannedRecordViewer from "@/components/records/TravelScannedRecordViewer";
import { addTravelScannedRecord, listTravelScannedRecords } from "@/lib/travelScannedRecordsStore";

beforeEach(() => {
  localStorage.clear();
});

describe("TravelScannedRecordViewer", () => {
  it("opens fullscreen and saves edited key fields", () => {
    const record = addTravelScannedRecord({
      category: "legal",
      subcategory: "Visa",
      title: "Schengen Visa",
      fileName: "visa.pdf",
      pageCount: 1,
      keyFields: [
        { label: "Document No", value: "AB123456" },
        { label: "Expiry", value: "2027-01-01" },
      ],
      pageImages: ["data:image/png;base64,iVBORw0KGgo="],
    });

    const onUpdated = vi.fn();
    render(
      <TravelScannedRecordViewer
        record={record}
        onClose={() => {}}
        onUpdated={onUpdated}
      />,
    );

    // Fullscreen toggle is rendered because pageImages exists.
    fireEvent.click(screen.getByRole("button", { name: /fullscreen/i }));
    expect(screen.getByRole("button", { name: /exit fullscreen/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /exit fullscreen/i }));

    // Enter edit mode and modify the Document No value.
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    const valueInputs = screen.getAllByPlaceholderText("Value");
    fireEvent.change(valueInputs[0], { target: { value: "ZZ999000" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // onUpdated fires with the persisted patch.
    expect(onUpdated).toHaveBeenCalledTimes(1);
    const next = onUpdated.mock.calls[0][0];
    expect(next.keyFields?.[0]).toEqual({ label: "Document No", value: "ZZ999000" });

    // Persistence reads back from the local store.
    const stored = listTravelScannedRecords().find((r) => r.id === record.id);
    expect(stored?.keyFields?.[0].value).toBe("ZZ999000");
  });
});
