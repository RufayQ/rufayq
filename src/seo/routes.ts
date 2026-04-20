/**
 * Bilingual route map — single source of truth for hreflang + sitemap.
 *
 * URL strategy (Stripe / Shopify / Airbnb pattern):
 *   - English at root (/, /pricing, /privacy, ...)
 *   - Arabic mirror at /ar/* with Latin slugs (/ar, /ar/pricing, /ar/privacy, ...)
 *   - Each pair is connected via hreflang="en-SA" + hreflang="ar-SA" + x-default → English.
 *
 * Why Latin slugs in Arabic paths: WhatsApp percent-encodes Arabic-script URLs
 * (/ar/حالات → /ar/%D8%AD...) which looks broken. GCC patients share via WhatsApp
 * constantly. SEO is unaffected — Google reads page content + hreflang, not slugs.
 */

export const SITE_ORIGIN = "https://rufayq.com";

export type RouteKind =
  | "home"
  | "pricing"
  | "enterprise"
  | "about"
  | "privacy"
  | "terms"
  | "security"
  | "providers"
  | "conditions"
  | "destinations"
  | "guides"
  | "tools"
  | "app";

export interface BilingualRoute {
  kind: RouteKind;
  /** English path (root). */
  en: string;
  /** Arabic mirror path (under /ar/). */
  ar: string;
  /** Sitemap priority 0-1. */
  priority: number;
  /** Sitemap changefreq. */
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  /** Indexable by search engines? */
  indexable: boolean;
}

export const ROUTES: BilingualRoute[] = [
  { kind: "home",        en: "/",            ar: "/ar",            priority: 1.0, changefreq: "weekly",  indexable: true },
  { kind: "pricing",     en: "/pricing",     ar: "/ar/pricing",    priority: 0.9, changefreq: "weekly",  indexable: true },
  { kind: "enterprise",  en: "/enterprise",  ar: "/ar/enterprise", priority: 0.9, changefreq: "monthly", indexable: true },
  { kind: "about",       en: "/about",       ar: "/ar/about",      priority: 0.7, changefreq: "monthly", indexable: true },
  { kind: "providers",   en: "/providers",   ar: "/ar/providers",  priority: 0.7, changefreq: "monthly", indexable: true },
  { kind: "privacy",     en: "/privacy",     ar: "/ar/privacy",    priority: 0.5, changefreq: "monthly", indexable: true },
  { kind: "terms",       en: "/terms",       ar: "/ar/terms",      priority: 0.5, changefreq: "monthly", indexable: true },
  { kind: "security",    en: "/security",    ar: "/ar/security",   priority: 0.5, changefreq: "monthly", indexable: true },
  { kind: "app",         en: "/app",         ar: "/ar/app",        priority: 0.6, changefreq: "weekly",  indexable: false },
];

/** Cornerstone content pages (Phase 1B — extend this array as content ships). */
export const CONTENT_ROUTES: BilingualRoute[] = [
  // Phase 1B will populate:
  // { kind: "conditions",   en: "/conditions/cancer-treatment-abroad",   ar: "/ar/conditions/cancer-treatment-abroad",   ... },
  // { kind: "destinations", en: "/destinations/germany-medical-treatment", ar: "/ar/destinations/germany-medical-treatment", ... },
  // { kind: "guides",       en: "/guides/medical-visa-germany-saudi-citizens", ar: "/ar/guides/medical-visa-germany-saudi-citizens", ... },
];

/** All routes (top-level + content) — used by sitemap generator. */
export const ALL_ROUTES = [...ROUTES, ...CONTENT_ROUTES];

/** Find the bilingual pair for the current pathname (returns en/ar URLs or null). */
export function findRoutePair(pathname: string): { en: string; ar: string; lang: "en" | "ar"; kind: RouteKind } | null {
  // Normalise trailing slash (treat /pricing and /pricing/ as same)
  const p = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  for (const r of ALL_ROUTES) {
    if (r.en === p) return { en: r.en, ar: r.ar, lang: "en", kind: r.kind };
    if (r.ar === p) return { en: r.en, ar: r.ar, lang: "ar", kind: r.kind };
  }
  return null;
}

/** Build absolute URL from a route path. */
export function absUrl(path: string): string {
  return `${SITE_ORIGIN}${path === "/" ? "/" : path}`;
}
