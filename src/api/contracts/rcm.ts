/**
 * RCM (revenue cycle) — patient claims contract.
 *
 * The RCM module has dozens of internal tables; the public API surface
 * for mobile is the patient-facing claim queue. Provider-side tables
 * (visits, invoices, remittances) stay server-side via dedicated edge
 * functions and are not part of the mobile contract yet.
 */
import { z } from "zod";

export const PatientClaimStatusSchema = z.string().min(1);

export const PatientClaimSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  matched_device_id: z.string().nullable(),
  search_type: z.string(),
  status: PatientClaimStatusSchema,
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PatientClaim = z.infer<typeof PatientClaimSchema>;
