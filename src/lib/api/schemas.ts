import { z, ZodError } from "zod";

export class ValidationError extends Error {
  public details: ZodError;
  constructor(err: ZodError) {
    super("validation_error");
    this.details = err;
  }
}

export const medicationSchema = z.object({
  id: z.string().optional(),
  patient_id: z.string().optional(),
  medication_name: z.string().min(1),
  dose: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
});

export const appointmentSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  appointment_type: z.string().nullable().optional(),
  start_at: z.string().nullable().optional(),
  end_at: z.string().nullable().optional(),
});

export const allergySchema = z.object({
  id: z.string().optional(),
  allergen: z.string().min(1),
  severity: z.string().nullable().optional(),
  reaction: z.string().nullable().optional(),
});

export const medicalRecordSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  record_type: z.string().min(1),
  record_date: z.string().nullable().optional(),
});

export const journeySchema = z.object({
  id: z.string().optional(),
  journey_title: z.string().min(1),
  start_date: z.string().nullable().optional(),
});

export const carePlanSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  start_date: z.string().nullable().optional(),
});

export const educationSchema = z.object({
  id: z.string().optional(),
  content_id: z.string().min(1),
  title: z.string().min(1),
});

export const transportSchema = z.object({
  id: z.string().optional(),
  trip_type: z.string().min(1),
  document_type: z.string().optional(),
  passenger_name: z.string().nullable().optional(),
  booking_reference: z.string().nullable().optional(),
});

export function validate(schema: z.ZodTypeAny, input: unknown) {
  try {
    return schema.parse(input);
  } catch (e) {
    if (e instanceof ZodError) throw new ValidationError(e);
    throw e;
  }
}

export default { medicationSchema, appointmentSchema, allergySchema, medicalRecordSchema, journeySchema, carePlanSchema, educationSchema, transportSchema, validate };
