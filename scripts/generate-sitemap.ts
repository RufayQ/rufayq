/**
 * Build-time sitemap generator — runs as a Vite plugin during `vite build`.
 *
 * Fetches the `landing-news` row from Supabase (EN + AR markdown), parses
 * each `## Heading` block + its `<!--meta-->` slug, and emits a fresh
 * `public/sitemap.xml` containing the static routes from `src/seo/routes.ts`
 * PLUS one entry per article in EN and AR with hreflang alternates.
 *
 * If the fetch fails (offline build / preview), the existing sitemap is left
 * untouched so the build never breaks.
 */
import type { Plugin } from "vite";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SITE_ORIGIN = "https://rufayq.com";
const SUPABASE_URL = "https://dlzwgkdiqabapgnvufil.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsendna2RpcWFiYXBnbnZ1ZmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTg1MjUsImV4cCI6MjA5MTc3NDUyNX0.ns32s_vRZztIEAfA7lCqdIwrXoVTvDno2uifSJ_G8Jw";

interface RouteEntry {
  en: string;
  ar: string;
  priority: number;
  changefreq: string;
}

const STATIC_ROUTES: RouteEntry[] = [
  { en: "/",            ar: "/ar",            priority: 1.0, changefreq: "weekly" },
  { en: "/pricing",     ar: "/ar/pricing",    priority: 0.9, changefreq: "weekly" },
  { en: "/enterprise",  ar: "/ar/enterprise", priority: 0.9, changefreq: "monthly" },
  { en: "/about",       ar: "/ar/about",      priority: 0.7, changefreq: "monthly" },
  { en: "/providers",   ar: "/ar/providers",  priority: 0.7, changefreq: "monthly" },
  { en: "/news",        ar: "/ar/news",       priority: 0.8, changefreq: "weekly" },
  { en: "/privacy",     ar: "/ar/privacy",    priority: 0.5, changefreq: "monthly" },
  { en: "/terms",       ar: "/ar/terms",      priority: 0.5, changefreq: "monthly" },
  { en: "/security",    ar: "/ar/security",   priority: 0.5, changefreq: "monthly" },
];

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article";

interface Article { slug: string }

const parseArticleSlugs = (md: string): Article[] => {
  if (!md?.trim()) return [];
  const out: Article[] = [];
  const blocks = md.split(/^##\s+/m).slice(1);
  for (const block of blocks) {
    const titleLine = block.split("\n", 1)[0]?.trim() ?? "";
    const metaMatch = block.match(/<!--\s*meta([\s\S]*?)-->/i);
    let slug: string | undefined;
    if (metaMatch) {
      const slugLine = metaMatch[1].split("\n").find((l) => /^\s*slug\s*:/i.test(l));
      if (slugLine) slug = slugLine.split(":").slice(1).join(":").trim();
    }
    out.push({ slug: slug || slugify(titleLine) });
  }
  return out;
};

const xmlUrl = (loc: string, priority: number, changefreq: string, alternates?: Array<{ hreflang: string; href: string }>) => {
  const altLinks = alternates
    ?.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`)
    .join("\n") ?? "";
  return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
${altLinks}
  </url>`;
};

const buildSitemap = (articles: Article[]): string => {
  const urls: string[] = [];

  // Static routes (paired EN+AR)
  for (const r of STATIC_ROUTES) {
    const alts = [
      { hreflang: "en",        href: `${SITE_ORIGIN}${r.en}` },
      { hreflang: "en-SA",     href: `${SITE_ORIGIN}${r.en}` },
      { hreflang: "ar",        href: `${SITE_ORIGIN}${r.ar}` },
      { hreflang: "ar-SA",     href: `${SITE_ORIGIN}${r.ar}` },
      { hreflang: "x-default", href: `${SITE_ORIGIN}${r.en}` },
    ];
    urls.push(xmlUrl(`${SITE_ORIGIN}${r.en}`, r.priority, r.changefreq, alts));
    urls.push(xmlUrl(`${SITE_ORIGIN}${r.ar}`, r.priority, r.changefreq, alts));
  }

  // Article URLs (one EN + one AR per stable slug)
  for (const a of articles) {
    const en = `/news/${a.slug}`;
    const ar = `/ar/news/${a.slug}`;
    const alts = [
      { hreflang: "en",        href: `${SITE_ORIGIN}${en}` },
      { hreflang: "ar",        href: `${SITE_ORIGIN}${ar}` },
      { hreflang: "x-default", href: `${SITE_ORIGIN}${en}` },
    ];
    urls.push(xmlUrl(`${SITE_ORIGIN}${en}`, 0.7, "weekly", alts));
    urls.push(xmlUrl(`${SITE_ORIGIN}${ar}`, 0.7, "weekly", alts));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
};

export function sitemapPlugin(): Plugin {
  return {
    name: "rufayq-sitemap",
    apply: "build",
    async buildStart() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/site_pages?slug=eq.landing-news&select=body_md,body_md_ar`,
          { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } },
        );
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const rows = (await res.json()) as Array<{ body_md?: string; body_md_ar?: string }>;
        const row = rows[0] ?? {};
        const slugsEn = parseArticleSlugs(row.body_md ?? "");
        const slugsAr = parseArticleSlugs(row.body_md_ar ?? "");
        // Union by slug — same slug across languages is one article entry
        const seen = new Set<string>();
        const merged: Article[] = [];
        for (const a of [...slugsEn, ...slugsAr]) {
          if (seen.has(a.slug)) continue;
          seen.add(a.slug);
          merged.push(a);
        }
        const xml = buildSitemap(merged);
        const target = resolve(process.cwd(), "public/sitemap.xml");
        writeFileSync(target, xml, "utf8");
        // eslint-disable-next-line no-console
        console.log(`[sitemap] wrote ${merged.length} article URLs to public/sitemap.xml`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[sitemap] generation skipped:", (err as Error).message);
      }
    },
  };
}
