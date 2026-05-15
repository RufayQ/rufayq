/**
 * useAuthUserId — returns the current Supabase auth user id (or null for guests).
 * Subscribes to onAuthStateChange so it stays current across sign-in / sign-out.
 *
 * Kept tiny on purpose: callers that need full user metadata can hit
 * supabase.auth.getUser() directly.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAuthUserId = (): string | null => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Initial read
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id ?? null);
    });

    // Listen for changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return userId;
};
