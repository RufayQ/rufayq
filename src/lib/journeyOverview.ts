// Pure helpers for trip-day / progress math used by useJourneyOverview.
// Kept dependency-free so they're easy to unit-test.

export function daysBetween(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const d1 = new Date(a);
  const d2 = new Date(b);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export interface ProgressInfo {
  totalDays: number | null;
  dayN: number | null;
  daysLeft: number | null;
  progressPct: number;
}

export function computeProgress(departure?: string | null, returnDate?: string | null): ProgressInfo {
  const todayIso = new Date().toISOString().slice(0, 10);
  const totalDays = daysBetween(departure, returnDate);
  const dayNRaw = daysBetween(departure, todayIso);
  const dayN = dayNRaw == null ? null : totalDays != null ? Math.min(dayNRaw, totalDays) : dayNRaw;
  const daysLeft = totalDays != null && dayN != null ? Math.max(0, totalDays - dayN) : null;
  const progressPct =
    totalDays && totalDays > 0 && dayN != null
      ? Math.max(8, Math.min(100, Math.round((dayN / totalDays) * 100)))
      : 20;
  return { totalDays, dayN, daysLeft, progressPct };
}
