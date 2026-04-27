/**
 * <Can action="payment.verify"> — render children only when the current user
 * has permission. Use `fallback` to render an alternative (e.g. ComingSoon).
 */
import type { ReactNode } from "react";
import { usePermissions } from "./usePermissions";
import type { Action } from "@/features/auth/logic/permissions";

interface CanProps {
  action: Action;
  children: ReactNode;
  fallback?: ReactNode;
}

export const Can = ({ action, children, fallback = null }: CanProps) => {
  const { ready, can } = usePermissions();
  if (!ready) return null;
  return <>{can(action) ? children : fallback}</>;
};
