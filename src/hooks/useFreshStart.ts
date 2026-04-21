/**
 * useFreshStart — detects if the currently signed-in account is a brand-new
 * registration that should see an empty app (no demo trips / meds / appts) +
 * the guided tour. Set by LoginScreen on successful sign-up; cleared by the
 * tour's "Finish" action.
 *
 * Exposes:
 *  - isFresh: true while the flag exists for this user
 *  - tourPending: true if tour hasn't been completed yet for this user
 *  - markTourDone(): clears the tour flag (keeps isFresh — empty state stays)
 *  - reset(): clears both (used on logout)
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const FRESH_PREFIX = "rufayq_fresh_";
const TOUR_PREFIX = "rufayq_tour_done_";

export const markUserFresh = (userId: string) => {
  try {
    console.log(`[TourDebug] Marking user ${userId} as fresh`);
    localStorage.setItem(FRESH_PREFIX + userId, "1");
    localStorage.removeItem(TOUR_PREFIX + userId);
    window.dispatchEvent(new CustomEvent("rufayq:fresh-user", { detail: { userId } }));
  } catch { /* noop */ }
};

export const useFreshStart = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isFresh, setIsFresh] = useState(false);
  const [tourPending, setTourPending] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) {
        const fresh = localStorage.getItem(FRESH_PREFIX + uid) === "1";
        const tourDone = localStorage.getItem(TOUR_PREFIX + uid) === "1";
        setIsFresh(fresh);
        setTourPending(fresh && !tourDone);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) {
        const fresh = localStorage.getItem(FRESH_PREFIX + uid) === "1";
        const tourDone = localStorage.getItem(TOUR_PREFIX + uid) === "1";
        setIsFresh(fresh);
        setTourPending(fresh && !tourDone);
      } else {
        setIsFresh(false);
        setTourPending(false);
      }
    });
    const onFresh = (e: Event) => {
      const uid = (e as CustomEvent<{ userId: string }>).detail?.userId;
      if (!uid) return;
      console.log(`[TourDebug] fresh-user event for ${uid}`);
      setUserId(uid);
      setIsFresh(true);
      setTourPending(true);
    };
    window.addEventListener("rufayq:fresh-user", onFresh);
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("rufayq:fresh-user", onFresh);
    };
  }, []);

  const markTourDone = useCallback(() => {
    if (!userId) return;
    try { localStorage.setItem(TOUR_PREFIX + userId, "1"); } catch { /* noop */ }
    setTourPending(false);
  }, [userId]);

  const reset = useCallback(() => {
    if (!userId) return;
    try {
      localStorage.removeItem(FRESH_PREFIX + userId);
      localStorage.removeItem(TOUR_PREFIX + userId);
    } catch { /* noop */ }
    setIsFresh(false);
    setTourPending(false);
  }, [userId]);

  return { isFresh, tourPending, markTourDone, reset };
};
