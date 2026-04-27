/**
 * App review API contract.
 */
import { z } from "zod";

export const AppReviewSchema = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  reviewer_name: z.string().nullable(),
  reviewer_country: z.string().nullable(),
  notes: z.string().nullable(),
  advice: z.string().nullable(),
  approved: z.boolean(),
  device_id: z.string().nullable(),
  created_at: z.string(),
});

export type AppReview = z.infer<typeof AppReviewSchema>;
