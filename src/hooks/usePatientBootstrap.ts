import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrap } from "@/lib/sync/syncEngine";
import { backfillLegacyLocalStorage } from "@/lib/sync/syncEngine";
import { setActivePatientKey } from "@/lib/sync/activePatient";
import { clearAllForPatient } from "@/lib/sync/cacheStore";
import type { BootstrapResult } from "@/lib/api/patientDataApi";

/** Bootstraps the patient session on mount and on auth-state changes. */
export function usePatientBootstrap() {
  const [state, setState] = useState<BootstrapResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      console.info("[RufayqStartup] Patient bootstrap start");
      try {
        const ctx = await bootstrap();
        if (cancelled) return;
        setState(ctx);
        setActivePatientKey(ctx.patientId);
        try {
          if (ctx.userId) clearAllForPatient(ctx.deviceId);
        } catch (e) {
          console.warn("[usePatientBootstrap] clear cache failed", e);
        }
        void backfillLegacyLocalStorage(ctx).catch((e) =>
          console.warn("[usePatientBootstrap] backfill failed", e),
        );
        console.info("[RufayqStartup] Patient bootstrap success");
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error(`[RufayqStartup] Patient bootstrap failed: ${err.name} ${err.message}`);
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // Re-bootstrap on login/logout — defer to avoid recursion in the listener.
      setTimeout(() => void run(), 0);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { ...state, isLoading, error };
}
