import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { Toaster } from "@/components/ui/sonner";
import { notify } from "@/lib/bilingualToast";

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
});
