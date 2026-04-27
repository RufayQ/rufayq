/**
 * Shared user/role domain types.
 * Phase 1 of the Feature-Sliced refactor — types live in `shared/types/`,
 * components keep their current location and just import from here.
 */

export type AppRole =
  | "admin"
  | "moderator"
  | "user"
  | "provider_admin"
  | "provider_staff";

export interface AppUser {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface UserRoleRow {
  id: string;
  user_id: string;
  role: AppRole;
}
