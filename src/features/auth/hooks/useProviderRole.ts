/**
 * Reads the signed-in user's roles from `user_roles` and resolves the
 * effective provider role used by the dashboard for `<Can>` gating.
 *
 * Resolution order:
 *   admin / moderator → provider_admin (full power)
 *   provider_admin    → provider_admin
 *   provider_staff    → provider_staff
 *   none              → null (caller should bounce to /provider/login)
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/shared/types/user";

export function useProviderRole(): { role: AppRole | null; loading: boolean } {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { if (alive) { setRole(null); setLoading(false); } return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      if (!alive) return;
      const roles = (data ?? []).map((r: { role: string }) => r.role);
      let next: AppRole | null = null;
      if (roles.includes("admin") || roles.includes("moderator") || roles.includes("provider_admin")) next = "provider_admin";
      else if (roles.includes("provider_staff")) next = "provider_staff";
      setRole(next);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { role, loading };
}
