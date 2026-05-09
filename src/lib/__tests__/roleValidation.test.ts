/**
 * End-to-end style coverage for the post-sign-in role handshake.
 *
 * Focus scenario (per request): a user picks "Doctor" on the role selector,
 * signs in successfully, but the `user_roles` table has NO matching
 * provider_admin / provider_staff / admin / moderator row → the helper must
 * surface `doctor_rejected` so the shell can sign the user out and bounce
 * them back to the role picker.
 *
 * The remaining branches are also asserted to lock the contract.
 */
import { describe, it, expect, vi } from "vitest";
import { validateLoginRole } from "@/lib/roleValidation";

type Roles = Array<{ role: string }>;

function mockClient(opts: {
  session?: { user: { id: string } } | null;
  rolesData?: Roles | null;
  rolesError?: { message: string } | null;
}) {
  const eq = vi.fn().mockResolvedValue({
    data: opts.rolesData ?? null,
    error: opts.rolesError ?? null,
  });
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const getSession = vi.fn().mockResolvedValue({
    data: { session: opts.session ?? null },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from, auth: { getSession } } as any;
}

describe("validateLoginRole", () => {
  it("rejects a Doctor pick when the database has no provider role", async () => {
    const supa = mockClient({
      session: { user: { id: "user-1" } },
      rolesData: [{ role: "user" }], // patient-only roles
    });

    const outcome = await validateLoginRole(supa, "doctor");

    expect(outcome).toEqual({ kind: "doctor_rejected" });
    expect(supa.auth.getSession).toHaveBeenCalledOnce();
    expect(supa.from).toHaveBeenCalledWith("user_roles");
  });

  it("rejects a Doctor pick when user_roles is empty", async () => {
    const supa = mockClient({
      session: { user: { id: "user-2" } },
      rolesData: [],
    });
    expect(await validateLoginRole(supa, "doctor")).toEqual({ kind: "doctor_rejected" });
  });

  it("accepts a Doctor pick with provider_staff role", async () => {
    const supa = mockClient({
      session: { user: { id: "doc-1" } },
      rolesData: [{ role: "provider_staff" }],
    });
    expect(await validateLoginRole(supa, "doctor")).toEqual({ kind: "doctor_ok" });
  });

  it("accepts a Doctor pick with provider_admin role", async () => {
    const supa = mockClient({
      session: { user: { id: "doc-2" } },
      rolesData: [{ role: "provider_admin" }],
    });
    expect(await validateLoginRole(supa, "doctor")).toEqual({ kind: "doctor_ok" });
  });

  it("accepts a Patient pick regardless of provider rows", async () => {
    const supa = mockClient({
      session: { user: { id: "pat-1" } },
      rolesData: [{ role: "user" }],
    });
    expect(await validateLoginRole(supa, "patient")).toEqual({ kind: "patient_ok" });
  });

  it("returns needs_role when nothing is stored", async () => {
    const supa = mockClient({});
    expect(await validateLoginRole(supa, null)).toEqual({ kind: "needs_role" });
    expect(supa.auth.getSession).not.toHaveBeenCalled();
  });

  it("blocks a guest who picked Doctor but has no session", async () => {
    const supa = mockClient({ session: null });
    expect(await validateLoginRole(supa, "doctor")).toEqual({ kind: "guest_doctor_blocked" });
  });

  it("allows a guest patient with no session", async () => {
    const supa = mockClient({ session: null });
    expect(await validateLoginRole(supa, "patient")).toEqual({ kind: "guest_patient" });
  });

  it("surfaces a lookup_error when the user_roles query fails", async () => {
    const supa = mockClient({
      session: { user: { id: "x" } },
      rolesError: { message: "RLS denied" },
    });
    expect(await validateLoginRole(supa, "doctor")).toEqual({
      kind: "lookup_error",
      message: "RLS denied",
    });
  });
});
