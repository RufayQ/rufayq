/**
 * `<Can action="provider.rcm.claim.void">…</Can>` — UI permission gate.
 *
 * Renders children only if the supplied (or current provider) role is
 * permitted to perform the action. Pure UI guardrail — server-side RLS is
 * still the source of truth.
 */
import type { ReactNode } from "react";
import { can, type Action } from "@/features/auth/logic/permissions";
import { useProviderRole } from "@/features/auth/hooks/useProviderRole";
import type { AppRole } from "@/shared/types/user";

interface Props {
  action: Action;
  role?: AppRole | null;
  fallback?: ReactNode;
  children: ReactNode;
}

export const Can = ({ action, role, fallback = null, children }: Props) => {
  const ctx = useProviderRole();
  const effective = role ?? ctx.role;
  return can(effective, action) ? <>{children}</> : <>{fallback}</>;
};

export default Can;
