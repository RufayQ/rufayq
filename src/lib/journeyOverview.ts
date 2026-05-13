// Pure helpers for trip-day / progress math used by useJourneyOverview.
// Kept dependency-free so they're easy to unit-test.

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Robust ISO + locale date parser. Returns a Date at UTC midnight, or null.
 * Accepts:
 *  - "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm[:ss][Z]"
 *  - "MMM D" / "MMM D, YYYY" / "D MMM YYYY"
 *  - "DD/MM/YYYY" / "DD-MM-YYYY"
 * Avoids `new Date(string)` direct parsing (browser-inconsistent).
 */
export function parseDate(input?: string | null): Date | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s || s.toLowerCase() === "today") {
    const t = new Date();
    return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
  }

  // ISO with optional time
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (iso) {
    const y = +iso[1], m = +iso[2] - 1, d = +iso[3];
    if (m >= 0 && m < 12 && d >= 1 && d <= 31) {
      return new Date(Date.UTC(y, m, d));
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const d = +dmy[1], m = +dmy[2] - 1;
    let y = +dmy[3];
    if (y < 100) y += 2000;
    if (m >= 0 && m < 12 && d >= 1 && d <= 31) {
      return new Date(Date.UTC(y, m, d));
    }
  }

  // "MMM D[, YYYY]" or "D MMM[ YYYY]"
  const mdy = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/);
  if (mdy) {
    const m = MONTHS[mdy[1].toLowerCase()];
    const d = +mdy[2];
    const y = mdy[3] ? +mdy[3] : new Date().getFullYear();
    if (m != null) return new Date(Date.UTC(y, m, d));
  }
  const dmy2 = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?$/);
  if (dmy2) {
    const d = +dmy2[1];
    const m = MONTHS[dmy2[2].toLowerCase()];
    const y = dmy2[3] ? +dmy2[3] : new Date().getFullYear();
    if (m != null) return new Date(Date.UTC(y, m, d));
  }

  return null;
}

export function daysBetween(a?: string | null, b?: string | null): number | null {
  const d1 = parseDate(a);
  const d2 = parseDate(b);
  if (!d1 || !d2) return null;
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

export function formatDate(input?: string | null): string {
  if (!input) return "TBD";
  const d = parseDate(input);
  if (!d) return String(input);
  return d.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

/** Compact uppercase chip date e.g. "27 MAY". */
export function formatChipDate(input?: string | null): string {
  if (!input) return "";
  const d = parseDate(input);
  if (!d) return "";
  return d
    .toLocaleDateString("en-GB", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
    })
    .toUpperCase();
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
