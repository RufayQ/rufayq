import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { Toaster } from "@/components/ui/sonner";
import { notify, toast as sonnerToast } from "@/lib/bilingualToast";

describe("notify() bilingual toast", () => {
  beforeEach(() => render(<Toaster />));
  afterEach(() => cleanup());

  const flush = async () => {
    // sonner mounts toasts after a microtask + animation frame
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
  };

  it("renders English line in LTR with left alignment", async () => {
    notify({ en: "Saved to downloads", ar: "تم الحفظ", kind: "success" });
    await flush();
    const en = await screen.findByText("Saved to downloads");
    expect(en).toBeInTheDocument();
    expect(en.getAttribute("dir")).toBe("ltr");
    expect(en.className).toMatch(/text-left/);
  });

  it("renders Arabic line in RTL with right alignment and Arabic font", async () => {
    notify({ en: "Saved to downloads", ar: "تم الحفظ", kind: "success" });
    await flush();
    const ar = await screen.findByText("تم الحفظ");
    expect(ar.getAttribute("dir")).toBe("rtl");
    expect(ar.getAttribute("lang")).toBe("ar");
    expect(ar.className).toMatch(/font-arabic/);
    expect(ar.className).toMatch(/text-right/);
  });

  it("attaches the global rufayq-bilingual-toast class for the width/fill rule", async () => {
    notify({ en: "Hello", ar: "مرحباً" });
    await flush();
    const toast = document.querySelector("[data-sonner-toast]");
    expect(toast).not.toBeNull();
    expect(toast!.className).toMatch(/rufayq-bilingual-toast/);
  });

  it("renders both EN and AR within a single toast body container", async () => {
    notify({ en: "Removed", ar: "تم الحذف", kind: "success" });
    await flush();
    const en = await screen.findByText("Removed");
    const ar = await screen.findByText("تم الحذف");
    // Both rows must share the same parent flex container
    expect(en.parentElement).toBe(ar.parentElement);
    expect(en.parentElement?.className).toMatch(/flex-col/);
  });

  it("keeps Arabic RTL alignment stable after the enter animation completes", async () => {
    notify({ en: "Saved", ar: "تم الحفظ", kind: "success" });
    await flush();
    // Wait for sonner's enter animation to fully settle (data-mounted="true").
    await act(async () => { await new Promise((r) => setTimeout(r, 450)); });
    const toastEl = document.querySelector("[data-sonner-toast]") as HTMLElement | null;
    expect(toastEl).not.toBeNull();
    expect(toastEl!.getAttribute("data-mounted")).toBe("true");
    const ar = screen.getByText("تم الحفظ");
    // RTL contract — wrapping/alignment classes must survive the animation.
    expect(ar.getAttribute("dir")).toBe("rtl");
    expect(ar.getAttribute("lang")).toBe("ar");
    expect(ar.className).toMatch(/text-right/);
    expect(ar.className).toMatch(/font-arabic/);
  });

  it("keeps Arabic RTL alignment stable during the exit animation", async () => {
    const id = notify({ en: "Removed", ar: "تم الحذف", kind: "success" });
    await flush();
    await act(async () => { await new Promise((r) => setTimeout(r, 450)); });
    // Trigger the exit animation but inspect alignment BEFORE it fully unmounts.
    sonnerToast.dismiss(id as string | number);
    await act(async () => { await new Promise((r) => setTimeout(r, 80)); });
    const ar = document.querySelector('[lang="ar"]') as HTMLElement | null;
    // Element should still be in the DOM during sonner's exit animation.
    expect(ar).not.toBeNull();
    expect(ar!.getAttribute("dir")).toBe("rtl");
    expect(ar!.className).toMatch(/text-right/);
    expect(ar!.className).toMatch(/font-arabic/);
  });

  it("preserves the parent flex-col container across the full animation lifecycle", async () => {
    notify({ en: "Synced", ar: "تمت المزامنة" });
    await flush();
    await act(async () => { await new Promise((r) => setTimeout(r, 450)); });
    const en = screen.getByText("Synced");
    const ar = screen.getByText("تمت المزامنة");
    // Layout root must remain a vertical flex container so wrapping never
    // shifts mid-animation (no row/column reflow between enter and exit).
    expect(en.parentElement).toBe(ar.parentElement);
    expect(en.parentElement?.className).toMatch(/flex-col/);
    expect(en.parentElement?.className).toMatch(/w-full/);
  });
});
