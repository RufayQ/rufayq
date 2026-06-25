/**
 * E2E — TravelScannedRecordViewer (Visa-specific + PDF fallback + paging).
 *
 * Covers:
 *  - Visa-specific schema fields (Visa number, Iqama expiry, Exit before,
 *    Return before) render in read mode and are editable + persisted on Save.
 *  - Multi-page records expose Previous/Next page navigation that advances
 *    the visible page indicator.
 *  - When pageImages is empty but pdfUrl is supplied, the viewer falls back
 *    to a PDF <object>/<iframe> preview universally.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import React from "react";

vi.mock("sonner", () => ({
  toast: Object.assign((..._a: any[]) => {}, { success: vi.fn(), error: vi.fn() }),
}));

import TravelScannedRecordViewer from "@/components/records/TravelScannedRecordViewer";
import { addTravelScannedRecord, listTravelScannedRecords } from "@/lib/travelScannedRecordsStore";

const visaKeyFields = [
  { label: "Visa number", value: "209590128" },
  { label: "Passport number", value: "A40925222" },
  { label: "Iqama number", value: "2511360881" },
  { label: "Visa holder", value: "Abdulrahman" },
  { label: "Nationality", value: "Saudi" },
  { label: "Iqama expiry", value: "2026-12-29" },
  { label: "Exit before", value: "2026-07-18" },
  { label: "Return before", value: "2026-07-18" },
];

beforeEach(() => {
  localStorage.clear();
});

describe("TravelScannedRecordViewer · Visa", () => {
  it("renders all visa-specific key fields and persists edits", () => {
    const record = addTravelScannedRecord({
      category: "legal",
      subcategory: "Visa",
      title: "Exit Re-Entry Visa",
      fileName: "visa.pdf",
      pageCount: 1,
      keyFields: visaKeyFields,
      pageImages: ["data:image/png;base64,iVBORw0KGgo="],
    });

    const onUpdated = vi.fn();
    render(<TravelScannedRecordViewer record={record} onClose={() => {}} onUpdated={onUpdated} />);

    // All visa-specific labels render in read mode (values may repeat).
    for (const f of visaKeyFields) {
      expect(screen.getByText(f.label)).toBeInTheDocument();
      expect(screen.getAllByText(f.value).length).toBeGreaterThan(0);
    }

    // Edit "Exit before" and "Visa number" → save → persisted in store.
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    const valueInputs = screen.getAllByPlaceholderText("Value");
    fireEvent.change(valueInputs[0], { target: { value: "999000111" } }); // Visa number
    fireEvent.change(valueInputs[6], { target: { value: "2026-08-01" } }); // Exit before
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onUpdated).toHaveBeenCalledTimes(1);
    const stored = listTravelScannedRecords().find((r) => r.id === record.id);
    expect(stored?.keyFields?.find((f) => f.label === "Visa number")?.value).toBe("999000111");
    expect(stored?.keyFields?.find((f) => f.label === "Exit before")?.value).toBe("2026-08-01");
  });

  it("navigates between pages on multi-page records", () => {
    const record = addTravelScannedRecord({
      category: "legal",
      subcategory: "Visa",
      title: "Multi-page Visa",
      fileName: "visa.pdf",
      pageCount: 3,
      pageImages: [
        "data:image/png;base64,AAA=",
        "data:image/png;base64,BBB=",
        "data:image/png;base64,CCC=",
      ],
    });

    render(<TravelScannedRecordViewer record={record} onClose={() => {}} />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /previous page/i }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("falls back to the unified PDF preview when pageImages is empty but pdfUrl is supplied", async () => {
    const record = addTravelScannedRecord({
      category: "legal",
      subcategory: "Visa",
      title: "PDF-only Visa",
      fileName: "visa.pdf",
      pageCount: 1,
      pdfUrl: "https://example.com/visa.pdf",
    });

    render(<TravelScannedRecordViewer record={record} onClose={() => {}} />);

    // The unified previewer mounts the pdfjs loading panel. In jsdom the
    // worker import fails, so the preview surfaces its ErrorPanel with an
    // "Open in new tab" link to the original signed URL.
    const open = await screen.findByText(/Open in new tab/i, undefined, { timeout: 5000 });
    expect(open.closest("a")).toHaveAttribute("href", "https://example.com/visa.pdf");
    // Legacy <object> fallback must not be used anymore.
    expect(document.body.querySelector('object[type="application/pdf"]')).toBeNull();
  });
});
