

## Fix EN/AR switcher to navigate URL on bilingual marketing routes

### Problem
On `/ar/news/:slug`, clicking "EN" in `LanguageSwitcher` only calls `setMode("en")`. Because the URL still starts with `/ar/news/`, `useSyncLanguageWithRoute` immediately flips the mode back to `"ar"`. The inline "Read in English" link works because it actually navigates to `/news/:slug`. The switcher must do the same.

### Fix (single file: `src/components/LanguageSwitcher.tsx`)

Make the switcher URL-aware on bilingual routes. When the user clicks **EN** or **AR**:

1. Compute the paired URL for the current `pathname`:
   - `/news/:slug` ↔ `/ar/news/:slug` (swap `/ar` prefix)
   - Marketing/content routes via `findRoutePair(pathname)` from `@/seo/routes` (returns the EN and AR mirror URLs)
2. If a pair exists and the chosen language differs from current URL language → `navigate(targetUrl)`. The existing `useSyncLanguageWithRoute` effect will then update `mode` to match the URL (single source of truth, no race).
3. If no pair (app shell `/app`, `/admin`, `/provider`, `/auth`) → fall back to current behavior: just `setMode(o.v)`.
4. **EN/AR (both)** button: never navigates — only `setMode("both")` (bilingual display works on any URL).

### Implementation sketch

```tsx
import { useLocation, useNavigate } from "react-router-dom";
import { findRoutePair } from "@/seo/routes";

const location = useLocation();
const navigate = useNavigate();

const handleClick = (target: LangMode) => {
  if (target === "both") { setMode("both"); return; }
  const path = location.pathname;
  // Dynamic news pair (not in ROUTES table)
  const isArNews = path === "/ar/news" || path.startsWith("/ar/news/");
  const isEnNews = path === "/news"   || path.startsWith("/news/");
  if (isArNews || isEnNews) {
    const pairPath = target === "ar"
      ? (isArNews ? path : "/ar" + path)
      : (isEnNews ? path : path.replace(/^\/ar/, "") || "/");
    if (pairPath !== path) { navigate(pairPath); return; }
  } else {
    const pair = findRoutePair(path);
    if (pair) {
      const targetUrl = target === "ar" ? pair.ar : pair.en;
      if (targetUrl !== path) { navigate(targetUrl); return; }
    }
  }
  setMode(target); // app shell or already on correct URL
};
```

Wire `onClick={() => handleClick(o.v)}` instead of `setMode`.

### Why this works
- Mirrors the proven inline "Read in English" link logic.
- Keeps `useSyncLanguageWithRoute` as the single authority for marketing-page language → no flip-back race.
- App-shell behavior (Patient/Provider/Admin) unchanged — those paths aren't in the route map and aren't `/news`, so the fallback `setMode` runs.

### Files touched
- `src/components/LanguageSwitcher.tsx` (only)

### Verification
- `/ar/news/medical-document-translation-ai-scanning` → click **EN** → routes to `/news/medical-document-translation-ai-scanning` and content renders in English.
- `/news/<slug>` → click **AR** → routes to `/ar/news/<slug>`.
- `/ar/pricing` → click **EN** → routes to `/pricing`.
- `/app/...` → click **AR** → no navigation, just toggles display mode (existing behavior).

