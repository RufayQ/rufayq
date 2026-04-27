/**
 * usePermissions — load the current user's roles once and expose
 * permission-aware helpers backed by the auth client / permission matrix.
 *
 * Used by both web and (future) mobile admin shells so gating logic lives
 * in exactly one place.
 *
 *   const { ready, can, hasAnyRole } = usePermissions();
 *   if (!can("payment.verify")) return <ComingSoon ... />;
 */
import { useEffect, useState } from "react";
import { authClient, type AppRole } from "@/api";
import type { Action } from "@/features/auth/logic/permissions";

interface State {
  ready: boolean;
  roles: readonly AppRole[];
}

export function usePermissions() {
  const [state, setState] = useState<State>({ ready: false, roles: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await authClient.current();
      if (!alive) return;
      setState({ ready: true, roles: res.data?.roles ?? [] });
    })();
    return () => { alive = false; };
  }, []);

  return {
    ready: state.ready,
    roles: state.roles,
    /** UI gate: does any of the user's roles allow this action? */
    can: (action: Action) => authClient.canAny(state.roles, action),
    /** Backwards-compatible role check for legacy components. */
    hasAnyRole: (roles: readonly AppRole[]) => state.roles.some((r) => roles.includes(r)),
    isAdmin: state.roles.includes("admin"),
    isModerator: state.roles.includes("moderator"),
  };
}
