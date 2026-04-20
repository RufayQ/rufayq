import { useTrial } from "./useTrial";
import { toast } from "sonner";

/**
 * Phase 2 — Trial gating.
 * Wraps any write action. If the 14-day trial is expired (and no subscription),
 * blocks the action and shows a bilingual toast directing the user to /pricing.
 */
export function useTrialGate() {
  const trial = useTrial();
  const locked = trial.hasTrial && !trial.isActive;

  const gate = (action: () => void | Promise<void>) => {
    if (locked) {
      toast.error("Trial expired · انتهت الفترة التجريبية", {
        description: "Subscribe to continue · اشترك للاستمرار",
        action: { label: "Pricing", onClick: () => (window.location.hash = "#/pricing") },
      });
      return false;
    }
    void action();
    return true;
  };

  return { ...trial, locked, gate };
}
