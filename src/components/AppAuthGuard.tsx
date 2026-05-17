/**
 * AppAuthGuard
 * ────────────
 * Soft auth guard for /app, /ar/app and their subroutes.
 *
 * Allow when:
 *   1. URL has ?signin=1                      → render children (inline traveler sign-in).
 *   2. localStorage rufayq_guest_ok === "1"   → render children (guest mode).
 *   3. Active Supabase session                → render children.
 *   4. Otherwise                              → redirect to (ar)?/auth?returnTo=<safe path>.
 *
 * Reacts to Supabase auth state changes so sign-out triggers the redirect and
 * sign-in clears the gate without a flash.
 */
import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { syncGoogleLinkage } from "@/lib/auth/googleLink";
import AppStartupFallback from "@/components/AppStartupFallback";

type Status = "checking" | "allow" | "redirecting";

interface Props {
  children: ReactNode;
}

const isSafeAppPath = (p: string) =>
  p === "/app" ||
  p.startsWith("/app/") ||
  p === "/ar/app" ||
  p.startsWith("/ar/app/");

const safeReturnTo = (pathname: string, search: string) =>
  isSafeAppPath(pathname)
    ? `${pathname}${search}`
    : pathname.startsWith("/ar/")
      ? "/ar/app"
      : "/app";

const authPathFor = (pathname: string) =>
  pathname.startsWith("/ar/") ? "/ar/auth" : "/auth";

const hasGuestOk = () => {
  try {
    return localStorage.getItem("rufayq_guest_ok") === "1";
  } catch {
    return false;
  }
};

const RouteFallback = () => (
  <AppStartupFallback
    message="Checking your session…"
    messageAr="جارٍ التحقق من جلستك…"
  />
);

const AppAuthGuard = ({ children }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const forceSignIn = searchParams.get("signin") === "1";
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    const evaluate = (hasSession: boolean) => {
      if (cancelled) return;
      if (forceSignIn || hasGuestOk() || hasSession) {
        setStatus("allow");
        return;
      }
      setStatus("redirecting");
      const dest = safeReturnTo(location.pathname, location.search);
      const authPath = authPathFor(location.pathname);
      navigate(`${authPath}?returnTo=${encodeURIComponent(dest)}`, {
        replace: true,
      });
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => { evaluate(!!session?.user); if (session?.user) syncGoogleLinkage(session.user.id); })
      .catch(() => evaluate(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(!!session?.user);
      if (session?.user) syncGoogleLinkage(session.user.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSignIn, location.pathname, location.search]);

  if (status === "allow") return <>{children}</>;
  return <RouteFallback />;
};

export default AppAuthGuard;
