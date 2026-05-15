import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GoogleLinkState = {
  linked: boolean;
  email: string | null;
  identityId: string | null;
};

export type LinkedProvidersState = {
  loading: boolean;
  identityCount: number;
  google: GoogleLinkState;
  refresh: () => Promise<void>;
};

/**
 * Source of truth for linked OAuth identities is supabase.auth.getUserIdentities().
 * The profiles table is treated as a cached mirror, not authoritative.
 */
export function useLinkedProviders(): LinkedProvidersState {
  const [loading, setLoading] = useState(true);
  const [identityCount, setIdentityCount] = useState(0);
  const [google, setGoogle] = useState<GoogleLinkState>({
    linked: false,
    email: null,
    identityId: null,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error || !data?.identities) {
        setGoogle({ linked: false, email: null, identityId: null });
        setIdentityCount(0);
        return;
      }
      const identities = data.identities;
      setIdentityCount(identities.length);
      const g = identities.find((i: any) => i.provider === "google");
      if (g) {
        const email =
          (g as any).identity_data?.email ||
          (g as any).identity_data?.email_address ||
          null;
        setGoogle({ linked: true, email, identityId: g.identity_id || (g as any).id || null });
      } else {
        setGoogle({ linked: false, email: null, identityId: null });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        refresh();
      }
      if (event === "SIGNED_OUT") {
        setGoogle({ linked: false, email: null, identityId: null });
        setIdentityCount(0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { loading, identityCount, google, refresh };
}
