/**
 * useTourSystem — orchestrates the three tour kinds (feature / element /
 * on-demand). The legacy `welcome` tour is still driven by useFreshStart +
 * TourGuide; this hook handles everything else.
 *
 * Returns:
 *  • activeTour       → tour to render right now (or null)
 *  • allowSkip        → whether the active tour can be skipped
 *  • finishActive()   → mark active tour done + close it
 *  • triggerElement(id) → call when user taps a tracked surface; opens its
 *                         element tour the first time only
 *  • startOnDemand(id) → open any tour by id (used by Help replay buttons)
 *
 * Persistence: per-user localStorage (see `lib/tours.ts`).
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TOURS, APP_VERSION, getTour,
  pendingFeatureTour, isElementTapped, markElementTapped,
  markTourDoneInStorage, clearTourDone, markVersionSeen,
  type TourConfig,
} from "@/lib/tours";

export const useTourSystem = (welcomeActive: boolean) => {
  const [uid, setUid] = useState<string | null>(null);
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null);
  const [allowSkip, setAllowSkip] = useState(true);

  // Track signed-in user
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setUid(session?.user?.id || null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUid(session?.user?.id || null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Auto-trigger feature tour after welcome completes (or for returning users)
  useEffect(() => {
    if (!uid || welcomeActive || activeTour) return;
    const next = pendingFeatureTour(uid);
    if (next) {
      setActiveTour(next);
      setAllowSkip(true);
    }
  }, [uid, welcomeActive, activeTour]);

  const finishActive = useCallback(() => {
    if (!uid || !activeTour) {
      setActiveTour(null);
      return;
    }
    markTourDoneInStorage(uid, activeTour.id);
    if (activeTour.kind === "feature" && activeTour.version) {
      markVersionSeen(uid, activeTour.version);
    }
    setActiveTour(null);
  }, [uid, activeTour]);

  const triggerElement = useCallback((elementId: string) => {
    if (!uid || activeTour) return;
    if (isElementTapped(uid, elementId)) return;
    const tour = getTour(`element_${elementId}`);
    if (!tour || tour.kind !== "element") return;
    markElementTapped(uid, elementId);
    setActiveTour(tour);
    setAllowSkip(true);
  }, [uid, activeTour]);

  const startOnDemand = useCallback((tourId: string) => {
    if (!uid) return;
    const tour = getTour(tourId);
    if (!tour || !tour.steps.length) return;
    clearTourDone(uid, tourId); // user explicitly asked → let them replay
    setActiveTour(tour);
    setAllowSkip(true);
  }, [uid]);

  return {
    activeTour,
    allowSkip,
    finishActive,
    triggerElement,
    startOnDemand,
    /** All tours that can be replayed from Help (excludes welcome which has its own button). */
    replayableTours: TOURS.filter((t) => t.steps.length > 0),
    appVersion: APP_VERSION,
  };
};
