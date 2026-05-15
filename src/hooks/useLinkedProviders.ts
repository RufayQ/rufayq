import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProviderId } from "@/lib/auth/providers";

export type GoogleLinkState = {
  linked: boolean;
  email: string | null;
  identityId: string | null;
};

export type ProviderState = {
  id: ProviderId;
  linked: boolean;
  email: string | null;
  phone: string | null;
  identityId: string | null;
  linkedAt: string | null;
  scopes: string[];
};

export type LinkedProvidersState = {
  loading: boolean;
  identityCount: number;
  google: GoogleLinkState;
  providers: ProviderState[];
  refresh: () => Promise<void>;
};

const SCOPE_KEYS = ["email", "name", "picture", "phone"];

function deriveScopes(identityData: Record<string, any> | undefined): string[] {
  if (!identityData) return [];
  return SCOPE_KEYS.filter((k) => identityData[k] != null);
}

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
  const [providers, setProviders] = useState<ProviderState[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: idData, error: idErr } = await supabase.auth.getUserIdentities();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      const identities = (idErr || !idData?.identities ? [] : idData.identities) as any[];
      setIdentityCount(identities.length);

      const findIdentity = (provider: ProviderId) =>
        identities.find((i) => i.provider === provider);

      // Google
      const g = findIdentity("google");
      if (g) {
        const email = g.identity_data?.email || g.identity_data?.email_address || null;
        setGoogle({
          linked: true,
          email,
          identityId: g.identity_id || g.id || null,
        });
      } else {
        setGoogle({ linked: false, email: null, identityId: null });
      }

      const next: ProviderState[] = [];

      const buildOauth = (id: ProviderId): ProviderState => {
        const ident = findIdentity(id);
        if (!ident) {
          return {
            id,
            linked: false,
            email: null,
            phone: null,
            identityId: null,
            linkedAt: null,
            scopes: [],
          };
        }
        return {
          id,
          linked: true,
          email: ident.identity_data?.email || ident.identity_data?.email_address || null,
          phone: ident.identity_data?.phone || null,
          identityId: ident.identity_id || ident.id || null,
          linkedAt: ident.created_at || ident.last_sign_in_at || null,
          scopes: deriveScopes(ident.identity_data),
        };
      };

      next.push(buildOauth("google"));
      next.push(buildOauth("apple"));

      // Email row — primary if user has email + an "email" identity OR any email at all
      const emailIdent = findIdentity("email");
      const userEmail = user?.email || emailIdent?.identity_data?.email || null;
      next.push({
        id: "email",
        linked: !!(emailIdent || userEmail),
        email: userEmail,
        phone: null,
        identityId: emailIdent?.identity_id || emailIdent?.id || null,
        linkedAt: emailIdent?.created_at || null,
        scopes: [],
      });

      // Phone row
      const phoneIdent = findIdentity("phone");
      const userPhone = user?.phone || phoneIdent?.identity_data?.phone || null;
      next.push({
        id: "phone",
        linked: !!(phoneIdent || userPhone),
        email: null,
        phone: userPhone,
        identityId: phoneIdent?.identity_id || phoneIdent?.id || null,
        linkedAt: phoneIdent?.created_at || null,
        scopes: [],
      });

      setProviders(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "TOKEN_REFRESHED"
      ) {
        refresh();
      }
      if (event === "SIGNED_OUT") {
        setGoogle({ linked: false, email: null, identityId: null });
        setProviders([]);
        setIdentityCount(0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { loading, identityCount, google, providers, refresh };
}
