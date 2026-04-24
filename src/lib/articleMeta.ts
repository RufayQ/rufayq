/**
 * Article metadata system — stores per-article SEO data inside the markdown
 * blob using an HTML comment block, so no DB migration is needed.
 *
 * Format inside each article (right after the `## Heading` line):
 *
 *   ## Why Medical Document Translation Fails
 *   <!--meta
 *   slug: medical-document-translation-ai-scanning
 *   description: Learn why standard translation fails Saudi patients...
 *   author: Dr. Abdelrahman Morsy
 *   publishedAt: 2026-04-25
 *   readingTime: 15
 *   keywords: medical document translation, AI scanning
 *   image: /og-news-1.jpg
 *   -->
 *
 *   Article body here...
 *
 * Articles without a `<!--meta-->` block fall back to defaults (slug derived
 * from title), so existing content keeps working.
 */

export interface ArticleMeta {
  slug?: string;
  description?: string;
  author?: string;
  /**
   * Publish timestamp. Accepts either `YYYY-MM-DD` (legacy, treated as 00:00 local)
   * or full ISO `YYYY-MM-DDTHH:mm` for scheduled posts. If this value is in the
   * future, the article is considered scheduled and will not appear publicly
   * until the timestamp passes.
   */
  publishedAt?: string;
  readingTime?: number;   // minutes
  keywords?: string;      // comma-separated
  image?: string;         // path or URL
}

/**
 * Parses a `publishedAt` string into a Date. Returns null when the value is
 * empty or unparseable. Bare `YYYY-MM-DD` strings are anchored to local
 * midnight so the editor's date picker behaves predictably.
 */
export const parsePublishedAt = (value: string | undefined): Date | null => {
  const v = value?.trim();
  if (!v) return null;
  // Date-only → local midnight (avoid UTC shift surprises)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** True when the article's publish time is still in the future. */
export const isScheduled = (meta: ArticleMeta, now: Date = new Date()): boolean => {
  const dt = parsePublishedAt(meta.publishedAt);
  return dt ? dt.getTime() > now.getTime() : false;
};

export const DEFAULT_AUTHOR_EN = "RufayQ Editorial Team";
export const DEFAULT_AUTHOR_AR = "فريق تحرير رُفَيِّق";

const LEGACY_AUTHOR_ALIASES = new Set([
  "Dr. Abdelrahman Morsy",
  "د. عبدالرحمن مرسي",
  "عبدالرحمن مرسي",
  "RufayQ Editorial",
]);

export const META_FIELDS: Array<keyof ArticleMeta> = [
  "slug", "description", "author", "publishedAt", "readingTime", "keywords", "image",
];

/** Convert "Some Title 123!" → "some-title-123". */
export const slugify = (s: string): string =>
  s.toLowerCase().trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article";

export const getDefaultAuthor = (lang: "en" | "ar"): string =>
  lang === "ar" ? DEFAULT_AUTHOR_AR : DEFAULT_AUTHOR_EN;

/**
 * Normalizes stored bylines so legacy article metadata cannot surface outdated
 * authors on the public site. Blank or known legacy values fall back to the
 * localized RufayQ editorial team name.
 */
export const resolveAuthor = (author: string | undefined, lang: "en" | "ar"): string => {
  const trimmed = author?.trim();
  if (!trimmed || LEGACY_AUTHOR_ALIASES.has(trimmed)) return getDefaultAuthor(lang);
  return trimmed;
};

/** Extract `<!--meta ... -->` from a body string. Returns meta + clean body. */
export function extractMeta(body: string): { meta: ArticleMeta; body: string } {
  const m = body.match(/<!--\s*meta([\s\S]*?)-->/i);
  if (!m) return { meta: {}, body };
  const meta: ArticleMeta = {};
  m[1].split("\n").forEach((line) => {
    const kv = line.match(/^\s*([a-zA-Z]+)\s*:\s*(.+?)\s*$/);
    if (!kv) return;
    const key = kv[1] as keyof ArticleMeta;
    const value = kv[2].trim();
    if (!META_FIELDS.includes(key)) return;
    if (key === "readingTime") {
      const n = parseInt(value, 10);
      if (!Number.isNaN(n)) meta.readingTime = n;
    } else {
      (meta as Record<string, string>)[key] = value;
    }
  });
  const cleanBody = body.replace(m[0], "").replace(/^\n+/, "").trimEnd();
  return { meta, body: cleanBody };
}

/** Serialize metadata back into a `<!--meta ... -->` comment block. */
export function serializeMeta(meta: ArticleMeta): string {
  const lines = META_FIELDS
    .filter((k) => meta[k] !== undefined && meta[k] !== "" && meta[k] !== null)
    .map((k) => `${k}: ${meta[k]}`);
  if (lines.length === 0) return "";
  return `<!--meta\n${lines.join("\n")}\n-->`;
}

/** Estimate reading time at ~200 wpm. */
export function estimateReadingTime(body: string): number {
  const words = body.replace(/<!--[\s\S]*?-->/g, "").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Build canonical slug for an article: explicit meta.slug → slugify(title). */
export function resolveSlug(title: string, meta: ArticleMeta): string {
  return meta.slug?.trim() ? slugify(meta.slug) : slugify(title);
}
