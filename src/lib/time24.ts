/**
 * 24-hour time helpers.
 *
 * The scanner UI, the manual entry form, and the Journey timeline all store
 * times as `HH:mm` strings. AM/PM input — whether typed by the user or
 * extracted by OCR — flows through `normalizeTo24Hour` first.
 */

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Convert "9:10 AM", "04:40 PM", "0910" → "09:10" / "16:40". Returns "" for unparseable. */
export function normalizeTo24Hour(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input).trim().toUpperCase();
  if (!s) return "";

  // Strip seconds if present: "16:40:00" → "16:40"
  s = s.replace(/^(\d{1,2}:\d{2}):\d{2}(.*)$/, "$1$2");

  if (HHMM_RE.test(s)) return s;

  // Compact "0910" / "1640"
  const compact = s.match(/^(\d{1,2})(\d{2})$/);
  if (compact) {
    const h = Number(compact[1]);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:${compact[2]}`;
  }

  // 12-hour with AM/PM
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|A\.M\.|P\.M\.)$/);
  if (m12) {
    let h = Number(m12[1]);
    const min = m12[2];
    const period = m12[3].replace(/\./g, "");
    if (period === "AM" && h === 12) h = 0;
    if (period === "PM" && h < 12) h += 12;
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:${min}`;
  }

  // ISO datetime → take time portion
  if (s.includes("T")) {
    const t = s.split("T")[1]?.slice(0, 5);
    if (t && HHMM_RE.test(t)) return t;
  }

  return "";
}

/** True when value is a well-formed HH:mm 24-hour string. */
export const isHHmm = (s: string | null | undefined): boolean =>
  !!s && HHMM_RE.test(s);

/** Pull "HH:mm" out of a JS Date in local time. */
export const formatHHmm = (d: Date): string =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
