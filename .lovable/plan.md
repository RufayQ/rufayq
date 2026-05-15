## Scope

Phase 1 only — pure code fixes targeting Lighthouse Perf 82→90+ and A11y 95→100. SEO is already 100; Phase 2 (CMS publishing, MedicalWebPage schema, agent route pages, billing) is out of scope and will be handled in separate prompts.

Files touched: `index.html`, `src/index.css`, `src/pages/Landing.tsx`, `src/pages/LandingBelow.tsx`, `src/pages/About.tsx`, `src/pages/Pricing.tsx`, `public/llms.txt`. No behavior changes, no new dependencies.

## Edits

### 1. LCP font path (`index.html`)

a. Add preload alongside existing DM Sans preload (after line 53):
   ```html
   <link rel="preload" href="/fonts/cormorant-latin-2fed1d1b.woff2" as="font" type="font/woff2" crossorigin />
   ```

b. Append two `@font-face` rules to the inlined `<style>` block (after the DM Sans 700 face, line 58) — Cormorant Garamond 300 and 400, latin subset, mirroring fonts.css's `unicode-range`. The hero `<h1>` then resolves Cormorant in the same waterfall as DM Sans, eliminating the swap that delays LCP.

c. Remove the `<noscript>` fallback line:
   ```html
   <noscript><link rel="stylesheet" href="/fonts/fonts.css" /></noscript>
   ```
   The `media="print" onload="..."` link above still loads heavier weights (Cormorant 600/700, Naskh) for JS users; non-JS visitors get the system fallback in the inline body style.

Expected: LCP 3.8 s → < 3.0 s, render-blocking saving ~160 ms + swap eliminated ~600 ms.

### 2. Agent-tile contrast (`src/index.css`, lines 52–57)

Replace the six agent tokens with brighter values that hit WCAG AA against `#0B1A28`:

```
--color-medai:     #4FB8C9;   /* was #004D5B */
--color-shopai:    #B89BFF;   /* was #7B4FBF */
--color-tourai:    #5BC07F;   /* was #1A6B3C */
--color-tasteai:   #FF8A5C;   /* was #C44B1A */
--color-exploreai: #5FA8FF;   /* was #0C5FA8 */
--color-planai:    #E6B756;   /* was #8B6914 */
```

These tokens are only used by the six agent cards in `LandingBelow.tsx` (verified by ripgrep) — no light-surface usages exist elsewhere, so no `-dark` variant is needed.

### 3. Static-shell title/description (`index.html`, lines 29 + 31)

Align with runtime `<SeoLazy>` to stop Google rewriting the title:

```html
<title>RufayQ — Your AI Companion for Every Journey</title>
<meta name="description" content="Bilingual EN/AR AI companion for patients traveling abroad — medical, cultural & beyond." />
```

Update `og:title`, `twitter:title`, and the SSG hero `<h1>` text to match.

### 4. Agent cards — fix broken links + mobile UX (`src/pages/LandingBelow.tsx`)

- Change `href={`/agents/${a.id}`}` → `href="#agents"` until those routes exist.
- Add `aria-label={isAr ? \`${a.ar} — اعرف أكثر\` : \`${a.en} — learn more\`}` to each `<a>`.
- Container: keep `grid` at `md:` and up. On mobile use a horizontal snap rail:
  ```
  flex md:grid overflow-x-auto md:overflow-visible snap-x snap-mandatory gap-4 -mx-6 px-6 md:mx-0 md:px-0 md:grid-cols-3 lg:grid-cols-6
  ```
  Each card adds `min-w-[200px] md:min-w-0 snap-start shrink-0 md:shrink`.

### 5. Pricing nav anchor (`src/pages/Landing.tsx`, line 84)

Change `{ en: "Pricing", ar: "الأسعار", href: "/pricing", isRoute: true }` → `{ en: "Pricing", ar: "الأسعار", href: "#pricing" }`. The `/pricing` route still exists for direct visits and is reached from elsewhere.

### 6. Public copy alignment (limited)

- `src/pages/About.tsx` line 12: "AI medical companion" → "AI companion".
- `public/llms.txt`: replace standalone "medical companion" mentions in marketing prose with "AI companion" (leave technical/medical-records terminology intact).
- Do NOT touch `docs/`, in-app screen copy, or the Lovable Cloud-managed disclaimers.

### 7. Pricing CTAs for unbillable tiers (`src/pages/Pricing.tsx`)

For the "Journey Companion" and "Full Companion" plans only: change the CTA label and behavior to a `Contact us →` link that scrolls to `#contact` on the landing page (`/#contact` or `/ar/#contact`). Leave Free Trial and Basic tiers untouched.

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` — clean.
- Reload `/` — confirm hero `<h1>` paints in Cormorant immediately (no glyph swap), agent tiles brighter, mobile shows horizontal snap rail, nav "Pricing" smooth-scrolls, agent cards no longer 404.
- Re-run Lighthouse on `/` — expect Perf ≥ 90, A11y = 100, SEO = 100, Best Practices = 100.

## Out of scope (Phase 2 — separate prompts)

Articles 2 & 3 publish + cross-links, MedicalWebPage/E-E-A-T schema, `/agents/*` route pages, expanded `llms.txt` 6-agent description, sourcing the Beyond Medicine stats, billing-backend extension. Cache TTL on fonts is host-level and not addressable in app code.
