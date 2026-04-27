/**
 * Subscriptions client — the only place in the codebase that talks to
 * `user_subscriptions` / `payment_receipts` for read flows.
 *
 * Returns `{ data, error }` envelopes (never throws) so web and native
 * callers handle errors identically.
 */
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import {
  SubscriptionSummarySchema,
  type SubscriptionSummary,
} from "@/api/contracts/subscriptions";

export interface ApiResult<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}

const ok = <T>(data: T): ApiResult<T> => ({ data, error: null });
const fail = (code: string, message: string): ApiResult<never> =>
  ({ data: null, error: { code, message } });

export const subscriptionsClient = {
  /** Latest subscription for the current device. */
  async getCurrent(deviceId: string = getDeviceId()): Promise<ApiResult<SubscriptionSummary | null>> {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("id, plan, status, billing_cycle, current_period_end, amount, currency")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return fail("query_failed", error.message);
    if (!data) return ok(null);

    const parsed = SubscriptionSummarySchema.safeParse(data);
    if (!parsed.success) return fail("contract_violation", parsed.error.message);
    return ok(parsed.data);
  },

  /** Whether a receipt is awaiting admin verification for this device. */
  async hasPendingReceipt(deviceId: string = getDeviceId()): Promise<ApiResult<boolean>> {
    const { count, error } = await supabase
      .from("payment_receipts")
      .select("id", { count: "exact", head: true })
      .eq("device_id", deviceId)
      .eq("status", "pending");

    if (error) return fail("query_failed", error.message);
    return ok((count ?? 0) > 0);
  },
};
