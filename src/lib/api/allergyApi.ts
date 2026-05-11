import { createDomainApi } from "./domainApiFactory";

export interface AllergyRow {
  id: string;
  patient_id: string | null;
  user_id: string | null;
  device_id: string | null;
  client_generated_id: string | null;
  allergen: string;
  allergy_type: string | null;
  severity: string | null;
  reaction: string | null;
  notes: string | null;
  source: string;
  sync_status: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

import { allergySchema, validate } from './schemas';

export const allergyApi = createDomainApi<AllergyRow>({
  table: "allergies",
  entity: "allergies",
  auditEntity: "allergy",
  validate: (a) => validate(allergySchema, a),
  orderBy: { column: "created_at", ascending: false },
});
