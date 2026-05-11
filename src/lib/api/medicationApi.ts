import { createDomainApi } from "./domainApiFactory";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "./patientDataApi";

export interface MedicationRow {
  id: string;
  patient_id: string | null;
  user_id: string | null;
  device_id: string | null;
  client_generated_id: string | null;
  medication_name: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  instructions: string | null;
  prescribing_doctor: string | null;
  reminder_enabled: boolean | null;
  reminder_times: unknown;
  source: string;
  sync_status: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const medicationApi = createDomainApi<MedicationRow>({
  table: "medications",
  entity: "medications",
  auditEntity: "medication",
  validate: (m) => {
    if (!m.medication_name || !String(m.medication_name).trim()) {
      throw new Error("medication_name is required");
    }
  },
  orderBy: { column: "created_at", ascending: false },
});

export async function recordMedicationEvent(params: {
  medicationId: string;
  patientId: string;
  scheduledAt: string;
  status: "taken" | "missed" | "skipped";
  notes?: string;
}) {
  const { error, data } = await (supabase as any)
    .from("medication_events")
    .insert({
      medication_id: params.medicationId,
      patient_id: params.patientId,
      scheduled_at: params.scheduledAt,
      status: params.status,
      notes: params.notes ?? null,
      recorded_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  await logAudit({
    patientId: params.patientId,
    entityType: "medication_event",
    entityId: data.id,
    action: "entity_created",
    metadata: { status: params.status },
  });
  return data;
}
