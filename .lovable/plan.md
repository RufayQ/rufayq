## Goal

Add automatic country dial-code detection for the mobile-number input on **Quick Sign-up** and **Sign-in**, with an obvious manual override so the user can always change it. The composed E.164 number stays the source of truth so backend/RLS/edge functions are unaffected.

## UX

```text
┌─────────────────────────────────────────────┐
│ Mobile number                               │
│ ┌──────────┐ ┌──────────────────────────┐   │
│ │ 🇸🇦 +966 ▾│ │ 5X XXX XXXX              │   │
│ └──────────┘ └──────────────────────────┘   │
│  Detected from your region · change anytime │
└─────────────────────────────────────────────┘
```

- Left chip shows flag + dial code, opens a searchable popover (reuses the existing nationality list pattern).
- Right field accepts the **national** number only (digits, optional leading 0 stripped on submit).
- Tiny helper line under the field: `Detected from your region · change anytime` (bilingual). Disappears once the user manually overrides.

## Auto-detection priority (offline first, no new deps)

1. **Manual override** (once user picks a country, lock it for the session — store in `localStorage` key `rufayq_dial_country`).
2. `**navigator.language` region** — e.g. `ar-SA` → `SA`, `en-AE` → `AE`. Use `Intl.Locale(navigator.language).region` with fallback parser.
3. **Timezone heuristic** — `Intl.DateTimeFormat().resolvedOptions().timeZone` mapped through a tiny `tz → ISO2` table for GCC + common corridors (Asia/Riyadh→SA, Asia/Dubai→AE, Africa/Cairo→EG, etc.).
4. **Nationality field** (Quick Sign-up only) — if user has picked a Nationality and hasn't manually overridden the dial, mirror it (same auto-sync pattern already used in `AdminCreateUser.tsx`).
5. **Default** → `SA` (+966).

No IP geolocation call (avoids new network dep, privacy, and offline failures).

## Files to add

- `**src/lib/auth/phoneCountries.ts**` — single source of truth: `{ code, name, nameAr, dial, flag }[]` (~40 entries, GCC + medical-travel corridor — same set already in `AdminCreateUser` so we can dedupe later). Exports `detectDialCountry()` implementing the priority chain above.
- `**src/components/auth/PhoneInput.tsx**` — controlled component:
  - Props: `value: string` (national digits), `onChange(value)`, `country: string`, `onCountryChange(code, { manual })`, `dir`, `style`, bilingual labels.
  - Renders flag/dial chip + popover with search input, and the national-number `<input>`.
  - Emits a derived `e164` via callback or via shared helper `composeE164(country, national)`.

## Files to edit

- `src/lib/auth/phoneEmail.ts` — add `composeE164(dialIso2: string, national: string)` and small `splitE164(e164)` helper. Keep existing `phoneToE164` for backward compat (still used by tests + edge functions).
- `src/pages/QuickSignup.tsx`:
  - Replace the single `<input value={phone}>` block with `<PhoneInput>`.
  - Track `dialCountry` (init from `detectDialCountry()`) and `phoneNational`.
  - Compute `e164 = composeE164(dialCountry, phoneNational)` for submit + password identity check.
  - When `nationality` changes inside the "Add optional details" section AND the user has not manually overridden, mirror it into `dialCountry`.
- `src/screens/LoginScreen.tsx`:
  - Replace the bare phone input (~line 330) with `<PhoneInput>`.
  - Same detection on mount; same composition for `phoneToE164` callsites at lines 102 and 232.
- `src/lib/auth/__tests__/phoneEmail.test.ts` — add cases for `composeE164` and `splitE164` (round-trip, leading-zero stripping, default fallback).

## - User to be able to link Google account to be able to use it , maintain it in user record in the database 

&nbsp;

## Out of scope

- Admin Create User (already has a country picker — left untouched).
- Backend / edge functions / RLS — the wire format remains E.164.
- Visual redesign of the form beyond the new chip + helper line.

## Verification

- `npx tsc -p tsconfig.app.json --noEmit`
- `bunx vitest run src/lib/auth src/pages/__tests__/QuickSignup.test.tsx src/screens/__tests__/LoginScreen.register-removed.test.tsx`
- Manual: load Quick Sign-up with `navigator.language=en-US` → chip shows 🇺🇸 +1; switch nationality to UAE in optional section → chip auto-flips to 🇦🇪 +971; manually pick 🇪🇬 +20 → chip stays on Egypt even after changing nationality again.