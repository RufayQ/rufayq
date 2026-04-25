import { useCallback, useEffect, useState } from "react";

/**
 * Per-category guest dummy-data toggles.
 *
 * Each toggle controls whether a category shows pre-populated demo data while
 * the user is in guest mode. Toggles default to ON so the demo experience
 * remains rich out of the box, and they're stored in localStorage so the
 * choice persists across guest sessions on the same device.
 *
 * Categories:
 *   - appointments  → Journey > Appointments
 *   - tickets       → Journey > Transport timeline (flights/trains)
 *   - hotels        → Journey > Stay
 *   - meds          → Medications screen
 *   - radiology     → Records > Imaging / ECG
 *   - lab           → Records > Lab Results
 */

export type GuestCategory = "appointments" | "tickets" | "hotels" | "meds" | "radiology" | "lab";

const KEY = "rufayq_guest_categories";

const DEFAULTS: Record<GuestCategory, boolean> = {
  appointments: true,
  tickets: true,
  hotels: true,
  meds: true,
  radiology: true,
  lab: true,
};

const read = (): Record<GuestCategory, boolean> => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
};

const EVT = "rufayq:guest-categories-changed";

export const useGuestCategories = () => {
  const [state, setState] = useState<Record<GuestCategory, boolean>>(() => read());

  useEffect(() => {
    const onChange = () => setState(read());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setCategory = useCallback((cat: GuestCategory, on: boolean) => {
    const next = { ...read(), [cat]: on };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
    setState(next);
    window.dispatchEvent(new CustomEvent(EVT));
  }, []);

  const resetAll = useCallback(() => {
    try { localStorage.setItem(KEY, JSON.stringify(DEFAULTS)); } catch { /* noop */ }
    setState({ ...DEFAULTS });
    window.dispatchEvent(new CustomEvent(EVT));
  }, []);

  return { categories: state, setCategory, resetAll };
};
