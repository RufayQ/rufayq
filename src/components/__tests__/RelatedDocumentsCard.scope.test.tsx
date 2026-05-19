/**
 * RelatedDocumentsCard — attachment scope tests
 *
 * Verifies that Step 5 attachments are stored and queried with the correct
 * ownership scope based on the `userId` prop forwarded from ScannerWizard:
 *
 *   • userId == null  →  guest/device scope
 *       - SELECT filters by device_id only
 *       - Upload path uses `<deviceId>/<segmentRef>/<uuid>.<ext>`
 *       - INSERT writes user_id: null
 *
 *   • userId set      →  signed-in user scope
 *       - SELECT uses `or(user_id.eq.<uid>,device_id.eq.<deviceId>)`
 *       - Upload path uses `user/<uid>/<ticketId||segmentRef>/<uuid>.<ext>`
 *       - INSERT writes user_id: <uid>
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";

// ---- Capture spies ------------------------------------------------------

const selectSpy = vi.fn();
const eqSpy = vi.fn();
const orSpy = vi.fn();
const isSpy = vi.fn();
const orderSpy = vi.fn();
const insertSpy = vi.fn();
const updateSpy = vi.fn();
const uploadSpy = vi.fn();

// Build a chainable query object whose terminal `.order` resolves to {data:[]}.
const makeQuery = () => {
  const q: any = {
    select: (...a: any[]) => { selectSpy(...a); return q; },
    eq: (...a: any[]) => { eqSpy(...a); return q; },
    or: (...a: any[]) => { orSpy(...a); return q; },
    is: (...a: any[]) => { isSpy(...a); return q; },
    order: (...a: any[]) => {
      orderSpy(...a);
      return Promise.resolve({ data: [], error: null });
    },
    insert: (payload: any) => {
      insertSpy(payload);
      return Promise.resolve({ data: null, error: null });
    },
    update: (patch: any) => {
      updateSpy(patch);
      return {
        eq: () => Promise.resolve({ data: null, error: null }),
      };
    },
  };
  return q;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: (_table: string) => makeQuery(),
    storage: {
      from: (_bucket: string) => ({
        upload: (path: string, file: File, opts: any) => {
          uploadSpy(path, file, opts);
          return Promise.resolve({ data: { path }, error: null });
        },
        createSignedUrl: () =>
          Promise.resolve({ data: { signedUrl: "https://x" }, error: null }),
      }),
    },
  },
}));

vi.mock("@/hooks/useDeviceId", () => ({
  getDeviceId: () => "test-device-xyz",
}));

import RelatedDocumentsCard from "@/components/RelatedDocumentsCard";

beforeEach(() => {
  selectSpy.mockClear();
  eqSpy.mockClear();
  orSpy.mockClear();
  isSpy.mockClear();
  orderSpy.mockClear();
  insertSpy.mockClear();
  updateSpy.mockClear();
  uploadSpy.mockClear();
});

const pickAndConfirm = async (container: HTMLElement) => {
  // The hidden input is the only <input type="file"> in the card.
  const fileInput = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  expect(fileInput).toBeTruthy();

  const file = new File(["hello"], "visa.pdf", { type: "application/pdf" });
  await act(async () => {
    fireEvent.change(fileInput, { target: { files: [file] } });
  });

  // Multiple buttons contain "Attach" (the dashed trigger tile + the confirm
  // button on the label sheet). The confirm sheet renders last in DOM order.
  const buttons = Array.from(document.querySelectorAll("button")).filter((b) =>
    /Attach/.test(b.textContent || ""),
  );
  const attach = buttons[buttons.length - 1];
  expect(attach).toBeTruthy();
  await act(async () => {
    fireEvent.click(attach!);
  });
};

describe("RelatedDocumentsCard — guest scope (userId == null)", () => {
  it("queries by device_id only and uploads under <deviceId>/<segmentRef>/...", async () => {
    const { container } = render(
      <RelatedDocumentsCard segmentRef="seg-guest-1" userId={null} compact />,
    );

    // Wait for the initial refresh() to complete.
    await waitFor(() => expect(orderSpy).toHaveBeenCalled());

    // No `.or(...)` ownership clause — guest path uses `.eq("device_id", ...)`.
    expect(orSpy).not.toHaveBeenCalled();
    expect(eqSpy).toHaveBeenCalledWith("device_id", "test-device-xyz");
    expect(eqSpy).toHaveBeenCalledWith("segment_ref", "seg-guest-1");
    expect(isSpy).toHaveBeenCalledWith("deleted_at", null);

    await pickAndConfirm(container);

    // Storage upload path = `<deviceId>/<segmentRef>/<uuid>.<ext>`
    await waitFor(() => expect(uploadSpy).toHaveBeenCalled());
    const uploadedPath = uploadSpy.mock.calls[0][0] as string;
    expect(uploadedPath.startsWith("test-device-xyz/seg-guest-1/")).toBe(true);
    expect(uploadedPath.startsWith("user/")).toBe(false);

    // Insert payload writes user_id: null (and device_id set).
    await waitFor(() => expect(insertSpy).toHaveBeenCalled());
    const payload = insertSpy.mock.calls[0][0];
    expect(payload.user_id).toBeNull();
    expect(payload.device_id).toBe("test-device-xyz");
    expect(payload.segment_ref).toBe("seg-guest-1");
  });

  it("falls back to device scope when userId is undefined", async () => {
    const { container } = render(
      <RelatedDocumentsCard segmentRef="seg-guest-2" userId={undefined} compact />,
    );

    await waitFor(() => expect(orderSpy).toHaveBeenCalled());

    expect(orSpy).not.toHaveBeenCalled();
    expect(eqSpy).toHaveBeenCalledWith("device_id", "test-device-xyz");
    expect(eqSpy).toHaveBeenCalledWith("segment_ref", "seg-guest-2");
    expect(isSpy).toHaveBeenCalledWith("deleted_at", null);

    await pickAndConfirm(container);

    await waitFor(() => expect(uploadSpy).toHaveBeenCalled());
    const uploadedPath = uploadSpy.mock.calls[0][0] as string;
    expect(uploadedPath.startsWith("test-device-xyz/seg-guest-2/")).toBe(true);
    expect(uploadedPath.startsWith("user/")).toBe(false);

    await waitFor(() => expect(insertSpy).toHaveBeenCalled());
    const payload = insertSpy.mock.calls[0][0];
    expect(payload.user_id).toBeNull();
    expect(payload.device_id).toBe("test-device-xyz");
    expect(payload.segment_ref).toBe("seg-guest-2");
  });
});

describe("RelatedDocumentsCard — signed-in scope (userId set)", () => {
  it("queries by user_id OR device_id and uploads under user/<uid>/...", async () => {
    const uid = "8ef2e1b9-6c8d-48d1-a6aa-8f5d618f9fb5";
    const { container } = render(
      <RelatedDocumentsCard
        segmentRef="seg-auth-1"
        ticketId="ticket-42"
        userId={uid}
        compact
      />,
    );

    await waitFor(() => expect(orderSpy).toHaveBeenCalled());

    // Ownership clause: user_id OR device_id
    expect(orSpy).toHaveBeenCalledWith(
      `user_id.eq.${uid},device_id.eq.test-device-xyz`,
    );
    // Reference clause: segment_ref OR ticket_id (ticketId provided)
    expect(orSpy).toHaveBeenCalledWith(
      `segment_ref.eq.seg-auth-1,ticket_id.eq.ticket-42`,
    );
    expect(isSpy).toHaveBeenCalledWith("deleted_at", null);

    await pickAndConfirm(container);

    // Storage upload path = `user/<uid>/<ticketId>/<uuid>.<ext>`
    await waitFor(() => expect(uploadSpy).toHaveBeenCalled());
    const uploadedPath = uploadSpy.mock.calls[0][0] as string;
    expect(uploadedPath.startsWith(`user/${uid}/ticket-42/`)).toBe(true);

    // Insert payload writes user_id: <uid> + ticket_id.
    await waitFor(() => expect(insertSpy).toHaveBeenCalled());
    const payload = insertSpy.mock.calls[0][0];
    expect(payload.user_id).toBe(uid);
    expect(payload.ticket_id).toBe("ticket-42");
    expect(payload.device_id).toBe("test-device-xyz");
    expect(payload.segment_ref).toBe("seg-auth-1");
  });
});

describe("RelatedDocumentsCard — per-ticket isolation (three tickets)", () => {
  it("issues separate ticket-scoped queries; no ticketId bleeds across cards", async () => {
    const uid = "8ef2e1b9-6c8d-48d1-a6aa-8f5d618f9fb5";
    const tickets = [
      { segmentRef: "seg-flight-A", ticketId: "ticket-A" },
      { segmentRef: "seg-flight-B", ticketId: "ticket-B" },
      { segmentRef: "seg-flight-C", ticketId: "ticket-C" },
    ];

    render(
      <>
        {tickets.map((t) => (
          <RelatedDocumentsCard
            key={t.ticketId}
            segmentRef={t.segmentRef}
            ticketId={t.ticketId}
            userId={uid}
            compact
          />
        ))}
      </>,
    );

    await waitFor(() => expect(orderSpy.mock.calls.length).toBeGreaterThanOrEqual(3));

    // Each ticket must contribute its own segment_ref/ticket_id OR clause —
    // and no card may include another ticket's id in its filter expression.
    for (const t of tickets) {
      expect(orSpy).toHaveBeenCalledWith(
        `segment_ref.eq.${t.segmentRef},ticket_id.eq.${t.ticketId}`,
      );
    }

    const refClauses = orSpy.mock.calls
      .map((c) => String(c[0]))
      .filter((s) => s.includes("ticket_id.eq."));
    expect(refClauses).toHaveLength(3);

    for (const clause of refClauses) {
      const otherTickets = tickets.filter((t) => !clause.includes(`ticket_id.eq.${t.ticketId}`));
      // Exactly one ticket id should match this clause; the other two must not appear.
      expect(otherTickets).toHaveLength(2);
      for (const other of otherTickets) {
        expect(clause.includes(`ticket_id.eq.${other.ticketId}`)).toBe(false);
        expect(clause.includes(`segment_ref.eq.${other.segmentRef}`)).toBe(false);
      }
    }
  });
});
