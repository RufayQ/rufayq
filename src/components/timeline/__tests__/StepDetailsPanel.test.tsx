/**
 * StepDetailsPanel — scope, soft-delete, optimistic note tests.
 *
 * Mirrors the RelatedDocumentsCard scope tests:
 *   • guest  → SELECT filtered by device_id only; INSERT writes user_id: null;
 *              upload path starts with `<deviceId>/`.
 *   • signed → SELECT uses `or(user_id.eq.<uid>,device_id.eq.<deviceId>)`;
 *              INSERT writes user_id; upload path starts with `user/<uid>/`.
 *   • soft-delete  → both attachment and note removal call .update({ deleted_at })
 *                    and never call .delete() or storage .remove().
 *   • optimistic note → newly added note appears before refresh resolves.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor, act, screen } from "@testing-library/react";
import React from "react";

const selectSpy = vi.fn();
const eqSpy = vi.fn();
const orSpy = vi.fn();
const isSpy = vi.fn();
const orderSpy = vi.fn();
const insertSpy = vi.fn();
const updateSpy = vi.fn();
const deleteSpy = vi.fn();
const uploadSpy = vi.fn();
const storageRemoveSpy = vi.fn();

// Per-table queued results so we can return one attachment / one note on refresh.
let attachmentRows: any[] = [];
let noteRows: any[] = [];

const makeQuery = (table: string) => {
  const q: any = {
    select: (...a: any[]) => { selectSpy(table, ...a); return q; },
    eq: (...a: any[]) => { eqSpy(table, ...a); return q; },
    or: (...a: any[]) => { orSpy(table, ...a); return q; },
    is: (...a: any[]) => { isSpy(table, ...a); return q; },
    order: (...a: any[]) => {
      orderSpy(table, ...a);
      const data = table === "step_attachments" ? attachmentRows : noteRows;
      return Promise.resolve({ data, error: null });
    },
    insert: (payload: any) => {
      insertSpy(table, payload);
      const inserted = {
        id: `srv-${Math.random()}`,
        created_at: new Date().toISOString(),
        deleted_at: null,
        ...payload,
      };
      const thenable: any = Promise.resolve({ data: inserted, error: null });
      // Support `.select().single()` chain used for notes.
      thenable.select = () => ({
        single: () => Promise.resolve({ data: inserted, error: null }),
      });
      return thenable;
    },
    update: (patch: any) => {
      updateSpy(table, patch);
      return {
        eq: () => Promise.resolve({ data: null, error: null }),
      };
    },
    delete: (...a: any[]) => {
      deleteSpy(table, ...a);
      return { eq: () => Promise.resolve({ data: null, error: null }) };
    },
  };
  return q;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => makeQuery(table),
    storage: {
      from: (_bucket: string) => ({
        upload: (path: string, file: File, opts: any) => {
          uploadSpy(path, file, opts);
          return Promise.resolve({ data: { path }, error: null });
        },
        createSignedUrl: () =>
          Promise.resolve({ data: { signedUrl: "https://x" }, error: null }),
        remove: (paths: string[]) => {
          storageRemoveSpy(paths);
          return Promise.resolve({ data: null, error: null });
        },
      }),
    },
  },
}));

vi.mock("@/hooks/useDeviceId", () => ({
  getDeviceId: () => "test-device-xyz",
}));

import StepDetailsPanel from "@/components/timeline/StepDetailsPanel";

beforeEach(() => {
  selectSpy.mockClear();
  eqSpy.mockClear();
  orSpy.mockClear();
  isSpy.mockClear();
  orderSpy.mockClear();
  insertSpy.mockClear();
  updateSpy.mockClear();
  deleteSpy.mockClear();
  uploadSpy.mockClear();
  storageRemoveSpy.mockClear();
  attachmentRows = [];
  noteRows = [];
});

const pickFile = async (container: HTMLElement, name = "scan.pdf", type = "application/pdf") => {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  const file = new File(["data"], name, { type });
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
};

describe("StepDetailsPanel — guest scope (userId null)", () => {
  it("queries by device_id only and uploads under <deviceId>/<safeStepRef>/...", async () => {
    const { container } = render(
      <StepDetailsPanel
        stepRef="journey:trip-1:flight:outbound"
        timelineKind="journey"
        userId={null}
      />,
    );
    await waitFor(() => expect(orderSpy).toHaveBeenCalled());

    // No OR filter for guest reads
    expect(orSpy).not.toHaveBeenCalled();
    // device_id filter applied on both tables
    const eqArgs = eqSpy.mock.calls.map((c) => c.slice(1));
    expect(
      eqArgs.some(([col, val]) => col === "device_id" && val === "test-device-xyz"),
    ).toBe(true);

    await pickFile(container);
    await waitFor(() => expect(insertSpy).toHaveBeenCalled());

    const [path] = uploadSpy.mock.calls[0];
    expect(path).toMatch(/^test-device-xyz\/journey%3Atrip-1%3Aflight%3Aoutbound\//);

    const insertCall = insertSpy.mock.calls.find((c) => c[0] === "step_attachments")!;
    const payload = insertCall[1];
    expect(payload.user_id).toBeNull();
    expect(payload.device_id).toBe("test-device-xyz");
    expect(payload.timeline_kind).toBe("journey");
    expect(payload.step_ref).toBe("journey:trip-1:flight:outbound");
  });

  it("undefined userId also falls back to device scope", async () => {
    render(
      <StepDetailsPanel stepRef="journey:t:appointment:a" timelineKind="journey" />,
    );
    await waitFor(() => expect(orderSpy).toHaveBeenCalled());
    expect(orSpy).not.toHaveBeenCalled();
  });
});

describe("StepDetailsPanel — signed-in scope", () => {
  it("uses OR filter and writes user_id; upload path is user/<uid>/...", async () => {
    const { container } = render(
      <StepDetailsPanel
        stepRef="carehub:exercise:ankle-pumps"
        timelineKind="carehub"
        userId="uid-1"
      />,
    );
    await waitFor(() => expect(orderSpy).toHaveBeenCalled());

    // Two tables fetched, each with an OR filter
    const orTables = orSpy.mock.calls.map((c) => c[0]);
    expect(orTables).toContain("step_attachments");
    expect(orTables).toContain("step_notes");
    expect(orSpy.mock.calls[0][1]).toBe(
      "user_id.eq.uid-1,device_id.eq.test-device-xyz",
    );

    await pickFile(container, "rehab.jpg", "image/jpeg");
    await waitFor(() => expect(insertSpy).toHaveBeenCalled());

    const [, path] = uploadSpy.mock.calls[0];
    expect(path).toMatch(/^user\/uid-1\/carehub%3Aexercise%3Aankle-pumps\//);

    const payload = insertSpy.mock.calls.find((c) => c[0] === "step_attachments")![1];
    expect(payload.user_id).toBe("uid-1");
    expect(payload.device_id).toBe("test-device-xyz");
    expect(payload.timeline_kind).toBe("carehub");
  });
});

describe("StepDetailsPanel — soft-delete only", () => {
  it("attachment remove calls update({ deleted_at }), never delete() or storage.remove()", async () => {
    attachmentRows = [
      {
        id: "att-1",
        user_id: null,
        device_id: "test-device-xyz",
        step_ref: "journey:t:flight:outbound",
        timeline_kind: "journey",
        file_path: "test-device-xyz/x/y.pdf",
        file_name: "y.pdf",
        mime_type: "application/pdf",
        size_bytes: 10,
        deleted_at: null,
        created_at: new Date().toISOString(),
      },
    ];
    const { container } = render(
      <StepDetailsPanel
        stepRef="journey:t:flight:outbound"
        timelineKind="journey"
        userId={null}
      />,
    );
    await waitFor(() => expect(screen.getByText("y.pdf")).toBeTruthy());

    const removeBtn = container.querySelector('button[aria-label="Remove"]') as HTMLButtonElement;
    expect(removeBtn).toBeTruthy();
    await act(async () => {
      fireEvent.click(removeBtn);
    });

    expect(updateSpy).toHaveBeenCalled();
    const updateCall = updateSpy.mock.calls.find((c) => c[0] === "step_attachments")!;
    expect(updateCall[1].deleted_at).toBeTruthy();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(storageRemoveSpy).not.toHaveBeenCalled();
  });

  it("note remove calls update({ deleted_at }) on step_notes", async () => {
    noteRows = [
      {
        id: "note-1",
        user_id: null,
        device_id: "test-device-xyz",
        step_ref: "journey:t:flight:outbound",
        timeline_kind: "journey",
        body: "Bring passport",
        deleted_at: null,
        created_at: new Date().toISOString(),
      },
    ];
    const { container } = render(
      <StepDetailsPanel
        stepRef="journey:t:flight:outbound"
        timelineKind="journey"
        userId={null}
      />,
    );
    await waitFor(() => expect(screen.getByText("Bring passport")).toBeTruthy());

    const removeBtn = container.querySelector('button[aria-label="Remove note"]') as HTMLButtonElement;
    expect(removeBtn).toBeTruthy();
    await act(async () => {
      fireEvent.click(removeBtn);
    });

    const updateCall = updateSpy.mock.calls.find((c) => c[0] === "step_notes")!;
    expect(updateCall).toBeTruthy();
    expect(updateCall[1].deleted_at).toBeTruthy();
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});

describe("StepDetailsPanel — notes UX", () => {
  it("optimistically renders a newly added note", async () => {
    const { container } = render(
      <StepDetailsPanel
        stepRef="journey:t:appointment:a"
        timelineKind="journey"
        userId="uid-2"
      />,
    );
    await waitFor(() => expect(orderSpy).toHaveBeenCalled());

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Pre-op fasting reminder" } });
    });
    const sendBtn = container.querySelector('button[aria-label="Save note"]') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(screen.getByText("Pre-op fasting reminder")).toBeTruthy();
    const insertCall = insertSpy.mock.calls.find((c) => c[0] === "step_notes")!;
    expect(insertCall[1].user_id).toBe("uid-2");
    expect(insertCall[1].body).toBe("Pre-op fasting reminder");
  });
});
