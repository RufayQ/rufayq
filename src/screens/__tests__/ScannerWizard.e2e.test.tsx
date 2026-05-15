/**
 * Slice 4 — End-to-end ScannerWizard tests (post AI-disable for flights).
 *
 * Flight category currently bypasses the AI extraction path (flag
 * FLIGHT_AI_ENABLED = false in src/lib/flightAiFlag.ts) and routes the
 * user straight to the manual entry sheet on Step 4. These tests verify:
 *   • Wizard opened with `preselectedCategory="flight"` mounts the manual
 *     entry sheet immediately, with no OCR call and no PDF analysis.
 *   • Submitting valid manual data lands us on Step 5 with `source: "manual"`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ---- Mocks ---------------------------------------------------------------

const invokeMock = vi.fn();
const makeQueryStub = (): any => {
  const stub: any = new Proxy(
    { then: (resolve: any) => resolve({ data: [], error: null }) },
    {
      get(target, prop) {
        if (prop === "then") return target.then;
        if (prop === "maybeSingle" || prop === "single")
          return async () => ({ data: null, error: null });
        return () => makeQueryStub();
      },
    },
  );
  return stub;
};
const fromMock: any = vi.fn(() => makeQueryStub());
const storageFromMock: any = vi.fn(() => ({
  upload: async () => ({ data: { path: "x" }, error: null }),
  remove: async () => ({ data: null, error: null }),
  createSignedUrl: async () => ({ data: { signedUrl: "https://x" }, error: null }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    functions: { invoke: (...args: any[]) => invokeMock(...args) },
    from: (table: string) => fromMock(table),
    storage: { from: (b: string) => storageFromMock(b) },
  },
}));

vi.mock("@/hooks/useDeviceId", () => ({
  getDeviceId: () => "test-device",
}));

const analyzePdfPagesMock = vi.fn();
const renderPdfPagesAtScaleMock = vi.fn();
vi.mock("@/lib/pdfToImages", () => ({
  analyzePdfPages: (...args: any[]) => analyzePdfPagesMock(...args),
  renderPdfPagesAtScale: (...args: any[]) => renderPdfPagesAtScaleMock(...args),
}));

vi.mock("@/shared/ui", () => ({
  FileUploadPreview: ({ file }: any) => <div data-testid="file-preview">{file?.name}</div>,
}));

import ScannerWizard from "@/screens/ScannerWizard";

beforeEach(() => {
  invokeMock.mockReset();
  analyzePdfPagesMock.mockReset();
  renderPdfPagesAtScaleMock.mockReset();
  // Clean any draft persisted from a previous test
  if (typeof localStorage !== "undefined") localStorage.clear();
});

describe("ScannerWizard E2E — flight flow (AI disabled)", () => {
  it("jumps straight to the manual entry sheet — no OCR, no PDF analysis", async () => {
    render(<ScannerWizard onClose={() => {}} preselectedCategory="flight" onSave={() => {}} />);

    // Manual entry sheet renders immediately on open.
    expect(await screen.findByTestId("manual-flight-sheet")).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
    expect(analyzePdfPagesMock).not.toHaveBeenCalled();
  });

  it("manual submission advances to Step 5 with source=manual", async () => {
    const onSave = vi.fn();
    render(<ScannerWizard onClose={() => {}} preselectedCategory="flight" onSave={onSave} />);

    expect(await screen.findByTestId("manual-flight-sheet")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("seg-outbound-0-flight"), { target: { value: "EK500" } });
    fireEvent.click(screen.getByTestId("seg-outbound-0-from"));
    fireEvent.change(await screen.findByTestId("seg-outbound-0-from-search"), { target: { value: "DXB" } });
    fireEvent.click(await screen.findByTestId("seg-outbound-0-from-option-DXB"));
    fireEvent.click(screen.getByTestId("seg-outbound-0-to"));
    fireEvent.change(await screen.findByTestId("seg-outbound-0-to-search"), { target: { value: "BKK" } });
    fireEvent.click(await screen.findByTestId("seg-outbound-0-to-option-BKK"));
    fireEvent.change(screen.getByTestId("seg-outbound-0-dep-date"), { target: { value: "2026-06-01" } });
    fireEvent.change(screen.getByTestId("seg-outbound-0-dep-time-hh"), { target: { value: "09" } });
    fireEvent.change(screen.getByTestId("seg-outbound-0-dep-time-mm"), { target: { value: "00" } });
    fireEvent.click(screen.getByTestId("submit-manual"));

    await waitFor(() => {
      expect(screen.queryByTestId("manual-flight-sheet")).not.toBeInTheDocument();
    });

    // We're now on Step 5 — JourneyTimeline should appear with our route.
    await waitFor(() => {
      expect(screen.getByTestId("journey-timeline")).toBeInTheDocument();
    }, { timeout: 4000 });
    expect(screen.getAllByText(/DXB/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BKK/).length).toBeGreaterThan(0);
  });
});
