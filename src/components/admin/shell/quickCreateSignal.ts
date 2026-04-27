import { useEffect } from "react";

/**
 * Lightweight "quick create" signal. The admin shell writes a string action
 * (e.g. "new") into sessionStorage when the user picks an item from the
 * "+ New" menu. Child screens consume the signal once on mount; if the
 * action is "new" they auto-open their create form/sheet.
 *
 * Usage:
 *   useQuickCreateSignal("tickets", () => setOpen(true));
 */
export const QC_KEY = (leaf: string) => `admin.${leaf}.action`;

export const consumeQuickCreate = (leaf: string): string | null => {
  try {
    const v = sessionStorage.getItem(QC_KEY(leaf));
    if (v) sessionStorage.removeItem(QC_KEY(leaf));
    return v;
  } catch { return null; }
};

export const useQuickCreateSignal = (leaf: string, onTrigger: (action: string) => void) => {
  useEffect(() => {
    const action = consumeQuickCreate(leaf);
    if (action) onTrigger(action);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaf]);
};
