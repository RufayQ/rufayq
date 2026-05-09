/**
 * Provider portal — Zod contracts.
 *
 * Single source of truth for the shapes the provider client returns. Callers
 * (UI screens, edge functions, tests) parse against these schemas so a DB
 * shape regression is caught at the boundary rather than deep in render code.
 */
import { z } from "zod";

export const OrgSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  org_type: z.string().nullable().optional(),
});
export type Organization = z.infer<typeof OrgSchema>;

export const ProviderPatientSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  patient_device_id: z.string(),
  patient_name: z.string().nullable().optional(),
  patient_email: z.string().nullable().optional(),
  patient_phone: z.string().nullable().optional(),
  status: z.string(),
  notes: z.string().nullable().optional(),
});
export type ProviderPatient = z.infer<typeof ProviderPatientSchema>;

export const ConsentSectionSchema = z.enum([
  "profile", "medications", "lab_results", "imaging",
  "discharge_summaries", "appointments", "consultations",
]);
export type ConsentSection = z.infer<typeof ConsentSectionSchema>;

export const ConsentRequestSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  requested_by: z.string().uuid(),
  patient_device_id: z.string(),
  requested_sections: z.array(z.string()),
  approved_sections: z.array(z.string()).nullable().optional(),
  status: z.enum(["pending", "approved", "denied", "partial"]),
  reviewed_at: z.string().nullable().optional(),
  review_note: z.string().nullable().optional(),
  created_at: z.string(),
});
export type ConsentRequest = z.infer<typeof ConsentRequestSchema>;

export const EmrSectionPayloadSchema = z.discriminatedUnion("granted", [
  z.object({ granted: z.literal(false), section: ConsentSectionSchema }),
  z.object({
    granted: z.literal(true),
    section: ConsentSectionSchema,
    data: z.unknown(),
  }),
]);
export const EmrFetchResponseSchema = z.object({
  patient_device_id: z.string(),
  sections: z.array(EmrSectionPayloadSchema),
  fetched_at: z.string(),
});
export type EmrFetchResponse = z.infer<typeof EmrFetchResponseSchema>;
