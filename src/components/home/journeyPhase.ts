// Pure helpers for deriving the current journey phase shown on Home.
// Exported separately so the phase ribbon and TodayCard agree on labels.

export type Phase = "prepare" | "travel" | "care" | "recover" | "home";

export interface PhaseMeta {
  id: Phase;
  en: string;
  ar: string;
}

export const PHASES: PhaseMeta[] = [
  { id: "prepare", en: "Prepare", ar: "التحضير" },
  { id: "travel", en: "Travel", ar: "السفر" },
  { id: "care", en: "Care", ar: "العلاج" },
  { id: "recover", en: "Recover", ar: "التعافي" },
  { id: "home", en: "Home", ar: "العودة" },
];

/**
 * Map the current trip position to one of 5 named phases.
 * - No trip => prepare
 * - On/just after departure => travel
 * - Middle of stay => care
 * - Last 25% of stay => recover
 * - On/after return => home
 */
export function derivePhase(dayN: number | null, totalDays: number | null): Phase {
  if (dayN == null || totalDays == null || totalDays <= 0) return "prepare";
  if (dayN <= 0) return "prepare";
  const ratio = dayN / totalDays;
  if (ratio <= 0.15) return "travel";
  if (ratio < 0.65) return "care";
  if (ratio < 1) return "recover";
  return "home";
}
