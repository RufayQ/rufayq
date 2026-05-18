## Goal

Refine the landing hero to reflect the broader rebrand ("medical & more"), make the greeting always reflect the visitor's current local time, tighten RTL typography/spacing, and move the phone mockup's milestone cards into the CMS hero block so EN/AR stay in sync and are admin-editable.

## Scope (all changes are presentation-only)

- `src/pages/Landing.tsx`
- `src/components/admin/cms/cmsTypes.ts`
- `src/components/admin/cms/SectionEditors.tsx` (Hero editor: add `mockupCards` array field)

No backend, no schema, no business logic.

---

## 1. Revert the slogan ("medical & more")

Headline defaults (used when CMS is empty) and CMS `emptyContent("hero")` defaults change to:

- **EN** — `titleLine1: "Your AI Travel Companion"`, `highlight: "& More"`
- **AR** — `titleLine1: "رفيقك الذكي للسفر"`, `highlight: "وأكثر"`
- **Eyebrow EN** — `"AI COMPANION · MEDICAL, TRAVEL & MORE"`
- **Eyebrow AR** — `"رُفَيِّق · للسفر العلاجي وأكثر"`
- **Subtitle EN** — refreshed to mention medical + travel + lifestyle (vault, journey, 24/7 AI).
- **Subtitle AR** — mirrored.

The bilingual (`isBoth`) composite line in the `<h1>` also updates so the EN headline and the Arabic companion line both read the new slogan.

## 2. RTL spacing & typography polish

Targets the greeting line in the phone mockup and the title block when `isAr || isBoth`:

- Greeting line: switch to `font-arabic` with `letter-spacing: 0`, slightly larger line-height (`leading-snug`), drop the trailing Latin `,` when Arabic, replace with `،`.
- `<h1>` in Arabic: increase `leading-[1.15]` (Naskh needs more vertical room), reduce `tracking-tight` (Arabic doesn't want negative tracking), add `mb-7` to balance the gold hairline accent.
- Subtitle Arabic block: `text-[15px] md:text-base`, `leading-[1.85]`.
- Trust badges row: in RTL, use `flex-row-reverse` so the icon sits to the right of the label, and bump `gap-x-6` for Arabic word spacing.
- Mobile mockup cards: when `isAr`, set the card row to `flex-row-reverse` and the text column to `text-right`; truncation classes already handle overflow.

## 3. Greeting reliability

`getGreeting()` already exists. Make it resilient to long-lived tabs and cached HTML:

- Keep the 60s `setInterval`.
- Add `visibilitychange` listener → recompute when the tab becomes visible again (covers laptop-sleep, tab-switch).
- Add `focus` listener → same handler, covers Safari edge cases where `visibilitychange` is throttled.
- Recompute once on mount (already done) and additionally schedule a one-shot timeout aligned to the next hour boundary so the transition (e.g. 11:59 → 12:00) is instant rather than up to 60s late.

All four hooks share a single `recompute` callback inside the existing `useEffect`.

## 4. CMS-driven mobile mockup cards (EN + AR parity)

Currently the four phone-mockup cards (`LH 770`, `Visa Companion`, `Prof. Klein`, `Chauffeur`) are hardcoded inline in `Landing.tsx`. Move them under the hero CMS block so admins edit them once per locale and the EN/AR copy stays in lockstep.

### Type changes (`cmsTypes.ts`)

Extend `HeroContent`:

```ts
export interface HeroMockupCard {
  icon?: string;     // emoji or short glyph
  title: string;
  subtitle?: string;
  accent?: "gold" | "teal";
}

export interface HeroContent {
  // ...existing fields...
  mockupCards?: HeroMockupCard[];
}
```

`emptyContent("hero")` adds the same 4 luxury medical-travel cards in `en` and `ar` so a freshly created hero block ships with parity:

```text
EN: 🛫 Business · LH 770 → Frankfurt / Boarding 22:40 · Gate A22 (teal)
AR: 🛫 أعمال · LH 770 → فرانكفورت / الصعود 22:40 · بوابة A22

EN: 🛋️ Lounge ready · Visa Companion / DXB · Concourse B (gold)
AR: 🛋️ الصالة جاهزة · رفيق فيزا / دبي · مبنى B

EN: 🩺 Prof. Klein — Cleveland Clinic / Tomorrow · 11:00 AM (teal)
AR: 🩺 البروفيسور كلاين — كليفلاند / غداً · 11:00 ص

EN: 🚘 Chauffeur to The Ritz-Carlton / On arrival · 06:20 (gold)
AR: 🚘 سائق خاص إلى ريتز كارلتون / عند الوصول · 06:20
```

### Landing.tsx

- Read `heroEn?.mockupCards` and `heroAr?.mockupCards`.
- Use `cardsEn[i]` / `cardsAr[i]` zipped to render (preserves bilingual parity even if admin edits only one locale — falls back to defaults).
- Accent maps `"gold"`/`"teal"` to the existing `GOLD`/`TEAL` constants.

### Hero editor (`SectionEditors.tsx`)

Add a "Mobile mockup cards" sub-editor under the Hero block: list of up to 4 rows, each with icon, title, subtitle, accent dropdown (gold/teal). Standard add/remove/reorder controls matching the existing badge editor pattern.

---

## Technical notes

- All colors stay sourced from the existing `GOLD`/`TEAL`/`TEXT` constants in `Landing.tsx`; no token additions needed.
- No new dependencies.
- No tests need updating (the existing landing tests assert structure, not copy).
- CMS schema is JSON-blob based (`content_en`/`content_ar` are `Record<string, unknown>`), so no migration is required — the `mockupCards` field is additive.
