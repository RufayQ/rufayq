/**
 * Regression: opening "Attach from My Records" must NOT auto-focus the search
 * input (which on mobile WebViews summons the soft keyboard and races with
 * the picker's first data load → crash + route unwind).
 *
 * Keyboard must only appear after the user explicitly taps the search row.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatRecordsPicker from "../ChatRecordsPicker";

vi.mock("@/lib/records/recordSources", () => ({
  listAllUserRecords: vi.fn().mockResolvedValue([]),
  resolveRecordSignedUrl: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/hooks/useAuthUserId", () => ({ useAuthUserId: () => null }));
vi.mock("@/hooks/useDeviceId", () => ({ getDeviceId: () => "device-test" }));
vi.mock("@/lib/records/attachErrorTelemetry", () => ({
  logAttachErrorTelemetry: vi.fn(),
  shortCause: () => "test",
}));

describe("ChatRecordsPicker · keyboard-on-demand", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("does not focus the search input when sheet opens", async () => {
    render(
      <ChatRecordsPicker open onClose={() => {}} onPick={async () => {}} />
    );
    const input = await screen.findByLabelText("Search records") as HTMLInputElement;
    // Input must NOT have focus on mount, must be read-only, and must
    // suppress the soft keyboard via inputMode="none".
    expect(document.activeElement).not.toBe(input);
    expect(input.readOnly).toBe(true);
    expect(input.getAttribute("inputmode")).toBe("none");
  });

  it("arms and focuses the input after user taps the search row", async () => {
    render(
      <ChatRecordsPicker open onClose={() => {}} onPick={async () => {}} />
    );
    const input = await screen.findByLabelText("Search records") as HTMLInputElement;
    fireEvent.pointerDown(input);
    fireEvent.focus(input);
    await waitFor(() => {
      expect(input.readOnly).toBe(false);
      expect(input.getAttribute("inputmode")).toBe("search");
    });
  });
});
