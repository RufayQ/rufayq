
## Stabilize homepage SEO/performance so app changes stop hurting marketing pages

### What is happening now
The homepage is still coupled to runtime app behavior in a few ways, which is why unrelated app work can move FCP/LCP:
- The static hero in `index.html` and the React-rendered hero in `src/pages/Landing.tsx` do not match exactly, so the first paint is being replaced after JS loads instead of staying stable.
- Marketing pages still inherit shared client boot/runtime work from `src/App.tsx`, `src/main.tsx`, and `src/contexts/LanguageContext.tsx`.
- The homepage starts in one state from raw HTML, then JS can switch language/render mode (`data-lang="both"`), which changes layout and text after first paint.
- `LandingBelow.tsx` still pulls `lucide-react` and interactive review widgets into the marketing experience, even though they are below the fold.
- SEO tags are split between `index.html` and `src/seo/Seo.tsx`, increasing head churn and making the route render heavier than necessary.

## Implementation plan

### 1. Fully isolate the marketing homepage from app runtime drift
Update `src/App.tsx` and related routing so `/` and `/ar` stay on the lightest possible route tree and never mount app-only concerns.
- Keep the landing route outside `AppShell`
- Ensure no app providers, query state, toasts, auth UI, or patient-shell code can load on homepage render
- Keep marketing routes independent from `/app`, `/admin`, `/provider`, and auth flows

### 2. Make the first paint and hydrated paint identical
Align `index.html` and `src/pages/Landing.tsx` so React hydrates cleanly instead of visually replacing the hero.
- Match hero copy, bilingual mode, CTA targets, and structure exactly
- Match the language mode the landing page actually renders with on first load
- Prevent post-hydration text/layout swaps caused by `LanguageContext`
- Keep the server-like shell as the stable LCP element

This is the biggest reason app changes should stop affecting homepage metrics.

### 3. Stop marketing pages from defaulting to “both” language on load
Refine `src/contexts/LanguageContext.tsx` and `src/seo/useSyncLanguageWithRoute.ts` so marketing routes use route-defined language immediately:
- `/` loads as English
- `/ar` loads as Arabic
- bilingual toggle remains available only after first stable paint
- no initial “both” mode on the landing page unless explicitly chosen later

That removes avoidable extra text/layout work from the hero.

### 4. Reduce below-the-fold homepage JS
Refactor `src/pages/LandingBelow.tsx`, `src/components/ApprovedReviews.tsx`, and `src/components/ReviewForm.tsx` to keep below-the-fold content cheap:
- Replace landing-only `lucide-react` usage with the existing inline icon pattern used in `HeroIcons.tsx`
- Keep reviews/forms off the critical path and load them only when truly needed
- Avoid immediate data-fetching widgets during landing render unless the section is reached
- Preserve content/SEO value while making the landing bundle more static

### 5. Simplify head management for the homepage
Clean up `index.html` and `src/seo/Seo.tsx` so homepage metadata is stable and not duplicated unnecessarily.
- Keep essential fallback metadata in `index.html`
- Let route-level SEO override only what is needed
- Remove duplicate or conflicting homepage tags that cause head mutations during hydration
- Keep structured data, canonical, hreflang, and OG intact

### 6. Defer non-essential third-party work
Trim early blocking caused by analytics on the homepage.
- Delay the GA init/config until after first paint or idle time
- Keep pageview tracking, but do not let it compete with render-critical work
- Retain SEO-safe metadata while reducing main-thread and network noise

### 7. Keep performance fixes local to marketing pages
Create a clear boundary so future feature work in the patient app cannot regress the website again.
- Treat `Landing.tsx`, `LandingBelow.tsx`, `index.html`, and SEO files as a separate marketing surface
- Reuse lightweight components there only
- Avoid importing broad app dependencies into marketing routes

## Files likely to change
```text
index.html
src/App.tsx
src/main.tsx
src/contexts/LanguageContext.tsx
src/seo/useSyncLanguageWithRoute.ts
src/seo/Seo.tsx
src/pages/Landing.tsx
src/pages/LandingBelow.tsx
src/components/ApprovedReviews.tsx
src/components/ReviewForm.tsx
src/components/LanguageSwitcher.tsx
src/components/HeroIcons.tsx
vite.config.ts
```

## Expected outcome
- Homepage becomes stable again and largely insulated from app feature changes
- FCP/LCP improve because the first painted hero no longer gets replaced after JS loads
- Marketing routes stay lightweight while `/app` can continue evolving independently
- SEO remains intact while performance returns closer to the earlier high-water mark

## Validation after implementation
- Recheck homepage on the published/custom-domain build, not the preview/dev runtime
- Confirm no layout/text swap between initial HTML and hydrated React
- Confirm route language is correct on `/` and `/ar`
- Re-measure FCP/LCP and compare against the current 3.5s / 4.3s baseline
- Confirm canonical, hreflang, OG, and JSON-LD are still present on the final page
