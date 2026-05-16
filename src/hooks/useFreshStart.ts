/**
 * useFreshStart — detects if the currently signed-in account is a brand-new
 * registration that should see an empty app (no demo trips / meds / appts) +
 * the guided tour.
 *
 * Two ways an account becomes "fresh":
 *  1. LoginScreen calls `markUserFresh(userId)` right after the OTP signup
 *     completes — the localStorage flag is the strongest signal.
 *  2. Auto-detection: on any sign-in we look at the linked profile row. If it
 *     was created in the last 24h AND the tour hasn't been marked done yet,
 *     we treat the account as fresh. This catches users who signed up on one
 *     device and signed in on another, or who closed the app before the tour
 *     finished.
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
const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

export const markUserFresh = (userId: string) => {
  try {
    console.log(`[TourDebug] Marking user ${userId} as fresh`);
    localStorage.setItem(FRESH_PREFIX + userId, "1");
    localStorage.removeItem(TOUR_PREFIX + userId);
    window.dispatchEvent(new CustomEvent("rufayq:fresh-user", { detail: { userId } }));
  } catch { /* noop */ }
};

/**
 * Decide whether to surface the welcome tour on a returning session.
 *
 * Strict rule (since the user can replay the tour from Settings):
 *   The tour is shown ONLY when `markUserFresh()` has set the explicit
 *   localStorage flag — i.e. immediately after the signup/OTP flow on this
 *   device. We no longer re-detect "fresh" from profile age, which used to
 *   re-trigger the tour on every login during the first 24h after signup.
 *
 * If the flag isn't there, the user is treated as returning and the tour
 * stays dormant until they manually replay it from Settings.
 */
const detectFreshFromProfile = async (userId: string): Promise<boolean> => {
  const tourDone = localStorage.getItem(TOUR_PREFIX + userId) === "1";
  if (tourDone) return false;
  return localStorage.getItem(FRESH_PREFIX + userId) === "1";
};

export const useFreshStart = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isFresh, setIsFresh] = useState(false);
  const [tourPending, setTourPending] = useState(false);

  useEffect(() => {
    let mounted = true;

    const evaluate = async (uid: string | null) => {
      if (!uid) {
        if (!mounted) return;
        setUserId(null);
        setIsFresh(false);
        setTourPending(false);
        return;
      }
      // Sync read from localStorage first (instant render)
      let fresh = localStorage.getItem(FRESH_PREFIX + uid) === "1";
      const tourDone = localStorage.getItem(TOUR_PREFIX + uid) === "1";
      if (mounted) {
        setUserId(uid);
        setIsFresh(fresh);
        setTourPending(fresh && !tourDone);
      }
      // Then async profile-age check (catches cross-device sign-ins)
      if (!fresh && !tourDone) {
        const auto = await detectFreshFromProfile(uid);
        if (auto && mounted) {
          setIsFresh(true);
          setTourPending(true);
        }
      }
    };

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      evaluate(session?.user?.id || null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      evaluate(session?.user?.id || null);
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
    try {
      localStorage.setItem(TOUR_PREFIX + userId, "1");
      // Clear the "fresh" flag too — once the tour is done, this account is
      // returning. The user can still replay the tour from Settings.
      localStorage.removeItem(FRESH_PREFIX + userId);
    } catch { /* noop */ }
    setIsFresh(false);
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
