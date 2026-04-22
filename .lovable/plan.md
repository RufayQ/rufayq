

## Validation: 3-Article SEO Cluster Strategy

**Verdict: Strategy is excellent and ready to execute.** Your current infrastructure (admin News editor + `/news` + `/ar/news` routes + bilingual markdown parsing) already handles 80% of what's required. Three gaps must be closed for the cluster to deliver the projected SEO results.

---

### What's already working ✅
- Sectionized admin: `AdminNews.tsx` already supports per-article create / edit / delete / reorder + EN+AR side-by-side.
- Bilingual public archive at `/news` and `/ar/news` with detail pages at `/news/:slug`.
- Article 1 ("Medical Tourism for Saudi Patients 2026") is already published.

### Gaps vs. the SEO masterplan ❌
1. **No per-article SEO metadata** — strategy requires unique meta title, meta description, slug override, primary keyword, author, reading time, publish date per article. Current parser auto-generates slug from `##` heading and uses a single shared description.
2. **No internal cross-linking system** — strategy depends on bidirectional links between Articles 1 ↔ 2 ↔ 3 with specific anchor text. Current markdown supports `[text](/news/slug)` but admin has no helper / link picker, and there's no reliable way to keep slugs stable when titles change.
3. **No SEO scaffolding on detail pages** — missing per-article JSON-LD `Article` schema, canonical URL, Open Graph tags, hreflang EN↔AR pair, breadcrumbs, reading time, and `/sitemap.xml` entries. Without these, rankings won't materialize as projected.
4. **Article 2 & 3 not yet published.**

---

## Plan

### 1. Upgrade article data model (admin + public)
Extend each article block with a YAML-style frontmatter header inside the same markdown blob (no DB migration needed):

```text
## Why Medical Document Translation Fails Patients
<!--meta
slug: medical-document-translation-ai-scanning
description: Learn why standard medical translation fails Saudi patients...
author: Dr. Abdelrahman Morsy
publishedAt: 2026-04-25
readingTime: 15
keywords: medical document translation, AI scanning
-->

Article body in markdown...
```

- Update `parseArticles` in `News.tsx` and `parseBlocks` in `AdminNews.tsx` to read/write the `<!--meta ... -->` block.
- Slug becomes **stable** (admin-controlled), so cross-links never break when a title is reworded.

### 2. Admin News editor upgrades (`AdminNews.tsx`)
- Add a structured metadata panel above the markdown body: Slug, Meta Description (EN/AR), Author, Published Date, Reading Time, Primary Keyword.
- Add an **"Insert internal link"** dropdown that lists every other article's slug — one click inserts `[anchor text](/news/<slug>)`.
- Add a **slug uniqueness check** + warning when two articles share a slug.
- Add a "Duplicate article" action to speed up creating Article 2 & 3 from Article 1's structure.

### 3. SEO scaffolding on `/news` and `/news/:slug`
- Per-article `<SeoLazy>` driven by the new metadata: unique title, description, canonical (`https://rufayq.com/news/<slug>`), `og:type=article`, `og:locale`, hreflang pair to the AR mirror.
- Inject JSON-LD `Article` schema (headline, author, datePublished, dateModified, inLanguage, image).
- Add breadcrumbs (`Home → News → Article`) both visually and as `BreadcrumbList` JSON-LD.
- Render reading time and author byline on the detail page.
- Update `public/sitemap.xml` to dynamically include each article's EN + AR URL with `<xhtml:link rel="alternate" hreflang="…">`. (Generated at build time from the same `landing-news` row via a small Vite plugin.)

### 4. Publish Articles 2 & 3
- Use the new admin to create both articles with the metadata panel.
- Wire the 6 cross-links per the masterplan (Article 1 → 2 & 3, Article 2 → 1 & 3, Article 3 → 1 & 2) using exact anchor texts from the strategy doc.
- Add a CTA block (existing pattern) at the bottom of each article pointing to the relevant RufayQ feature (journey / scanner / care hub).

### 5. Indexing & monitoring (manual, after publish)
- Submit updated `sitemap.xml` to Google Search Console.
- Verify each article via the URL Inspection tool.
- Track rankings at Week 2, 4, 8, 12 against targets in the strategy doc.

---

## Technical notes
- All changes are client-side + the existing `site_pages.body_md` / `body_md_ar` columns — no schema migration needed.
- Backwards compatible: articles without a `<!--meta-->` block fall back to today's behavior (auto slug from heading).
- Sitemap generation runs in `vite.config.ts` `buildStart` against the public Supabase row, so every deploy ships fresh URLs.

---

## What you should do next
1. **Approve this plan** so I can switch to default mode and implement steps 1–3 (the editor + SEO infra).
2. After step 3 ships, **paste Article 2 then Article 3** into the upgraded admin (I'll pre-fill the metadata using your strategy docs so it's a 5-minute job each).
3. Publish, then submit the new sitemap to Google Search Console.

