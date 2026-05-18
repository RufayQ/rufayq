/**
 * E2E — RelatedDocumentsCard preview routing.
 *
 * Two attachments are seeded directly via mocked supabase:
 *   1. A PDF — opening the tile must mount the inline <object type="pdf">
 *      preview (with an <iframe> fallback inside).
 *   2. A Word doc — opening the tile must show the "no inline preview"
 *      fallback panel with working Open + Download anchors pointing at the
 *      signed URL.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";

vi.mock("sonner", () => ({
  toast: Object.assign((..._a: any[]) => {}, { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/hooks/useDeviceId", () => ({ getDeviceId: () => "test-device" }));

const PDF_URL = "https://signed.example/visa.pdf?sig=1";
const DOC_URL = "https://signed.example/letter.docx?sig=2";

const ITEMS = [
  {
    id: "att-pdf",
    device_id: "test-device",
    segment_ref: "seg-1",
    label: "Visa",
    file_name: "visa.pdf",
    file_path: "test-device/seg-1/visa.pdf",
    mime_type: "application/pdf",
    size_bytes: 1234,
    created_at: new Date().toISOString(),
  },
  {
    id: "att-doc",
    device_id: "test-device",
    segment_ref: "seg-1",
    label: "Discharge",
    file_name: "letter.docx",
    file_path: "test-device/seg-1/letter.docx",
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size_bytes: 2345,
    created_at: new Date().toISOString(),
  },
];

const fromMock: any = vi.fn((_t?: string) => {
  const chain: any = {
    select: () => chain,
    is: () => chain,
    or: () => chain,
    eq: () => chain,
    order: async () => ({ data: ITEMS, error: null }),
    update: () => ({ eq: async () => ({ error: null }) }),
    insert: async () => ({ error: null }),
  };
  return chain;
});

const storageFromMock: any = vi.fn((_b?: string) => ({
  upload: async () => ({ data: { path: "x" }, error: null }),
  remove: async () => ({ data: null, error: null }),
  createSignedUrl: async (path: string) => ({
    data: { signedUrl: path.endsWith(".pdf") ? PDF_URL : DOC_URL },
    error: null,
  }),
  createSignedUrls: async () => ({ data: [], error: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    from: (t: string) => fromMock(t),
    storage: { from: (b: string) => storageFromMock(b) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  },
}));

import RelatedDocumentsCard from "@/components/RelatedDocumentsCard";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RelatedDocumentsCard preview", () => {
  it("renders PDF inline via <object>/<iframe> with the signed URL", async () => {
    render(<RelatedDocumentsCard segmentRef="seg-1" userId={null} />);
    const pdfTile = await screen.findByTitle("Visa");
    fireEvent.click(pdfTile);

    const pdfObject = await waitFor(() => {
      const el = document.querySelector('object[type="application/pdf"]') as HTMLObjectElement | null;
      expect(el).not.toBeNull();
      return el!;
    });
    expect(pdfObject.getAttribute("data")).toContain(PDF_URL);
    expect(within(pdfObject as unknown as HTMLElement).getByTitle("visa.pdf")).toBeInTheDocument();
  });

  it("renders Office documents with Open + Download fallback (no inline preview)", async () => {
    render(<RelatedDocumentsCard segmentRef="seg-1" userId={null} />);
    const docTile = await screen.findByTitle("Discharge");
    fireEvent.click(docTile);

    // Wait for the preview modal to mount and surface the Open/Download links.
    const openLink = await waitFor(() => {
      const all = Array.from(document.querySelectorAll("a"));
      const link = all.find((a) => /Open/i.test(a.textContent || ""));
      expect(link).toBeTruthy();
      return link!;
    }, { timeout: 3000 });
    const downloadLink = Array.from(document.querySelectorAll("a")).find((a) => /Download/i.test(a.textContent || ""))!;
    expect(openLink).toHaveAttribute("href", DOC_URL);
    expect(openLink).toHaveAttribute("target", "_blank");
    expect(downloadLink).toHaveAttribute("href", DOC_URL);
    expect(downloadLink).toHaveAttribute("download", "letter.docx");
    // Office docs must NOT trigger the inline PDF object preview.
    expect(document.querySelector('object[type="application/pdf"]')).toBeNull();
  });
});
