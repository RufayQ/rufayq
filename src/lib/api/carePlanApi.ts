import { createDomainApi } from "./domainApiFactory";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "./patientDataApi";

export interface CarePlanRow {
  id: string;
  patient_id: string | null;
  user_id: string | null;
  device_id: string | null;
  client_generated_id: string | null;
  title: string;
  plan_type: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
  source: string;
  sync_status: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const carePlanApi = createDomainApi<CarePlanRow>({
  table: "care_plans",
  entity: "care_plans",
  auditEntity: "care_plan",
  validate: (p) => {
    if (!p.title || !String(p.title).trim()) throw new Error("title is required");
  },
  orderBy: { column: "start_date", ascending: false },
});

export interface CarePlanTaskInput {
  id?: string;
  care_plan_id: string;
  patient_id: string;
  title: string;
  task_type?: string | null;
  frequency?: string | null;
  due_at?: string | null;
  status?: string;
}

export async function listCarePlanTasks(carePlanId: string) {
  const { data, error } = await (supabase as any)
    .from("care_plan_tasks")
    .select("*")
    .eq("care_plan_id", carePlanId)
    .is("deleted_at", null)
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveCarePlanTask(input: CarePlanTaskInput) {
  const payload = { ...input, status: input.status ?? "pending" };
  const q = input.id
    ? (supabase as any).from("care_plan_tasks").update(payload).eq("id", input.id).select("*").single()
    : (supabase as any).from("care_plan_tasks").insert(payload).select("*").single();
  const { data, error } = await q;
  if (error) throw error;
  await logAudit({
    patientId: input.patient_id,
    entityType: "care_plan_task",
    entityId: data.id,
    action: input.id ? "entity_updated" : "entity_created",
  });
  return data;
}

export async function completeCarePlanTask(id: string, patientId: string) {
  const { data, error } = await (supabase as any)
    .from("care_plan_tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await logAudit({ patientId, entityType: "care_plan_task", entityId: id, action: "entity_updated" });
  return data;
}
