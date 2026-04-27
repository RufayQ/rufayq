/**
 * Support tickets client.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  SupportTicketSchema, TicketStatusSchema,
  type SupportTicket, type TicketStatus,
} from "@/api/contracts/tickets";
import type { ApiResult } from "@/api/clients/subscriptions.client";

const ok = <T>(data: T): ApiResult<T> => ({ data, error: null });
const fail = <T = never>(code: string, message: string): ApiResult<T> =>
  ({ data: null, error: { code, message } });

export const ticketsClient = {
  async list(): Promise<ApiResult<SupportTicket[]>> {
    const { data, error } = await supabase
      .from("support_tickets").select("*").order("created_at", { ascending: false });
    if (error) return fail("query_failed", error.message);
    const parsed = SupportTicketSchema.array().safeParse(data ?? []);
    if (!parsed.success) return fail("contract_violation", parsed.error.message);
    return ok(parsed.data);
  },

  async updateStatus(id: string, status: TicketStatus): Promise<ApiResult<true>> {
    const parsed = TicketStatusSchema.safeParse(status);
    if (!parsed.success) return fail("invalid_input", parsed.error.message);
    const { error } = await supabase
      .from("support_tickets").update({ status: parsed.data } as never).eq("id", id);
    if (error) return fail("update_failed", error.message);
    await supabase.rpc("log_audit_event", {
      _action: "ticket_updated", _target_type: "ticket",
      _target_id: id, _details: { status: parsed.data },
    });
    return ok(true);
  },

  async openCount(): Promise<ApiResult<number>> {
    const { count, error } = await supabase
      .from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open");
    if (error) return fail("query_failed", error.message);
    return ok(count ?? 0);
  },
};
