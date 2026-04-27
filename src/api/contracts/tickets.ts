/**
 * Support ticket API contract.
 */
import { z } from "zod";

export const TicketStatusSchema = z.enum(["open", "in_progress", "resolved", "closed"]);
export const TicketPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export const TicketCategorySchema = z.string().min(1);

export const SupportTicketSchema = z.object({
  id: z.string().uuid(),
  ticket_number: z.string(),
  title: z.string(),
  description: z.string(),
  category: TicketCategorySchema,
  priority: TicketPrioritySchema,
  status: TicketStatusSchema,
  user_email: z.string().nullable(),
  user_name: z.string().nullable(),
  device_id: z.string().nullable(),
  resolution_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type SupportTicket = z.infer<typeof SupportTicketSchema>;
export type TicketStatus = z.infer<typeof TicketStatusSchema>;
