/**
 * E2E — ScannerWizard Step 2 crop tool.
 *
 * Drives the image editor's drag-handle crop:
 *   1. Renders Step2Review with a fake visa image.
 *   2. Toggles crop mode (seeds an 8% inset and reveals the dashed overlay).
 *   3. Dispatches pointer events to drag the bottom-right handle inward.
 *   4. Confirms "Use This" → rasterizeAndConfirm() runs canvas.drawImage with
 *      source coords matching the crop edges and emits a new File via
 *      onTransform whose preview reflects the cropped region.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("sonner", () => ({
  toast: Object.assign((..._a: any[]) => {}, { success: vi.fn(), error: vi.fn() }),
}));

import { Step2Review } from "@/screens/ScannerWizard";

// ---- jsdom shims ----------------------------------------------------------

beforeEach(() => {
  // URL.createObjectURL — return a synthetic blob URL.
  (URL as any).createObjectURL = vi.fn(() => "blob:fake-visa");
  (URL as any).revokeObjectURL = vi.fn();

  // Element.setPointerCapture is not in jsdom.
  (Element.prototype as any).setPointerCapture = function () {};
  (Element.prototype as any).releasePointerCapture = function () {};

  // Stable viewport for the wrapper so percentage-based drags map predictably.
  (Element.prototype as any).getBoundingClientRect = function () {
    return { left: 0, top: 0, right: 400, bottom: 600, width: 400, height: 600, x: 0, y: 0, toJSON: () => ({}) };
  };

  // Force <img> onload to fire synchronously with known natural dimensions.
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: true,
    set(value: string) {
      (this as any)._src = value;
      Object.defineProperty(this, "naturalWidth", { configurable: true, value: 1000 });
      Object.defineProperty(this, "naturalHeight", { configurable: true, value: 1500 });
      setTimeout(() => (this as any).onload?.(), 0);
    },
    get() {
      return (this as any)._src;
    },
  });
});

describe("ScannerWizard · Step2Review crop", () => {
  it("crops via drag handles and emits a rasterized file matching the crop window", async () => {
    // Canvas spies — record drawImage args and feed toBlob a fake blob.
    const drawImageSpy = vi.fn();
    const ctxStub = {
      fillStyle: "",
      filter: "",
      fillRect: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage: drawImageSpy,
    } as any;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctxStub) as any;
    HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
      cb(new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }));
    } as any;

    const fakeImage = new File([new Uint8Array([0])], "visa.jpg", { type: "image/jpeg" });
    const onTransform = vi.fn();
    const onConfirm = vi.fn();

    render(
      <Step2Review
        file={{ name: "visa.jpg", type: "image/jpeg", size: "12 KB" }}
        realFile={fakeImage}
        onRetake={() => {}}
        onConfirm={onConfirm}
        onTransform={onTransform}
      />,
    );

    // 1) Enter crop mode → seeds a visible 8% inset, handles render.
    const cropBtn = screen.getByTitle("Crop");
    fireEvent.click(cropBtn);
    expect(cropBtn).toHaveAttribute("aria-pressed", "true");

    const brHandle = await screen.findByLabelText("Crop handle br");
    expect(brHandle).toBeInTheDocument();

    // 2) Drag bottom-right handle from (~92%, ~92%) inward to (50%, 50%).
    //    Wrapper rect is 400×600 → 50% = (200, 300).
    fireEvent.pointerDown(brHandle, { clientX: 368, clientY: 552, pointerId: 1 });
    await act(async () => {
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 200, clientY: 300, pointerId: 1 } as any),
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", { pointerId: 1 } as any),
      );
    });

    // 3) Confirm → rasterizeAndConfirm draws the cropped region.
    fireEvent.click(screen.getByRole("button", { name: /Use This/i }));

    await waitFor(() => expect(drawImageSpy).toHaveBeenCalled());

    // drawImage signature: (img, sx, sy, sw, sh, dx, dy, dw, dh).
    const [, sx, sy, sw, sh] = drawImageSpy.mock.calls[0];
    // Top-left stays at 8% inset → 80px × 120px on a 1000×1500 source.
    expect(sx).toBeCloseTo(1000 * 0.08, 5);
    expect(sy).toBeCloseTo(1500 * 0.08, 5);
    // After dragging br to ~50%, right/bottom insets become ~50% → sw/sh = 42% of source.
    expect(sw).toBeGreaterThan(1000 * 0.3);
    expect(sw).toBeLessThan(1000 * 0.5);
    expect(sh).toBeGreaterThan(1500 * 0.3);
    expect(sh).toBeLessThan(1500 * 0.5);

    // 4) onTransform fires with the rasterized cropped File, and the flow advances.
    await waitFor(() => expect(onTransform).toHaveBeenCalledTimes(1));
    const emitted = onTransform.mock.calls[0][0] as File;
    expect(emitted).toBeInstanceOf(File);
    expect(emitted.type).toBe("image/jpeg");
    expect(emitted.name).toMatch(/edited\.jpg$/);

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });
});
