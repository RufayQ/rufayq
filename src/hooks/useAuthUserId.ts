/**
 * Auth session hooks.
 *
 * `useAuthSession` returns `{ userId, isReady }`. `isReady` flips true once
 * Supabase has finished restoring the session from storage — callers should
 * gate their first data query on `isReady` to avoid the "auth restore race"
 * where queries fire while `auth.uid()` is still null (RLS returns []).
 *
 * `useAuthUserId` is kept as a thin compatibility shim returning just the id.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AuthSession {
  userId: string | null;
  isReady: boolean;
}

export const useAuthSession = (): AuthSession => {
  const [state, setState] = useState<AuthSession>({ userId: null, isReady: false });

  useEffect(() => {
    let cancelled = false;

    // getSession reads from storage and returns quickly; that moment is the
    // earliest point at which `auth.uid()` is reliable inside the gotrue
    // network client.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState({ userId: data.session?.user?.id ?? null, isReady: true });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ userId: session?.user?.id ?? null, isReady: true });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
};

export const useAuthUserId = (): string | null => useAuthSession().userId;
