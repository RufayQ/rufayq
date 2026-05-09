/**
 * Provider portal client — typed Supabase facade for the doctor app.
 *
 * Every provider screen should go through this client (never call
 * `supabase.from(...)` directly). Returns `ApiResult<T>` envelopes —
 * mirrors `subscriptionsClient` and `authClient`.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  OrgSchema, ProviderPatientSchema, ConsentRequestSchema, EmrFetchResponseSchema,
  type Organization, type ProviderPatient, type ConsentRequest,
  type EmrFetchResponse, type ConsentSection,
} from "@/api/contracts/provider";
import {
  validatePatientLink, validateInstruction, validateMedUpdate, validateAppointment,
  validateClaimLine, validateClaimSubmit, validatePayment, validateDenial, validateAppeal,
  validatePatientSearch, validateDischargeAdvance,
  hasBlockingErrors, type ProviderIssue,
} from "@/lib/providerValidation";

export interface ApiResult<T> {
  data: T | null;
  error: { code: string; message: string; issues?: ProviderIssue[] } | null;
}
const ok = <T>(data: T): ApiResult<T> => ({ data, error: null });
const fail = <T = never>(code: string, message: string, issues?: ProviderIssue[]): ApiResult<T> =>
  ({ data: null, error: { code, message, issues } });

const guard = <T>(input: any, validator: (x: any) => ProviderIssue[]): ApiResult<T> | null => {
  const issues = validator(input);
  if (hasBlockingErrors(issues))
    return fail("validation_failed", issues.map((i) => i.message).join("; "), issues);
  return null;
};

export const providerClient = {
  // ─── Orgs ──────────────────────────────────────────────────────────────
  async listMyOrgs(): Promise<ApiResult<Organization[]>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return ok([]);
    const { data, error } = await supabase
      .from("provider_members")
      .select("organization_id, organizations(id, name, org_type)")
      .eq("user_id", session.user.id)
      .eq("is_active", true);
    if (error) return fail("query_failed", error.message);
    const orgs = (data ?? [])
      .map((m: any) => m.organizations)
      .filter(Boolean)
      .map((o: any) => OrgSchema.safeParse(o))
      .filter((p) => p.success)
      .map((p: any) => p.data);
    return ok(orgs);
  },

  // ─── Patients ──────────────────────────────────────────────────────────
  async listPatients(orgId: string, opts: { limit?: number; cursor?: string } = {}):
    Promise<ApiResult<ProviderPatient[]>> {
    let q = supabase.from("provider_patients").select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 50);
    if (opts.cursor) q = q.lt("created_at", opts.cursor);
    const { data, error } = await q;
    if (error) return fail("query_failed", error.message);
    const out: ProviderPatient[] = [];
    for (const r of data ?? []) {
      const p = ProviderPatientSchema.safeParse(r);
      if (p.success) out.push(p.data);
    }
    return ok(out);
  },

  async linkPatient(orgId: string, body: {
    patient_device_id: string; patient_name?: string; patient_email?: string;
    patient_phone?: string; notes?: string;
  }): Promise<ApiResult<ProviderPatient>> {
    const v = guard<ProviderPatient>(body, validatePatientLink);
    if (v) return v;
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.from("provider_patients").insert({
      organization_id: orgId,
      patient_device_id: body.patient_device_id.trim(),
      patient_name: body.patient_name || null,
      patient_email: body.patient_email || null,
      patient_phone: body.patient_phone || null,
      notes: body.notes || null,
      created_by: session?.user?.id,
    }).select().single();
    if (error) return fail("insert_failed", error.message);
    const p = ProviderPatientSchema.safeParse(data);
    if (!p.success) return fail("contract_violation", p.error.message);
    return ok(p.data);
  },

  // ─── Clinical writes ───────────────────────────────────────────────────
  async sendInstruction(orgId: string, deviceId: string, body: {
    title: string; body: string; body_ar?: string; priority?: string;
  }): Promise<ApiResult<true>> {
    const v = guard<true>(body, validateInstruction);
    if (v) return v;
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("provider_instructions").insert({
      organization_id: orgId, patient_device_id: deviceId, author_id: session?.user?.id, ...body,
    });
    if (error) return fail("insert_failed", error.message);
    return ok(true);
  },

  async sendMedUpdate(orgId: string, deviceId: string, body: {
    action: string; med_name: string; dose?: string; frequency?: string; notes?: string;
  }): Promise<ApiResult<true>> {
    const v = guard<true>(body, validateMedUpdate);
    if (v) return v;
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("provider_medication_updates").insert({
      organization_id: orgId, patient_device_id: deviceId, author_id: session?.user?.id, ...body,
    });
    if (error) return fail("insert_failed", error.message);
    return ok(true);
  },

  async scheduleAppointment(orgId: string, deviceId: string, body: {
    title: string; scheduled_at: string; location?: string; notes?: string;
  }): Promise<ApiResult<true>> {
    const v = guard<true>(body, validateAppointment);
    if (v) return v;
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("provider_appointments").insert({
      organization_id: orgId, patient_device_id: deviceId, author_id: session?.user?.id,
      title: body.title, location: body.location || null,
      scheduled_at: new Date(body.scheduled_at).toISOString(), notes: body.notes || null,
    });
    if (error) return fail("insert_failed", error.message);
    return ok(true);
  },

  // ─── RCM claims (validation-gated wrappers) ────────────────────────────
  claim: {
    async addLine(claimId: string, line: any): Promise<ApiResult<true>> {
      const v = guard<true>(line, validateClaimLine);
      if (v) return v;
      const { error } = await (supabase as any).from("rcm_claim_lines").insert({ ...line, claim_id: claimId });
      if (error) return fail("insert_failed", error.message);
      return ok(true);
    },
    async submit(claim: { id: string; encounter_type: string; net_amount: number; lines: any[] }): Promise<ApiResult<true>> {
      const v = guard<true>(claim, validateClaimSubmit);
      if (v) return v;
      const { data: { session } } = await supabase.auth.getSession();
      const { error: e1 } = await (supabase as any).from("rcm_claim_submissions").insert({
        claim_id: claim.id, status: "sent", submitted_by: session?.user?.id,
        nphies_batch_id: `BATCH-${Date.now()}`,
      });
      if (e1) return fail("insert_failed", e1.message);
      const { error: e2 } = await (supabase as any).from("rcm_claims")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", claim.id);
      if (e2) return fail("update_failed", e2.message);
      return ok(true);
    },
    async recordPayment(claimId: string, body: { amount: number; outstanding: number; method: string; reference?: string }):
      Promise<ApiResult<true>> {
      const v = guard<true>(body, validatePayment);
      if (v) return v;
      const { error } = await (supabase as any).from("rcm_claim_payments").insert({
        claim_id: claimId, amount: body.amount, method: body.method, reference: body.reference || null,
      });
      if (error) return fail("insert_failed", error.message);
      return ok(true);
    },
    async recordDenial(claimId: string, body: { reason_code: string; reason_text: string; amount?: number }):
      Promise<ApiResult<true>> {
      const v = guard<true>(body, validateDenial);
      if (v) return v;
      const { error } = await (supabase as any).from("rcm_claim_denials").insert({
        claim_id: claimId, reason_code: body.reason_code, reason_text: body.reason_text,
        amount: body.amount ?? 0, appeal_status: "none",
      });
      if (error) return fail("insert_failed", error.message);
      return ok(true);
    },
    async appeal(denialId: string, body: { appeal_note: string }): Promise<ApiResult<true>> {
      const v = guard<true>(body, validateAppeal);
      if (v) return v;
      const { error } = await (supabase as any).from("rcm_claim_denials")
        .update({ appeal_status: "appealed", appeal_note: body.appeal_note, appealed_at: new Date().toISOString() })
        .eq("id", denialId);
      if (error) return fail("update_failed", error.message);
      return ok(true);
    },
    async voidClaim(claimId: string): Promise<ApiResult<true>> {
      const { error } = await (supabase as any).from("rcm_claims")
        .update({ status: "void" }).eq("id", claimId);
      if (error) return fail("update_failed", error.message);
      return ok(true);
    },
  },

  // ─── Discharge ─────────────────────────────────────────────────────────
  admission: {
    async advanceStage(admissionId: string, target: string, sigState: any, note?: string):
      Promise<ApiResult<true>> {
      const v = guard<true>({ target_stage: target, ...sigState }, validateDischargeAdvance);
      if (v) return v;
      const { error } = await (supabase as any).rpc("rcm_advance_discharge", {
        _admission_id: admissionId, _stage: target, _notes: note ?? null,
      });
      if (error) return fail("rpc_failed", error.message);
      return ok(true);
    },
    async recordSignoff(admissionId: string, kind: "nursing" | "pharmacy" | "physician"):
      Promise<ApiResult<true>> {
      const col = `${kind}_signed_at`;
      const { data: existing } = await (supabase as any).from("rcm_discharge_signoffs")
        .select("id").eq("admission_id", admissionId).maybeSingle();
      if (existing?.id) {
        const { error } = await (supabase as any).from("rcm_discharge_signoffs")
          .update({ [col]: new Date().toISOString() }).eq("id", existing.id);
        if (error) return fail("update_failed", error.message);
      } else {
        const { error } = await (supabase as any).from("rcm_discharge_signoffs")
          .insert({ admission_id: admissionId, [col]: new Date().toISOString() });
        if (error) return fail("insert_failed", error.message);
      }
      return ok(true);
    },
  },

  // ─── Authorization follow-up ───────────────────────────────────────────
  authorization: {
    async followUp(requestId: string, hours: number, note?: string): Promise<ApiResult<true>> {
      const { error } = await (supabase as any).rpc("rcm_auth_follow_up", {
        _request_id: requestId, _hours: hours, _note: note ?? null,
      });
      if (error) return fail("rpc_failed", error.message);
      return ok(true);
    },
  },

  // ─── Patient search & consent ──────────────────────────────────────────
  patientSearch: {
    async search(type: string, value: string): Promise<ApiResult<{ matched: boolean; device_id?: string }>> {
      const v = guard<any>({ type, value }, validatePatientSearch);
      if (v) return v;
      const { data, error } = await supabase.functions.invoke("provider-search-patient", {
        body: { search_type: type, search_value: value.trim() },
      });
      if (error) return fail("rpc_failed", error.message);
      return ok({ matched: !!data?.matched, device_id: data?.device_id });
    },
  },

  consentRequests: {
    async create(orgId: string, deviceId: string, sections: ConsentSection[], note?: string):
      Promise<ApiResult<ConsentRequest>> {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await (supabase as any).from("consent_requests").insert({
        organization_id: orgId, patient_device_id: deviceId,
        requested_by: session?.user?.id, requested_sections: sections,
        review_note: note ?? null,
      }).select().single();
      if (error) return fail("insert_failed", error.message);
      const p = ConsentRequestSchema.safeParse(data);
      if (!p.success) return fail("contract_violation", p.error.message);
      return ok(p.data);
    },
    async listMine(orgId: string): Promise<ApiResult<ConsentRequest[]>> {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return ok([]);
      const { data, error } = await (supabase as any).from("consent_requests").select("*")
        .eq("organization_id", orgId).eq("requested_by", session.user.id)
        .order("created_at", { ascending: false }).limit(100);
      if (error) return fail("query_failed", error.message);
      const out: ConsentRequest[] = [];
      for (const r of data ?? []) {
        const p = ConsentRequestSchema.safeParse(r);
        if (p.success) out.push(p.data);
      }
      return ok(out);
    },
  },

  emr: {
    async fetchForPatient(orgId: string, deviceId: string): Promise<ApiResult<EmrFetchResponse>> {
      const { data, error } = await supabase.functions.invoke("provider-fetch-patient-emr", {
        body: { organization_id: orgId, patient_device_id: deviceId },
      });
      if (error) return fail("rpc_failed", error.message);
      const p = EmrFetchResponseSchema.safeParse(data);
      if (!p.success) return fail("contract_violation", p.error.message);
      return ok(p.data);
    },
  },
};

export type ProviderClient = typeof providerClient;
