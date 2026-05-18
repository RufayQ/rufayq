import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import type { LoungeMembership } from "@/lib/loungeMemberships";

/* ─── Mocks ─── */
const generatedMembership: LoungeMembership = {
  id: "lng-gen-1",
  program: "Dragonpass",
  membershipNumber: "1111222233334444",
  cardholderName: "Salem Test",
  qrSecret: "ABCD",
  createdAt: "2026-05-01T00:00:00.000Z",
};

const uploadedMembership: LoungeMembership = {
  id: "lng-upl-1",
  program: "Priority Pass",
  membershipNumber: "9999888877776666",
  cardholderName: "Noura Test",
  qrImageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  createdAt: "2026-05-02T00:00:00.000Z",
};

const vacMembership: LoungeMembership = {
  id: "lng-vac-1",
  program: "Visa Airport Companion",
  membershipNumber: "4444555566667777",
  cardholderName: "Hala Test",
  qrSecret: "XYZ",
  createdAt: "2026-05-03T00:00:00.000Z",
};

let memberships: LoungeMembership[] = [];
vi.mock("@/lib/loungeMemberships", () => ({
  listLoungeMemberships: () => memberships,
  fetchLoungeMemberships: vi.fn(async () => memberships),
  subscribeLoungeMemberships: () => () => {},
  saveLoungeMembership: vi.fn(),
  deleteLoungeMembership: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("./QrImageEditor", () => ({ default: () => null }));

/* ─── Browser stubs ─── */
const FAKE_HD = "data:image/png;base64,FAKEHD";

beforeEach(() => {
  vi.restoreAllMocks();

  // Canvas
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: true,
  })) as unknown as HTMLCanvasElement["getContext"];
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => FAKE_HD);

  // URL.createObjectURL
  (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = vi.fn(() => "blob:fake");
  (URL as unknown as { revokeObjectURL: (s: string) => void }).revokeObjectURL = vi.fn();

  // Image — fire onload on next tick so loadImage resolves
  class StubImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    crossOrigin = "";
    private _src = "";
    width = 100;
    height = 100;
    set src(v: string) { this._src = v; queueMicrotask(() => this.onload?.()); }
    get src() { return this._src; }
  }
  (globalThis as unknown as { Image: typeof StubImage }).Image = StubImage;
});

/* ─── Helpers ─── */
const importComponent = async () => (await import("../LoungeAccessSection")).default;

const renderWith = async (items: LoungeMembership[]) => {
  memberships = items;
  const LoungeAccessSection = await importComponent();
  return render(<LoungeAccessSection segments={[]} />);
};

/* ─── Tests ─── */
describe("LoungeAccessSection", () => {
  it("expands and collapses a VAC lounge card", async () => {
    await renderWith([vacMembership]);
    const toggle = await screen.findByTestId(`lounge-card-expand-${vacMembership.id}`);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens fullscreen QR with high-density generated SVG", async () => {
    await renderWith([generatedMembership]);
    fireEvent.click(screen.getByRole("button", { name: /Dragonpass/i }));
    fireEvent.click(await screen.findByTestId("qr-open-fullscreen"));
    const fs = await screen.findByTestId("qr-fullscreen");
    const qr = within(fs).getByTestId("qr-generated") as unknown as SVGElement;
    expect(qr.tagName.toLowerCase()).toBe("svg");
    expect(Number(qr.getAttribute("width"))).toBeGreaterThanOrEqual(320);
  });

  it("opens fullscreen QR with uploaded image", async () => {
    await renderWith([uploadedMembership]);
    fireEvent.click(screen.getByRole("button", { name: /Priority Pass/i }));
    fireEvent.click(await screen.findByTestId("qr-open-fullscreen"));
    const fs = await screen.findByTestId("qr-fullscreen");
    const img = within(fs).getByTestId("qr-uploaded") as HTMLImageElement;
    expect(img.tagName.toLowerCase()).toBe("img");
    expect(img.getAttribute("src")).toBe(uploadedMembership.qrImageUrl);
  });

  it("downloads HD PNG for generated QR", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { toast } = await import("sonner");

    await renderWith([generatedMembership]);
    fireEvent.click(screen.getByRole("button", { name: /Dragonpass/i }));
    fireEvent.click(await screen.findByTestId("qr-open-fullscreen"));
    fireEvent.click(await screen.findByTestId("qr-fullscreen-download"));

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^rufayq-lounge-dragonpass-4444\.png$/);
    expect(anchor.getAttribute("href")).toBe(FAKE_HD);
    expect((toast.success as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it("downloads HD PNG for uploaded QR", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { toast } = await import("sonner");

    await renderWith([uploadedMembership]);
    fireEvent.click(screen.getByRole("button", { name: /Priority Pass/i }));
    fireEvent.click(await screen.findByTestId("qr-open-fullscreen"));
    fireEvent.click(await screen.findByTestId("qr-fullscreen-download"));

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^rufayq-lounge-priority-pass-6666\.png$/);
    expect(anchor.getAttribute("href")).toBe(FAKE_HD);
    expect((toast.success as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });
});
