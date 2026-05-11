import { createDomainApi } from "./domainApiFactory";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "./patientDataApi";

export type RecordType = "lab" | "radiology" | "prescription" | "report" | "other";

export interface MedicalRecordRow {
  id: string;
  patient_id: string | null;
  user_id: string | null;
  device_id: string | null;
  client_generated_id: string | null;
  record_type: RecordType | string;
  title: string;
  record_date: string | null;
  facility_name: string | null;
  doctor_name: string | null;
  specialty: string | null;
  extracted_summary: string | null;
  structured_data: unknown;
  source: string;
  sync_status: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

import { medicalRecordSchema, validate } from './schemas';

export const medicalRecordApi = createDomainApi<MedicalRecordRow>({
  table: "medical_records",
  entity: "medical_records",
  auditEntity: "medical_record",
  validate: (r) => validate(medicalRecordSchema, r),
  orderBy: { column: "record_date", ascending: false },
});

export async function uploadRecordFile(params: {
  recordId: string;
  patientId: string;
  file: File;
}) {
  const path = `${params.patientId}/${params.recordId}/${Date.now()}-${params.file.name}`;
  const { error: upErr } = await supabase.storage
    .from("patient-records")
    .upload(path, params.file, { contentType: params.file.type });
  if (upErr) throw upErr;
  const { data, error } = await (supabase as any)
    .from("medical_record_files")
    .insert({
      medical_record_id: params.recordId,
      patient_id: params.patientId,
      storage_bucket: "patient-records",
      storage_path: path,
      file_name: params.file.name,
      mime_type: params.file.type,
      file_size: params.file.size,
    })
    .select("*")
    .single();
  if (error) throw error;
  await logAudit({
    patientId: params.patientId,
    entityType: "medical_record_file",
    entityId: data.id,
    action: "file_uploaded",
    metadata: { path, mime: params.file.type, size: params.file.size },
  });
  return data;
}
