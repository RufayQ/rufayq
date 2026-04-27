/**
 * Centralised permission matrix. Components ask `can(role, action)` instead
 * of inlining role checks. Server-side RLS remains the source of truth for
 * security — this is purely for UI gating.
 */
import type { AppRole } from "@/shared/types/user";

export type Action =
  // Subscriptions
  | "subscription.view" | "subscription.modify" | "subscription.cancel"
  // Payments
  | "payment.view" | "payment.verify" | "payment.reject"
  // Users & roles
  | "user.view" | "user.create" | "user.assign_role" | "user.revoke_role"
  // CMS
  | "cms.view" | "cms.edit" | "cms.publish"
  // Audit
  | "audit.view"
  // RCM
  | "rcm.view" | "rcm.modify"
  // Tickets (support moderation)
  | "ticket.view" | "ticket.moderate"
  // Patient claims (CRM)
  | "claim.view" | "claim.decide";

const MATRIX: Record<AppRole, Action[]> = {
  admin: [
    "subscription.view", "subscription.modify", "subscription.cancel",
    "payment.view", "payment.verify", "payment.reject",
    "user.view", "user.create", "user.assign_role", "user.revoke_role",
    "cms.view", "cms.edit", "cms.publish",
    "audit.view",
    "rcm.view", "rcm.modify",
    "ticket.view", "ticket.moderate",
    "claim.view", "claim.decide",
  ],
  moderator: [
    "subscription.view", "payment.view",
    "user.view",
    "cms.view", "cms.edit",
    "audit.view",
    "rcm.view",
    "ticket.view", "ticket.moderate",
    "claim.view",
  ],
  provider_admin: ["rcm.view", "rcm.modify", "user.view", "claim.view", "claim.decide"],
  provider_staff: ["rcm.view", "claim.view"],
  user: [],
};

export const can = (role: AppRole | null | undefined, action: Action): boolean => {
  if (!role) return false;
  return MATRIX[role].includes(action);
};

export const canAny = (
  roles: readonly AppRole[] | null | undefined,
  action: Action,
): boolean => !!roles?.some((r) => can(r, action));
