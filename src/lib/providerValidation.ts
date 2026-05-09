/**
 * Provider portal — client-side business validation.
 *
 * Mirrors the pattern in `transportValidation.ts`. Each `validate*` function
 * returns an array of `ProviderIssue`. Callers map errors to UI fields using
 * `fieldErrorMap()` and block save when `hasBlockingErrors()` is true.
 *
 * These rules are mirrored server-side by RLS, triggers, and DB functions —
 * client validation is a UX guardrail, not the source of truth.
 */

export type ProviderIssueLevel = "error" | "warning";

export interface ProviderIssue {
  field: string;
  message: string;
  level: ProviderIssueLevel;
}

const e = (field: string, message: string): ProviderIssue => ({ field, message, level: "error" });
const w = (field: string, message: string): ProviderIssue => ({ field, message, level: "warning" });

const len = (s: unknown) => (typeof s === "string" ? s.trim().length : 0);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isE164 = (s: string) => /^\+?[1-9]\d{6,14}$/.test(s.replace(/[\s-]/g, ""));
const DEVICE_RE = /^[A-Za-z0-9_-]{8,64}$/;
const SERVICE_CODE_RE = /^[A-Z0-9.-]{2,16}$/;

// ─── Patient link ──────────────────────────────────────────────────────────
export interface PatientLinkInput {
  patient_device_id?: string;
  patient_email?: string | null;
  patient_phone?: string | null;
}
export function validatePatientLink(p: PatientLinkInput): ProviderIssue[] {
  const out: ProviderIssue[] = [];
  if (!len(p.patient_device_id)) out.push(e("patient_device_id", "Patient device ID is required"));
  else if (!DEVICE_RE.test(p.patient_device_id!.trim()))
    out.push(e("patient_device_id", "Device ID must be 8–64 alphanumeric, _ or -"));
  if (p.patient_email && !isEmail(p.patient_email)) out.push(e("patient_email", "Invalid email"));
  if (p.patient_phone && !isE164(p.patient_phone)) out.push(e("patient_phone", "Invalid phone (use international format)"));
  return out;
}

// ─── Instruction ───────────────────────────────────────────────────────────
export interface InstructionInput {
  title?: string; body?: string; body_ar?: string | null;
  priority?: "low" | "normal" | "high" | string;
}
export function validateInstruction(i: InstructionInput): ProviderIssue[] {
  const out: ProviderIssue[] = [];
  const t = len(i.title);
  if (t < 1) out.push(e("title", "Title is required"));
  else if (t > 120) out.push(e("title", "Title must be ≤ 120 characters"));
  const b = len(i.body);
  if (b < 1) out.push(e("body", "Body is required"));
  else if (b > 2000) out.push(e("body", "Body must be ≤ 2000 characters"));
  if (i.body_ar && len(i.body_ar) > 2000) out.push(e("body_ar", "Arabic body must be ≤ 2000 characters"));
  if (i.priority && !["low", "normal", "high"].includes(i.priority))
    out.push(e("priority", "Invalid priority"));
  return out;
}

// ─── Medication update ─────────────────────────────────────────────────────
export interface MedUpdateInput {
  action?: "add" | "change" | "stop" | string;
  med_name?: string; dose?: string | null; frequency?: string | null;
}
export function validateMedUpdate(m: MedUpdateInput): ProviderIssue[] {
  const out: ProviderIssue[] = [];
  if (!m.action || !["add", "change", "stop"].includes(m.action))
    out.push(e("action", "Action must be add, change, or stop"));
  const n = len(m.med_name);
  if (n < 1) out.push(e("med_name", "Medication name is required"));
  else if (n > 120) out.push(e("med_name", "Name must be ≤ 120 characters"));
  if (m.action === "add" || m.action === "change") {
    if (!len(m.dose)) out.push(e("dose", "Dose is required for add/change"));
    if (!len(m.frequency)) out.push(e("frequency", "Frequency is required for add/change"));
  }
  return out;
}

// ─── Appointment ───────────────────────────────────────────────────────────
export interface AppointmentInput { title?: string; scheduled_at?: string }
export function validateAppointment(a: AppointmentInput, now: Date = new Date()): ProviderIssue[] {
  const out: ProviderIssue[] = [];
  const t = len(a.title);
  if (t < 1) out.push(e("title", "Title is required"));
  else if (t > 120) out.push(e("title", "Title must be ≤ 120 characters"));
  if (!a.scheduled_at) out.push(e("scheduled_at", "Date/time is required"));
  else {
    const ts = new Date(a.scheduled_at).getTime();
    if (isNaN(ts)) out.push(e("scheduled_at", "Invalid date/time"));
    else if (ts < now.getTime() - 60 * 60 * 1000)
      out.push(e("scheduled_at", "Cannot schedule more than 1 hour in the past"));
  }
  return out;
}

// ─── Claim line ────────────────────────────────────────────────────────────
export interface ClaimLineInput {
  service_code?: string; service_name?: string;
  qty?: number; unit_price?: number; discount_amount?: number; vat_amount?: number;
}
export function validateClaimLine(l: ClaimLineInput): ProviderIssue[] {
  const out: ProviderIssue[] = [];
  if (!len(l.service_code)) out.push(e("service_code", "Service code required"));
  else if (!SERVICE_CODE_RE.test(l.service_code!.trim()))
    out.push(e("service_code", "Code must be 2–16 chars, A-Z 0-9 . -"));
  if (!len(l.service_name)) out.push(e("service_name", "Service name required"));
  if (!(typeof l.qty === "number") || l.qty <= 0) out.push(e("qty", "Quantity must be > 0"));
  if (!(typeof l.unit_price === "number") || l.unit_price < 0) out.push(e("unit_price", "Unit price must be ≥ 0"));
  if (typeof l.discount_amount === "number" && l.discount_amount < 0)
    out.push(e("discount_amount", "Discount must be ≥ 0"));
  if (typeof l.vat_amount === "number" && l.vat_amount < 0)
    out.push(e("vat_amount", "VAT must be ≥ 0"));
  return out;
}

// ─── Claim submit ──────────────────────────────────────────────────────────
export interface ClaimSubmitInput {
  encounter_type?: string;
  net_amount?: number;
  lines?: ClaimLineInput[];
}
export function validateClaimSubmit(c: ClaimSubmitInput): ProviderIssue[] {
  const out: ProviderIssue[] = [];
  if (!len(c.encounter_type)) out.push(e("encounter_type", "Encounter type required"));
  if (!c.lines || c.lines.length === 0) out.push(e("lines", "Claim must have at least one service line"));
  if (!(typeof c.net_amount === "number") || c.net_amount <= 0)
    out.push(e("net_amount", "Net amount must be > 0"));
  return out;
}

// ─── Payment ───────────────────────────────────────────────────────────────
export interface PaymentInput {
  amount?: number; outstanding?: number;
  method?: "bank_transfer" | "cheque" | "cash" | "card" | "offset" | string;
  reference?: string | null;
}
export function validatePayment(p: PaymentInput): ProviderIssue[] {
  const out: ProviderIssue[] = [];
  if (!(typeof p.amount === "number") || p.amount <= 0) out.push(e("amount", "Amount must be > 0"));
  if (typeof p.outstanding === "number" && typeof p.amount === "number" && p.amount > p.outstanding)
    out.push(e("amount", `Amount exceeds outstanding (${p.outstanding})`));
  if (!p.method || !["bank_transfer", "cheque", "cash", "card", "offset"].includes(p.method))
    out.push(e("method", "Invalid payment method"));
  if ((p.method === "bank_transfer" || p.method === "cheque") && !len(p.reference))
    out.push(e("reference", "Reference required for bank transfer or cheque"));
  return out;
}

// ─── Denial / appeal ───────────────────────────────────────────────────────
export interface DenialInput { reason_code?: string; reason_text?: string }
export function validateDenial(d: DenialInput): ProviderIssue[] {
  const out: ProviderIssue[] = [];
  if (!len(d.reason_code)) out.push(e("reason_code", "Denial code required"));
  else if (d.reason_code!.trim().length > 32) out.push(e("reason_code", "Code must be ≤ 32 chars"));
  const r = len(d.reason_text);
  if (r < 1) out.push(e("reason_text", "Denial reason required"));
  else if (r > 500) out.push(e("reason_text", "Reason must be ≤ 500 chars"));
  return out;
}

export interface AppealInput { appeal_note?: string }
export function validateAppeal(a: AppealInput): ProviderIssue[] {
  const out: ProviderIssue[] = [];
  const n = len(a.appeal_note);
  if (n < 1) out.push(e("appeal_note", "Appeal note is required"));
  else if (n > 1000) out.push(e("appeal_note", "Note must be ≤ 1000 chars"));
  return out;
}

// ─── Authorization ─────────────────────────────────────────────────────────
export interface AuthorizationSubmitInput {
  payer?: string; visit_ref?: string; tat_due_at?: string;
}
export function validateAuthorizationSubmit(a: AuthorizationSubmitInput, now: Date = new Date()): ProviderIssue[] {
  const out: ProviderIssue[] = [];
  if (!len(a.payer)) out.push(e("payer", "Payer required"));
  if (!len(a.visit_ref)) out.push(e("visit_ref", "Visit reference required"));
  if (a.tat_due_at) {
    const ts = new Date(a.tat_due_at).getTime();
    if (isNaN(ts)) out.push(e("tat_due_at", "Invalid date"));
    else if (ts < now.getTime()) out.push(e("tat_due_at", "TAT due date must be in the future"));
  }
  return out;
}

// ─── Discharge advance ─────────────────────────────────────────────────────
export type DischargeStage =
  | "discharge_advice" | "discharge_order" | "service_reconciliation"
  | "financial_discharge" | "left_facility";
export interface DischargeAdvanceInput {
  target_stage?: DischargeStage;
  nursing_signed_at?: string | null;
  pharmacy_signed_at?: string | null;
  physician_signed_at?: string | null;
  financial_discharged_at?: string | null;
}
export function validateDischargeAdvance(d: DischargeAdvanceInput): ProviderIssue[] {
  const out: ProviderIssue[] = [];
  if (d.target_stage === "financial_discharge") {
    if (!d.nursing_signed_at) out.push(e("nursing_signed_at", "Nursing sign-off required"));
    if (!d.pharmacy_signed_at) out.push(e("pharmacy_signed_at", "Pharmacy sign-off required"));
    if (!d.physician_signed_at) out.push(e("physician_signed_at", "Physician sign-off required"));
  }
  if (d.target_stage === "left_facility" && !d.financial_discharged_at)
    out.push(e("financial_discharged_at", "Financial discharge must be completed first"));
  return out;
}

// ─── Patient search ────────────────────────────────────────────────────────
export type PatientSearchType = "saudi_id" | "iqama" | "passport";
export interface PatientSearchInput { type?: PatientSearchType | string; value?: string }
export function validatePatientSearch(s: PatientSearchInput): ProviderIssue[] {
  const out: ProviderIssue[] = [];
  if (!s.type || !["saudi_id", "iqama", "passport"].includes(s.type))
    return [e("type", "Search type required")];
  const v = (s.value ?? "").trim();
  if (!v) return [e("value", "Value required")];
  if (s.type === "saudi_id") {
    if (!/^\d{10}$/.test(v)) out.push(e("value", "Saudi ID must be 10 digits"));
  } else if (s.type === "iqama") {
    if (!/^[12]\d{9}$/.test(v)) out.push(e("value", "Iqama must be 10 digits starting with 1 or 2"));
  } else if (s.type === "passport") {
    if (!/^[A-Za-z0-9]{6,9}$/.test(v)) out.push(e("value", "Passport must be 6–9 alphanumeric chars"));
  }
  return out;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
export const hasBlockingErrors = (issues: ProviderIssue[]) =>
  issues.some((i) => i.level === "error");

export const fieldErrorMap = (issues: ProviderIssue[]): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const i of issues) if (i.level === "error" && !map[i.field]) map[i.field] = i.message;
  return map;
};

export { w as _warn }; // exported for callers that want to push warnings inline
