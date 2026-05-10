/**
 * Terminal field normalization.
 *
 * Airport ticket data uses many formats: "Terminal 1", "T-1", "term 2",
 * "1", "T1", "TBIT", "Terminal A", "TERMINAL-2B". This helper converts
 * common patterns to a compact canonical form ("T1", "T2B", "TBIT") so
 * the same terminal isn't stored as 5 different strings.
 *
 * Rules:
 *  - Trim + uppercase + collapse internal whitespace.
 *  - Strip the words "TERMINAL" / "TERM" and any separator (-, _, ·, .).
 *  - If the remaining token starts with a digit or single letter+digits,
 *    prefix with "T" (1 → T1, 2B → T2B, A → TA).
 *  - Multi-letter codes ("TBIT", "INTL", "DOM") are kept as-is uppercased.
 *  - Empty / nullish input → "".
 *  - Hard cap of 8 chars (anything longer → truncated, then re-normalized).
 */
const STRIP = /\b(TERMINAL|TERM)\b/g;
const SEP = /[-_·.\s]+/g;

export function normalizeTerminal(input: string | null | undefined): string {
  if (input == null) return "";
  let s = String(input).trim().toUpperCase();
  if (!s) return "";
  s = s.replace(STRIP, "").replace(SEP, "").trim();
  if (!s) return "";
  // Already canonical T-prefixed: T1, T2B
  if (/^T\d+[A-Z]?$/.test(s)) return s.slice(0, 8);
  // Bare digit(s) +/- letter: 1, 2B → T1, T2B
  if (/^\d+[A-Z]?$/.test(s)) return ("T" + s).slice(0, 8);
  // Single letter: A → TA, B → TB
  if (/^[A-Z]$/.test(s)) return "T" + s;
  // Anything else (TBIT, INTL, NORTH) — leave as compact uppercase
  return s.slice(0, 8);
}

/** True when a terminal string looks valid after normalization. */
export function isValidTerminal(s: string | null | undefined): boolean {
  const n = normalizeTerminal(s);
  return n.length > 0 && n.length <= 8;
}
