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
  linked_entity_type?: string | null;
  linked_entity_id?: string | null;
}

export async function listJourneySteps(journeyId: string) {
  const { data, error } = await (supabase as any)
    .from("journey_steps")
    .select("*")
    .eq("journey_id", journeyId)
    .is("deleted_at", null)
    .order("step_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveJourneyStep(input: JourneyStepInput) {
  const payload = { ...input, status: input.status ?? "pending" };
  const q = input.id
    ? (supabase as any).from("journey_steps").update(payload).eq("id", input.id).select("*").single()
    : (supabase as any).from("journey_steps").insert(payload).select("*").single();
  const { data, error } = await q;
  if (error) throw error;
  await logAudit({
    patientId: input.patient_id,
    entityType: "journey_step",
    entityId: data.id,
    action: input.id ? "entity_updated" : "entity_created",
  });
  return data;
}

export async function removeJourneyStep(id: string, patientId: string) {
  const { error } = await (supabase as any)
    .from("journey_steps")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logAudit({
    patientId,
    entityType: "journey_step",
    entityId: id,
    action: "entity_deleted",
  });
}
