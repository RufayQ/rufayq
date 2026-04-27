/**
 * Auth API contract — current session, roles, permissions.
 */
import { z } from "zod";

export const AppRoleSchema = z.enum([
  "admin", "moderator", "user", "provider_admin", "provider_staff",
]);

export const SessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
});

export const CurrentAuthSchema = z.object({
  user: SessionUserSchema.nullable(),
  roles: AppRoleSchema.array(),
});

export type AppRole = z.infer<typeof AppRoleSchema>;
export type SessionUser = z.infer<typeof SessionUserSchema>;
export type CurrentAuth = z.infer<typeof CurrentAuthSchema>;
