/**
 * RCM client — patient claim queue (read-only public surface).
 *
 * Provider-side write operations remain inside `features/rcm/` because they
 * involve heavy business rules (computed totals, signoffs, audit trails)
 * that should not be exposed verbatim to mobile consumers.
 */
import { supabase } from "@/integrations/supabase/client";
import { PatientClaimSchema, type PatientClaim } from "@/api/contracts/rcm";
import type { ApiResult } from "@/api/clients/subscriptions.client";

const ok = <T>(data: T): ApiResult<T> => ({ data, error: null });
const fail = <T = never>(code: string, message: string): ApiResult<T> =>
  ({ data: null, error: { code, message } });

export const rcmClient = {
  async listPendingClaims(limit = 200): Promise<ApiResult<PatientClaim[]>> {
    const { data, error } = await supabase
      .from("patient_claims")
      .select("id, organization_id, matched_device_id, search_type, status, notes, created_at, updated_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return fail("query_failed", error.message);
    const parsed = PatientClaimSchema.array().safeParse(data ?? []);
    if (!parsed.success) return fail("contract_violation", parsed.error.message);
    return ok(parsed.data);
  },

  async pendingCount(): Promise<ApiResult<number>> {
    const { count, error } = await supabase
      .from("patient_claims").select("id", { count: "exact", head: true }).eq("status", "pending");
    if (error) return fail("query_failed", error.message);
    return ok(count ?? 0);
  },
};
