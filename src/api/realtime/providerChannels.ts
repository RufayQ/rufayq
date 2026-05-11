/**
 * Provider portal realtime hook.
 *
 * Subscribes to a postgres_changes stream filtered by organization_id and
 * invokes the provided callback on every change. Cleans up on unmount.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type ChangeHandler = (payload: any) => void;

export function useProviderRealtime(
  orgId: string | null | undefined,
  table: string,
  onChange: ChangeHandler,
) {
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`provider-${table}-${orgId}`)
      .on(
        // postgres_changes is a string event in supabase-js
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `organization_id=eq.${orgId}` },
        (payload: any) => onChange(payload),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, table, onChange]);
}
