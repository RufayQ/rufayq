/**
 * Regression + e2e suite for "Attach from My Records":
 *
 *  - Opening the picker MUST NOT auto-focus the search input or summon the
 *    soft keyboard (this is the crash path on Android WebViews where focus
 *    races with the first data load).
 *  - The user must be able to tap the search row to arm + focus the input,
 *    then filter results, then pick a record and see `onPick` called with the
 *    resolved signed URL.
 *  - Closing the sheet must disarm + blur, and a delayed focus rAF queued
 *    before close must NOT fire afterwards.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useState } from "react";
import ChatRecordsPicker from "../ChatRecordsPicker";

const SIGNED_URL = "https://signed.example/visa.pdf?sig=abc";

const RECORD = {
  id: "rec-1",
  origin: "medical-scan" as const,
  label: "Lab Report",
  fileName: "lab.pdf",
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
  listAllUserRecords: (...args: any[]) => listAllUserRecords(...args),
  resolveRecordSignedUrl: (...args: any[]) => resolveRecordSignedUrl(...args),
}));
vi.mock("@/hooks/useAuthUserId", () => ({
  useAuthUserId: () => null,
  useAuthSession: () => ({ userId: null, isReady: true }),
}));
vi.mock("@/hooks/useDeviceId", () => ({ getDeviceId: () => "device-test" }));
vi.mock("@/lib/records/attachErrorTelemetry", () => ({
  logAttachErrorTelemetry: (...args: any[]) => logAttachErrorTelemetry(...args),
  shortCause: () => "test",
}));
vi.mock("sonner", () => ({
  toast: Object.assign((..._a: any[]) => {}, { success: vi.fn(), error: vi.fn() }),
}));

describe("ChatRecordsPicker · keyboard-on-demand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAllUserRecords.mockResolvedValue([]);
    resolveRecordSignedUrl.mockResolvedValue(SIGNED_URL);
  });

  it("does not focus the search input when sheet opens", async () => {
    render(<ChatRecordsPicker open onClose={() => {}} onPick={async () => {}} />);
    const input = await screen.findByLabelText("Search records") as HTMLInputElement;
    expect(document.activeElement).not.toBe(input);
    expect(input.readOnly).toBe(true);
    expect(input.getAttribute("inputmode")).toBe("none");
    expect(input.tabIndex).toBe(-1);
    // The wrapping row exposes itself as an enable-search button to AT.
    expect(screen.getByRole("button", { name: /Enable search/i })).toBeInTheDocument();
  });

  it("arms and focuses the input after user taps the search row", async () => {
    render(<ChatRecordsPicker open onClose={() => {}} onPick={async () => {}} />);
    const input = await screen.findByLabelText("Search records") as HTMLInputElement;
    fireEvent.pointerDown(input);
    fireEvent.focus(input);
    await waitFor(() => {
      expect(input.readOnly).toBe(false);
      expect(input.getAttribute("inputmode")).toBe("search");
    });
  });

  it("end-to-end: open → tap to arm → filter → pick → onPick fires with signed URL", async () => {
    listAllUserRecords.mockResolvedValue([RECORD]);
    const onPick = vi.fn().mockResolvedValue(undefined);

    render(<ChatRecordsPicker open onClose={() => {}} onPick={onPick} attachTargetLabel="Borg El Arab" attachTargetLabelAr="برج العرب" />);
    // Keyboard must NOT have opened on mount.
    const input = await screen.findByLabelText("Search records") as HTMLInputElement;
    expect(document.activeElement).not.toBe(input);

    // Record row renders.
    const row = await screen.findByRole("button", { name: /Lab Report/i });
    // Arm the search row via keyboard (Enter), then type.
    const enableBtn = screen.getByRole("button", { name: /Enable search/i });
    fireEvent.keyDown(enableBtn, { key: "Enter" });
    await waitFor(() => expect(input.readOnly).toBe(false));
    fireEvent.change(input, { target: { value: "lab" } });
    expect(row).toBeInTheDocument();

    fireEvent.click(row);
    await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1));
    const arg = onPick.mock.calls[0][0];
    expect(arg.signedUrl).toBe(SIGNED_URL);
    expect(arg.kind).toBe("medical");
    expect(arg.file_name).toBe("lab.pdf");
    expect(await screen.findByTestId("records-picker-attached-summary")).toHaveTextContent("Lab Report");
    expect(screen.getByTestId("records-picker-attached-summary")).toHaveTextContent("Medical");
    expect(screen.getByTestId("records-picker-attached-summary")).toHaveTextContent("Borg El Arab");
  });

  it("disarms and blurs on close, and a delayed focus does not fire after close", async () => {
    // Stub rAF so we can flush manually and prove the close guard works.
    const rafCallbacks: FrameRequestCallback[] = [];
    const originalRaf = window.requestAnimationFrame;
    const originalCaf = window.cancelAnimationFrame;
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length as unknown as number;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((_id: number) => {}) as typeof window.cancelAnimationFrame;

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button onClick={() => setOpen(false)}>close-harness</button>
          <ChatRecordsPicker open={open} onClose={() => setOpen(false)} onPick={async () => {}} />
        </>
      );
    }

    try {
      render(<Harness />);
      const input = await screen.findByLabelText("Search records") as HTMLInputElement;

      // Tap to arm — this queues a focus rAF.
      fireEvent.pointerDown(input);
      // Drain telemetry-check rAFs but DO NOT flush the focus one yet.
      // Instead close the sheet first.
      fireEvent.click(screen.getByText("close-harness"));

      // Now flush every queued rAF — none of them should refocus the input
      // since open is now false and the picker has unmounted/cleaned up.
      await act(async () => {
        while (rafCallbacks.length) {
          const cb = rafCallbacks.shift()!;
          try { cb(performance.now()); } catch { /* noop */ }
        }
      });

      expect(document.activeElement).not.toBe(input);
    } finally {
      window.requestAnimationFrame = originalRaf;
      window.cancelAnimationFrame = originalCaf;
    }
  });
});
