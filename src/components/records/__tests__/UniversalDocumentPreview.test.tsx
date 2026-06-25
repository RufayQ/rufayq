/**
 * Unifies coverage for the canonical PDF / image / office preview.
 * Confirms: routing by mime, pagination controls on multi-page PDFs,
 * and that the unknown-type fallback no longer renders the PDF canvas
 * (regression: previously unknown types were rendered through pdfjs).
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// pdfjs stub that pretends to load a 3-page PDF.
vi.mock("pdfjs-dist", () => {
  const page = {
    getViewport: () => ({ width: 200, height: 280 }),
    render: () => ({ promise: Promise.resolve() }),
  };
  return {
    GlobalWorkerOptions: { workerSrc: "" },
    getDocument: () => ({
      promise: Promise.resolve({ numPages: 3, getPage: () => Promise.resolve(page) }),
    }),
  };
});
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "stub-worker.js" }));

// jsdom returns null for getContext("2d"); stub so PdfPreview reaches the
// "ready" state.
beforeAll(() => {
  (HTMLCanvasElement.prototype as any).getContext = function () {
    return {} as any;
  };
  (HTMLCanvasElement.prototype as any).toDataURL = function () {
    return "data:image/jpeg;base64,AAA";
  };
});

import UniversalDocumentPreview from "@/components/records/UniversalDocumentPreview";

describe("UniversalDocumentPreview · unified PDF viewer", () => {
  it("renders multi-page PDFs with pagination controls and navigates pages", async () => {
    render(
      <UniversalDocumentPreview
        url="https://example.com/x.pdf"
        fileName="x.pdf"
        title="Test PDF"
        mimeType="application/pdf"
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId("pdf-page-indicator")).toHaveTextContent("1 / 3");
    });
    fireEvent.click(screen.getByLabelText("Next page"));
    await waitFor(() => {
      expect(screen.getByTestId("pdf-page-indicator")).toHaveTextContent("2 / 3");
    });
    expect(screen.getByLabelText("Download PDF")).toHaveAttribute("href", "https://example.com/x.pdf");
  });

  it("renders unknown file types through the generic panel (not the PDF renderer)", () => {
    render(
      <UniversalDocumentPreview
        url="https://example.com/file.xyz"
        fileName="file.xyz"
        title="Unknown"
        mimeType="application/octet-stream"
      />
    );
    expect(screen.queryByText(/Loading PDF preview/i)).toBeNull();
    expect(screen.getByText("file.xyz")).toBeInTheDocument();
    expect(screen.getByText("Open").closest("a")).toHaveAttribute("href", "https://example.com/file.xyz");
  });

  it("routes images straight to an <img> tag", () => {
    render(
      <UniversalDocumentPreview
        url="https://example.com/p.jpg"
        fileName="p.jpg"
        title="Photo"
        mimeType="image/jpeg"
      />
    );
    expect(screen.getByAltText("Photo")).toBeInTheDocument();
  });
});
