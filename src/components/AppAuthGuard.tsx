/**
 * AppAuthGuard
 * ────────────
 * Soft auth guard for /app and /ar/app.
 *
 * Logic:
 *   1. URL has ?signin=1            → render children (inline traveler sign-in).
 *   2. localStorage rufayq_guest_ok → render children (guest mode).
 *   3. Active Supabase session      → render children.
 *   4. Otherwise                    → redirect to /auth?returnTo=<current path+search>.
 *
 * Reacts to auth state changes so sign-out triggers the redirect, and
 * sign-in (e.g. on /app?signin=1) clears the gate without a flash.
 */
import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Status = "checking" | "allow" | "redirecting";

interface Props {
  children: ReactNode;
}

const AppAuthGuard = ({ children }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const forceSignIn = searchParams.get("signin") === "1";
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    const guestOk = (() => {
      try { return !!localStorage.getItem("rufayq_guest_ok"); } catch { return false; }
    })();

    const evaluate = (hasSession: boolean) => {
      if (cancelled) return;
      if (forceSignIn || guestOk || hasSession) {
        setStatus("allow");
        return;
      }
      setStatus("redirecting");
      const dest = `${location.pathname}${location.search}`;
      navigate(`/auth?returnTo=${encodeURIComponent(dest)}`, { replace: true });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      evaluate(!!session?.user);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(!!session?.user);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSignIn, location.pathname, location.search]);

  if (status === "allow") return <>{children}</>;
  return null;
};

export default AppAuthGuard;
