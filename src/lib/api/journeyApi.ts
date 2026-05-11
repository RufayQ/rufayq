import { createDomainApi } from "./domainApiFactory";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "./patientDataApi";

export interface JourneyRow {
  id: string;
  patient_id: string | null;
  user_id: string | null;
  device_id: string | null;
  client_generated_id: string | null;
  journey_title: string;
  journey_type: string | null;
  destination_country: string | null;
  destination_city: string | null;
  current_phase: string | null;
  start_date: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: string;
  source: string;
  sync_status: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface JourneyStepRow {
  id: string;
  journey_id: string;
  patient_id: string | null;
  step_order: number;
  step_type: string;
  title: string;
  description: string | null;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

import { journeySchema, validate } from './schemas';

export const journeyApi = createDomainApi<JourneyRow>({
  table: "journeys",
  entity: "journeys",
  auditEntity: "journey",
  validate: (j) => validate(journeySchema, j),
  orderBy: { column: "start_date", ascending: false },
});

export interface JourneyStepInput {
  id?: string;
  journey_id: string;
  patient_id: string;
  step_order: number;
  step_type: string;
  title: string;
  description?: string | null;
  status?: string;
  due_at?: string | null;
  completed_at?: string | null;
  linked_entity_type?: string | null;
  linked_entity_id?: string | null;
}

export async function listJourneySteps(journeyId: string): Promise<JourneyStepRow[]> {
  const { data, error } = await (supabase as any)
    .from("journey_steps")
    .select("*")
    .eq("journey_id", journeyId)
    .is("deleted_at", null)
    .order("step_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as JourneyStepRow[];
}

function validateStepInput(input: JourneyStepInput) {
  if (!input.journey_id) throw new Error("journey_id is required");
  if (!input.patient_id) throw new Error("patient_id is required");
  if (!input.title || !input.title.trim()) throw new Error("title is required");
  if (typeof input.step_order !== "number") throw new Error("step_order is required");
  if (!input.step_type) throw new Error("step_type is required");
}

export async function saveJourneyStep(input: JourneyStepInput): Promise<JourneyStepRow> {
  validateStepInput(input);
  const status = input.status ?? "pending";
  // Auto-manage completed_at based on status transitions.
  let completed_at: string | null | undefined = input.completed_at;
  if (status === "done" && !completed_at) completed_at = new Date().toISOString();
  if (status !== "done") completed_at = null;

  const { id, ...rest } = input;
  const payload: any = { ...rest, status, completed_at };

  const q = id
    ? (supabase as any)
        .from("journey_steps")
        .update(payload)
        .eq("id", id)
        .eq("patient_id", input.patient_id)
        .eq("journey_id", input.journey_id)
        .select("*")
        .single()
    : (supabase as any).from("journey_steps").insert(payload).select("*").single();
  const { data, error } = await q;
  if (error) throw error;
  await logAudit({
    patientId: input.patient_id,
    entityType: "journey_step",
    entityId: data.id,
    action: id ? "entity_updated" : "entity_created",
  });
  return data as JourneyStepRow;
}

export async function removeJourneyStep(id: string, patientId: string, journeyId?: string) {
  let q = (supabase as any)
    .from("journey_steps")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("patient_id", patientId);
  if (journeyId) q = q.eq("journey_id", journeyId);
  const { error } = await q;
  if (error) throw error;
  await logAudit({
    patientId,
    entityType: "journey_step",
    entityId: id,
    action: "entity_deleted",
  });
}

export async function reorderJourneySteps(
  journeyId: string,
  patientId: string,
  ordered: { id: string; step_order: number }[],
) {
  await Promise.all(
    ordered.map((o) =>
      (supabase as any)
        .from("journey_steps")
        .update({ step_order: o.step_order })
        .eq("id", o.id)
        .eq("patient_id", patientId)
        .eq("journey_id", journeyId),
    ),
  );
  await logAudit({
    patientId,
    entityType: "journey_step",
    entityId: journeyId,
    action: "entity_updated",
  });
}

/** Default 10-step canonical timeline. Inserted only when a journey has no live steps. */
const DEFAULT_STEP_TEMPLATE: Array<Omit<JourneyStepInput, "journey_id" | "patient_id">> = [
  { step_order: 1, step_type: "before", title: "Medical Records Uploaded", description: "Upload your medical files to your secure vault." },
  { step_order: 2, step_type: "before", title: "Travel Checklist Complete", description: "Pack documents, medications, and visa." },
  { step_order: 3, step_type: "before", title: "Appointment Confirmed", description: "Confirm your hospital appointment." },
  { step_order: 4, step_type: "during", title: "Arrived & Registered", description: "Register at the hospital." },
  { step_order: 5, step_type: "during", title: "Pre-Op Consultation", description: "Meet your treating doctor." },
  { step_order: 6, step_type: "during", title: "Procedure Completed", description: "Treatment delivered." },
  { step_order: 7, step_type: "during", title: "Discharge Pack Ready", description: "Bilingual discharge documents available." },
  { step_order: 8, step_type: "after", title: "Return Home", description: "Return flight to Saudi Arabia." },
  { step_order: 9, step_type: "after", title: "7-Day Follow-up", description: "Post-treatment check-up." },
  { step_order: 10, step_type: "after", title: "30-Day Follow-up", description: "Follow-up with Saudi care team." },
];

export async function seedDefaultSteps(journeyId: string, patientId: string): Promise<JourneyStepRow[]> {
  const existing = await listJourneySteps(journeyId);
  if (existing.length > 0) return existing;
  const rows = DEFAULT_STEP_TEMPLATE.map((s) => ({
    ...s,
    journey_id: journeyId,
    patient_id: patientId,
    status: "pending",
  }));
  const { data, error } = await (supabase as any)
    .from("journey_steps")
    .insert(rows)
    .select("*");
  if (error) throw error;
  return (data ?? []) as JourneyStepRow[];
}
