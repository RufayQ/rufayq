/**
 * Reviews client — moderation surface.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppReviewSchema, type AppReview } from "@/api/contracts/reviews";
import type { ApiResult } from "@/api/clients/subscriptions.client";

const ok = <T>(data: T): ApiResult<T> => ({ data, error: null });
const fail = <T = never>(code: string, message: string): ApiResult<T> =>
  ({ data: null, error: { code, message } });

export const reviewsClient = {
  async list(): Promise<ApiResult<AppReview[]>> {
    const { data, error } = await supabase
      .from("app_reviews").select("*").order("created_at", { ascending: false });
    if (error) return fail("query_failed", error.message);
    const parsed = AppReviewSchema.array().safeParse(data ?? []);
    if (!parsed.success) return fail("contract_violation", parsed.error.message);
    return ok(parsed.data);
  },

  async setApproved(id: string, approved: boolean): Promise<ApiResult<true>> {
    const { error } = await supabase
      .from("app_reviews").update({ approved }).eq("id", id);
    if (error) return fail("update_failed", error.message);
    await supabase.rpc("log_audit_event", {
      _action: "review_moderated", _target_type: "review",
      _target_id: id, _details: { approved },
    });
    return ok(true);
  },

  async remove(id: string): Promise<ApiResult<true>> {
    const { error } = await supabase.from("app_reviews").delete().eq("id", id);
    if (error) return fail("delete_failed", error.message);
    return ok(true);
  },

  /** Public: approved reviews for the marketing site. */
  async listApproved(limit = 24): Promise<ApiResult<AppReview[]>> {
    const { data, error } = await supabase
      .from("app_reviews").select("*").eq("approved", true)
      .order("created_at", { ascending: false }).limit(limit);
    if (error) return fail("query_failed", error.message);
    const parsed = AppReviewSchema.array().safeParse(data ?? []);
    if (!parsed.success) return fail("contract_violation", parsed.error.message);
    return ok(parsed.data);
  },
};
