/**
 * Slow-network e2e for "Attach from My Records":
 *
 *  - Under a 1.2s-delayed `listAllUserRecords` (simulating slow 3G / mobile
 *    WebView), opening the picker MUST mount the skeleton immediately and
 *    keep the sheet visible the entire time — it must never unmount, flash
 *    empty, or crash the picker.
 *  - When the load eventually resolves, the records list renders and is
 *    pickable.
 *  - When the first load rejects, the auto-retry path kicks in (after ~600ms
 *    backoff) and the second resolve hydrates the list. The sheet remains
 *    mounted across the whole transient failure window.
 *  - When both attempts fail, the in-sheet error UI surfaces stage, route,
 *    and the retry count — and the sheet is still mounted.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ChatRecordsPicker from "../ChatRecordsPicker";

const SIGNED_URL = "https://signed.example/lab.pdf?sig=slow";

const RECORD = {
  id: "rec-slow-1",
  origin: "medical-scan" as const,
  label: "Slow Lab Report",
  fileName: "slow-lab.pdf",
  sourceLabelEn: "Medical",
  sourceLabelAr: "طبي",
  mimeType: "application/pdf",
  dateLabel: "May 1",
  sendableToChat: true,
};

const listAllUserRecords = vi.fn();
const resolveRecordSignedUrl = vi.fn();
const logAttachErrorTelemetry = vi.fn();

vi.mock("@/lib/records/recordSources", () => ({
  listAllUserRecords: (...a: any[]) => listAllUserRecords(...a),
  resolveRecordSignedUrl: (...a: any[]) => resolveRecordSignedUrl(...a),
}));
vi.mock("@/hooks/useAuthUserId", () => ({
  useAuthUserId: () => null,
  useAuthSession: () => ({ userId: null, isReady: true }),
}));
vi.mock("@/hooks/useDeviceId", () => ({ getDeviceId: () => "device-slow" }));
vi.mock("@/lib/records/attachErrorTelemetry", () => ({
  logAttachErrorTelemetry: (...a: any[]) => logAttachErrorTelemetry(...a),
  shortCause: (e: any) => (e?.message ?? String(e)).slice(0, 80),
}));
vi.mock("sonner", () => ({
  toast: Object.assign((..._a: any[]) => {}, { success: vi.fn(), error: vi.fn() }),
}));

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("ChatRecordsPicker · slow network / WebView resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveRecordSignedUrl.mockResolvedValue(SIGNED_URL);
  });

  it("keeps the sheet mounted under a slow listAllUserRecords and renders results when it resolves", async () => {
    listAllUserRecords.mockImplementation(async () => {
      await delay(1200);
      return [RECORD];
    });

    render(<ChatRecordsPicker open onClose={() => {}} onPick={async () => {}} />);

    // Sheet (search input) and skeleton are immediately mounted.
    expect(await screen.findByLabelText("Search records")).toBeInTheDocument();
    expect(screen.getByTestId("records-picker-skeleton")).toBeInTheDocument();

    // Halfway through the slow load, the sheet is still mounted — no crash.
    await act(async () => { await delay(600); });
    expect(screen.getByLabelText("Search records")).toBeInTheDocument();
    expect(screen.getByTestId("records-picker-skeleton")).toBeInTheDocument();

    // After the load resolves, the row renders.
    await waitFor(
      () => expect(screen.getByRole("button", { name: /Slow Lab Report/i })).toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(screen.queryByTestId("records-picker-skeleton")).not.toBeInTheDocument();
  });

  it("auto-retries a transient failure and hydrates the list without unmounting", async () => {
    let calls = 0;
    listAllUserRecords.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        await delay(50);
        throw new Error("transient network");
      }
      await delay(50);
      return [RECORD];
    });

    render(<ChatRecordsPicker open onClose={() => {}} onPick={async () => {}} />);
    expect(await screen.findByLabelText("Search records")).toBeInTheDocument();

    // Across the retry window the sheet must remain mounted.
    await waitFor(
      () => expect(screen.getByRole("button", { name: /Slow Lab Report/i })).toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(calls).toBe(2);
    expect(screen.getByLabelText("Search records")).toBeInTheDocument();
  });

  it("when both attempts fail, surfaces stage/route/retry in-sheet and stays mounted", async () => {
    listAllUserRecords.mockImplementation(async () => {
      await delay(20);
      throw new Error("offline");
    });

    render(<ChatRecordsPicker open onClose={() => {}} onPick={async () => {}} route="slow-test-route" />);

    const errorBox = await screen.findByTestId("records-picker-error", undefined, { timeout: 3000 });
    expect(errorBox).toBeInTheDocument();
    expect(screen.getByTestId("records-picker-error-stage").textContent).toMatch(/listAllUserRecords/);
    expect(errorBox.textContent).toMatch(/slow-test-route/);
    expect(errorBox.textContent).toMatch(/retries:\s*1/);
    // Sheet (search row) is still mounted alongside the error.
    expect(screen.getByLabelText("Search records")).toBeInTheDocument();

    // Manual retry button restarts the flow.
    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    // Underlying fetch was called again (auto-retry +1 + initial 2 + manual 1).
    await waitFor(() => expect(listAllUserRecords.mock.calls.length).toBeGreaterThanOrEqual(3));
  });
});
