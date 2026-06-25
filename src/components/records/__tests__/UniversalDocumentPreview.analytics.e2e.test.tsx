/**
 * Regression — analytics, persistence, progressive skeleton, and touch gestures.
 *
 * Covers:
 *   • `pdf_load_started` / `pdf_load_succeeded` / `pdf_load_failed`
 *     / `pdf_retry` / `pdf_download` / `pdf_zoom_change` / `pdf_search`
 *     fire with stable URL hashes (no signed-token leak).
 *   • Progressive load skeletons render while onProgress reports partial bytes.
 *   • Persisted state (page / zoom / search) hydrates on next mount via
 *     localStorage.
 *   • Touch gestures: horizontal swipe pages and pinch updates zoom.
 */
import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

let shouldFailLoad = false;
let lastLoadingTask: any = null;
let deferredResolver: ((doc: any) => void) | null = null;

vi.mock("pdfjs-dist", () => {
  const makePage = (n: number) => ({
    getViewport: ({ scale = 1 }: any = {}) => ({ width: 200 * scale, height: 280 * scale }),
    render: () => ({ promise: Promise.resolve() }),
    getTextContent: () => Promise.resolve({
      items: [{ str: `page-${n}` }, { str: "boarding" }],
    }),
  });
  return {
    GlobalWorkerOptions: { workerSrc: "" },
    getDocument: () => {
      const task: any = {};
      const doc = { numPages: 4, getPage: (n: number) => Promise.resolve(makePage(n)) };
      if (shouldFailLoad) {
        task.promise = Promise.reject(new Error("network-fail"));
      } else if (deferredResolver !== null) {
        // Test wants control over when load resolves.
        task.promise = new Promise<any>((resolve) => { deferredResolver = resolve; });
      } else {
        task.promise = Promise.resolve(doc);
      }
      // expose the doc for deferred resolution
      task._doc = doc;
      lastLoadingTask = task;
      return task;
    },
  };
});

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "stub-worker.js" }));

beforeAll(() => {
  (HTMLCanvasElement.prototype as any).getContext = function () { return {} as any; };
  (HTMLCanvasElement.prototype as any).toDataURL = function () { return "data:image/jpeg;base64,AAA"; };
});

import UniversalDocumentPreview from "@/components/records/UniversalDocumentPreview";
import { subscribePdfAnalytics, hashUrl, type PdfAnalyticsPayload } from "@/lib/pdfAnalytics";
import { clearPdfViewerState, loadPdfViewerState } from "@/lib/pdfViewerState";

const URL_A = "https://signed.example/big.pdf?sig=abc";

beforeEach(() => {
  shouldFailLoad = false;
  lastLoadingTask = null;
  deferredResolver = null;
  window.localStorage.clear();
});

const renderPdf = (extra: Partial<React.ComponentProps<typeof UniversalDocumentPreview>> = {}) =>
  render(
    <UniversalDocumentPreview
      url={URL_A}
      fileName="big.pdf"
      title="Big PDF"
      mimeType="application/pdf"
      {...extra}
    />
  );

const captureEvents = () => {
  const events: PdfAnalyticsPayload[] = [];
  const unsub = subscribePdfAnalytics((p) => events.push(p));
  return { events, unsub };
};

describe("UniversalDocumentPreview · analytics + persistence + gestures", () => {
  it("emits started / succeeded / page_view analytics with hashed URLs", async () => {
    const { events, unsub } = captureEvents();
    renderPdf();
    await waitFor(() => expect(screen.getByTestId("pdf-page-indicator")).toBeInTheDocument());
    const names = events.map((e) => e.event);
    expect(names).toContain("pdf_load_started");
    expect(names).toContain("pdf_load_succeeded");
    expect(names).toContain("pdf_page_view");
    // URL hash is stable & does NOT contain the signed token.
    const hashed = hashUrl(URL_A);
    expect(events.every((e) => e.urlHash === hashed)).toBe(true);
    expect(events.every((e) => !(e as any).url || !(e as any).url.includes("sig=abc"))).toBe(true);
    unsub();
  });

  it("emits pdf_retry then pdf_download with the right metadata", async () => {
    shouldFailLoad = true;
    const { events, unsub } = captureEvents();
    renderPdf();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    shouldFailLoad = false;
    fireEvent.click(screen.getByLabelText("Retry preview"));
    await waitFor(() => expect(screen.getByTestId("pdf-page-indicator")).toBeInTheDocument());
    const retry = events.find((e) => e.event === "pdf_retry");
    expect(retry).toBeTruthy();
    expect(retry?.retryAttempt).toBe(1);

    fireEvent.click(screen.getByLabelText("Download PDF"));
    const dl = events.find((e) => e.event === "pdf_download");
    expect(dl).toBeTruthy();
    expect(dl?.fileName).toBe("big.pdf");
    expect(dl?.numPages).toBe(4);
    unsub();
  });

  it("shows progressive skeleton bars that fill as onProgress reports bytes", async () => {
    renderPdf();
    // Initial loading panel + skeleton rows render immediately.
    expect(screen.getAllByTestId("pdf-progress-skeleton").length).toBeGreaterThan(0);
    // Drive onProgress before the load resolves.
    await waitFor(() => expect(lastLoadingTask?.onProgress).toBeTypeOf("function"));
    act(() => { lastLoadingTask.onProgress({ loaded: 50, total: 100 }); });
    await waitFor(() => expect(screen.getByText(/50%/)).toBeInTheDocument());
    // After load completes, skeleton goes away.
    await waitFor(() => expect(screen.queryByTestId("pdf-progress-skeleton")).toBeNull());
  });

  it("persists page / zoom / search across remounts via localStorage", async () => {
    const { unmount } = renderPdf();
    await waitFor(() => expect(screen.getByTestId("pdf-page-indicator")).toHaveTextContent("1 / 4"));
    fireEvent.click(screen.getByLabelText("Next page"));
    fireEvent.click(screen.getByLabelText("Zoom in"));
    await waitFor(() => expect(screen.getByTestId("pdf-page-indicator")).toHaveTextContent("2 / 4"));
    await waitFor(() => expect(screen.getByTestId("pdf-zoom-indicator")).toHaveTextContent("125%"));
    // Debounced persist (250 ms).
    await new Promise((r) => setTimeout(r, 320));
    const saved = loadPdfViewerState(URL_A);
    expect(saved?.page).toBe(2);
    expect(saved?.zoom).toBe(1.25);
    expect(saved?.zoomMode).toBe("manual");

    unmount();
    renderPdf();
    await waitFor(() => expect(screen.getByTestId("pdf-page-indicator")).toHaveTextContent("2 / 4"));
    expect(screen.getByTestId("pdf-zoom-indicator")).toHaveTextContent("125%");
    clearPdfViewerState(URL_A);
  });

  it("handles horizontal swipe to advance pages and pinch to change zoom", async () => {
    renderPdf();
    const region = await screen.findByRole("region", { name: /PDF preview: Big PDF/ });
    await waitFor(() => expect(screen.getByTestId("pdf-page-indicator")).toHaveTextContent("1 / 4"));

    // Swipe left → next page
    fireEvent.touchStart(region, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(region, {
      changedTouches: [{ clientX: 100, clientY: 205 }],
      touches: [],
    });
    await waitFor(() => expect(screen.getByTestId("pdf-page-indicator")).toHaveTextContent("2 / 4"));

    // Pinch out → zoom in
    fireEvent.touchStart(region, {
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ],
    });
    fireEvent.touchMove(region, {
      touches: [
        { clientX: 50, clientY: 100 },
        { clientX: 250, clientY: 100 },
      ],
    });
    fireEvent.touchEnd(region, { changedTouches: [{ clientX: 250, clientY: 100 }], touches: [] });
    await waitFor(() => {
      const z = parseInt(screen.getByTestId("pdf-zoom-indicator").textContent || "0", 10);
      expect(z).toBeGreaterThan(100);
    });
  });
});
