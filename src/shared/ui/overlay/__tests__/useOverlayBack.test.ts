import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOverlayBack, consumeOverlayInternalPop } from "../useOverlayBack";

describe("useOverlayBack — internal pop isolation", () => {
  beforeEach(() => {
    // Drain any leftover flag from a prior test.
    consumeOverlayInternalPop();
  });

  it("consumeOverlayInternalPop returns false when no overlay pop is pending", () => {
    expect(consumeOverlayInternalPop()).toBe(false);
  });

  it("sets the internal-pop flag when cleanup pops the sentinel", () => {
    const onClose = () => {};
    const { unmount } = renderHook(() => useOverlayBack(true, onClose));

    // Sanity: the sentinel must be on top of history before cleanup runs.
    expect((window.history.state as any)?.__overlay).toBe(true);

    unmount();

    // Cleanup must have flagged the next popstate as overlay-internal so the
    // global back guard knows to ignore it instead of bouncing the user out
    // of the current tab.
    expect(consumeOverlayInternalPop()).toBe(true);
    // Flag is single-shot.
    expect(consumeOverlayInternalPop()).toBe(false);
  });

  it("does not flag when no sentinel is present (no-op cleanup)", () => {
    // Replace state so __overlay marker is gone.
    window.history.replaceState({}, "");
    const { unmount } = renderHook(() => useOverlayBack(false, () => {}));
    unmount();
    expect(consumeOverlayInternalPop()).toBe(false);
  });
});
