import { createDomainApi } from "./domainApiFactory";

export interface EducationProgressRow {
  id: string;
  patient_id: string | null;
  user_id: string | null;
  device_id: string | null;
  client_generated_id: string | null;
  content_id: string;
  content_type: string | null;
  title: string;
  status: string;
  progress_percent: number | null;
  completed_at: string | null;
  source: string;
  sync_status: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const educationApi = createDomainApi<EducationProgressRow>({
  table: "education_progress",
  entity: "education_progress",
  auditEntity: "education_progress",
  validate: (e) => {
    if (!e.content_id || !String(e.content_id).trim()) throw new Error("content_id is required");
    if (!e.title || !String(e.title).trim()) throw new Error("title is required");
  },
  orderBy: { column: "updated_at", ascending: false },
});
