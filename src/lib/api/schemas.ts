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

export function validate(schema: z.ZodTypeAny, input: unknown) {
  try {
    return schema.parse(input);
  } catch (e) {
    if (e instanceof ZodError) throw new ValidationError(e);
    throw e;
  }
}

export default { medicationSchema, validate };
