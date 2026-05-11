import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrap } from "@/lib/sync/syncEngine";
import { backfillLegacyLocalStorage } from "@/lib/sync/syncEngine";
import type { BootstrapResult } from "@/lib/api/patientDataApi";

/** Bootstraps the patient session on mount and on auth-state changes. */
export function usePatientBootstrap() {
  const [state, setState] = useState<BootstrapResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const ctx = await bootstrap();
        if (cancelled) return;
        setState(ctx);
        // Best-effort backfill; failures must not block the UI.
        void backfillLegacyLocalStorage(ctx).catch((e) =>
          console.warn("[usePatientBootstrap] backfill failed", e),
        );
      } catch (e: any) {
        console.error("[usePatientBootstrap] failed", e);
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
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
