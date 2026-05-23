/**
 * useUpgradeRoute — single canonical handler for every "Upgrade" CTA in the app.
 *
 * Inside the in-app shell (Index.tsx) we dispatch a `rufayq:open-pricing`
 * window event that the shell catches to run `setAppView("pricing")`.
 * Outside the shell (public landing pages, etc.) we fall back to react-router.
 *
 * Why a hook + event instead of prop drilling:
 *   – `ManualFlightEntrySheet`, scanner steps, `useTrialGate` toasts and
 *     a dozen other surfaces all needed an `onUpgrade` callback wired down
 *     from `Index.tsx`. Half of them were either silently broken
 *     (`window.location.hash = "#/pricing"` does nothing in BrowserRouter)
 *     or missed entirely.
 *   – One hook = one source of truth; the shell wires the listener once.
 */
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const OPEN_PRICING_EVENT = "rufayq:open-pricing";

export function useUpgradeRoute() {
  const navigate = useNavigate();

  const goToPricing = useCallback(() => {
    // Tell the in-app shell to swap to the Pricing view if it's mounted.
    let handled = false;
    const ev = new CustomEvent(OPEN_PRICING_EVENT, {
      detail: { ack: () => { handled = true; } },
    });
    window.dispatchEvent(ev);

    // If no shell listener acknowledged, fall back to router navigation.
    // Defer so the shell's synchronous ack callback (if any) runs first.
    queueMicrotask(() => {
      if (!handled) {
        try { navigate("/pricing"); } catch { window.location.href = "/pricing"; }
      }
    });
  }, [navigate]);

  return { goToPricing };
}
