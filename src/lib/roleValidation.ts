/**
 * Role validation helper used by the post-login handshake in `Index.tsx`.
 *
 * Extracted into its own module so the rejection path (Doctor selected, but
 * the database has no provider_admin/provider_staff/admin/moderator row) can
 * be covered by an end-to-end test without mounting the full app shell.
 *
 * The function returns a discriminated outcome instead of triggering side
 * effects directly. Callers are responsible for showing toasts, calling
 * `supabase.auth.signOut()`, clearing the stored role, and routing — this
 * keeps the helper deterministic and easy to test.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRolePref } from "@/screens/RoleSelectorScreen";

export type RoleValidationOutcome =
  /** No persisted role pick — bounce to role selector. */
  | { kind: "needs_role" }
  /** Guest path: stored = patient and there's no live session. */
  | { kind: "guest_patient" }
  /** Guest tried to enter as doctor — must sign in. */
  | { kind: "guest_doctor_blocked" }
  /** RLS / network error while fetching roles. */
  | { kind: "lookup_error"; message: string }
  /** Doctor pick but DB has no provider role — must sign out. */
  | { kind: "doctor_rejected" }
  /** Doctor pick verified — caller should redirect to /provider. */
  | { kind: "doctor_ok" }
  /** Patient path verified (or doctor row absent and patient was picked). */
  | { kind: "patient_ok" };

const PROVIDER_ROLES = new Set([
  "provider_admin",
  "provider_staff",
  "admin",
  "moderator",
]);

export async function validateLoginRole(
  supabase: Pick<SupabaseClient, "auth" | "from">,
  storedRole: AppRolePref | null,
): Promise<RoleValidationOutcome> {
  if (!storedRole) return { kind: "needs_role" };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return storedRole === "doctor"
      ? { kind: "guest_doctor_blocked" }
      : { kind: "guest_patient" };
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id);

  if (error) return { kind: "lookup_error", message: error.message };

  const roles = (data ?? []).map((r: { role: string }) => r.role);
  const hasProvider = roles.some((r) => PROVIDER_ROLES.has(r));

  if (storedRole === "doctor") {
    return hasProvider ? { kind: "doctor_ok" } : { kind: "doctor_rejected" };
  }
  return { kind: "patient_ok" };
}
