import { createDomainApi } from "./domainApiFactory";

export interface AppointmentRow {
  id: string;
  patient_id: string | null;
  user_id: string | null;
  device_id: string | null;
  client_generated_id: string | null;
  title: string;
  appointment_type: string | null;
  facility_name: string | null;
  doctor_name: string | null;
  specialty: string | null;
  location: string | null;
  start_at: string | null;
  end_at: string | null;
  notes: string | null;
  source: string;
  sync_status: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

import { appointmentSchema, validate } from './schemas';

export const appointmentApi = createDomainApi<AppointmentRow>({
  table: "appointments",
  entity: "appointments",
  auditEntity: "appointment",
  validate: (a) => validate(appointmentSchema, a),
  orderBy: { column: "start_at", ascending: true },
});
