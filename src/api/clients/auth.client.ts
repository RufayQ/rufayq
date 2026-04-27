/**
 * Auth client — typed session + role/permission lookups.
 *
 * UI never reaches into `supabase.auth` or `user_roles` directly; everything
 * goes through here so mobile gets the same contract.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  AppRoleSchema, CurrentAuthSchema,
  type AppRole, type CurrentAuth,
} from "@/api/contracts/auth";
import { can, canAny, type Action } from "@/features/auth/logic/permissions";
import type { ApiResult } from "@/api/clients/subscriptions.client";

const ok = <T>(data: T): ApiResult<T> => ({ data, error: null });
const fail = <T = never>(code: string, message: string): ApiResult<T> =>
  ({ data: null, error: { code, message } });

export const authClient = {
  /** Returns the current user + their roles, or `{ user: null, roles: [] }`. */
  async current(): Promise<ApiResult<CurrentAuth>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return ok({ user: null, roles: [] });

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    if (error) return fail("roles_query_failed", error.message);

    const rawRoles = (data ?? []).map((r: { role: string }) => r.role);
    const roles = rawRoles.filter((r): r is AppRole => AppRoleSchema.safeParse(r).success);

    const parsed = CurrentAuthSchema.safeParse({
      user: { id: session.user.id, email: session.user.email ?? null },
      roles,
    });
    if (!parsed.success) return fail("contract_violation", parsed.error.message);
    return ok(parsed.data);
  },

  /** Convenience: does the current user have any of these roles? */
  async hasAnyRole(roles: readonly AppRole[]): Promise<ApiResult<boolean>> {
    const res = await authClient.current();
    if (res.error || !res.data) return ok(false);
    return ok(res.data.roles.some((r) => roles.includes(r)));
  },

  /** Permission check (UI gating only; server enforces via RLS). */
  async canPerform(action: Action): Promise<ApiResult<boolean>> {
    const res = await authClient.current();
    if (res.error || !res.data) return ok(false);
    return ok(canAny(res.data.roles, action));
  },

  /** Sync helpers for components that already have roles in state. */
  can,
  canAny,

  async signOut(): Promise<ApiResult<true>> {
    const { error } = await supabase.auth.signOut();
    if (error) return fail("signout_failed", error.message);
    return ok(true);
  },
};
