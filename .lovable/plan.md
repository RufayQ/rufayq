# Connected Accounts — confirmation, prominence, auto-refresh, multi-provider, all roles

Builds on the existing `ConnectedAccountsCard` + `useLinkedProviders` (in patient `ProfileScreen`). All four asks:

## 1. Confirmation modal before unlinking

- New `src/components/profile/UnlinkConfirmDialog.tsx`: lightweight modal (no UI lib — fixed overlay + centered card, matches existing sheet styling), bilingual title/body, shows the provider name + masked email being unlinked, and the consequence ("You'll need another sign-in method to access this account").
- `Cancel · إلغاء` / `Unlink · فصل` buttons; destructive button is the red outline already used for Sign Out.
- Card opens this modal instead of unlinking directly. Modal calls back into the same `unlinkIdentity` flow already in the card.
- Identity-count guard ("only sign-in method") is checked before opening the modal so we don't show a confirm the user can't fulfil.

## 2. More prominent linked-account display

Redesign the Google row (and every other provider row) into a two-line block:

```text
[ G ]  Google · linked                     [ Unlink ]
       sara.alrashidi@gmail.com
       Connected Mar 2026 · sign-in + email
```

- Line 1: provider name + `Linked` pill (teal) or `Not connected` (gray).
- Line 2 (when linked): full email in a slightly larger, navy, mono-leaning style; LTR-locked even in RTL layout.
- Line 3 (when linked): "Connected {Mon YYYY}" from `google_linked_at` (read from the profile row when present, falling back to "Recently") plus the scopes the identity grants ("sign-in", "email", "profile" — derived from `identity_data` keys).
- Tap-to-copy on the email with the existing bilingual toast pattern (`copyToClipboard`).
- Card header rewritten as "Connected sign-in methods · طرق تسجيل الدخول المرتبطة" with a one-line helper underneath.

## 3. Auto-refresh after OAuth redirect

`useLinkedProviders` already refreshes on `SIGNED_IN` / `USER_UPDATED` / `TOKEN_REFRESHED`. To make the user-visible state snap immediately when Profile re-opens via `?profile=1`:

- In `ConnectedAccountsCard`, add a `useEffect` that:
  - Reads `?profile=1` on mount and, when present, calls `refresh()` once and then `getSession()` to force a token refresh round-trip.
  - Subscribes to `window` `focus` and `visibilitychange` events; on either, calls `refresh()` (covers the case where the OAuth tab returned focus before Supabase fired its event).
- Add a 4-second `setInterval` poll that auto-stops after 3 ticks or the first state change — short window only when the URL had `?profile=1` — to catch the rare case where Supabase's identity propagation lags the redirect.
- The query-param strip in `Index.tsx` stays (already implemented), so subsequent navigation isn't affected.

## 4. Multi-provider section, available to both Travellers and Providers

Generalise the card to render every supported sign-in method, not just Google.

- New `src/lib/auth/providers.ts` declares the catalogue:
  ```text
  google   — connect & unlink supported (lovable.auth + supabase.auth.linkIdentity)
  apple    — connect & unlink supported (only shown when the lovable runtime exposes apple)
  email    — read-only row showing the user's email, "Primary sign-in" badge
  phone    — read-only row showing masked E.164 phone, "Primary sign-in" badge
  ```
  Each entry: id, label EN/AR, glyph component, `canConnect`, `canUnlink`.
- `useLinkedProviders` extended to return a normalised array `providers: ProviderState[]` derived from `getUserIdentities()` (`provider`, `identity_data.email`, `last_sign_in_at`, `created_at`). Existing `google` shortcut kept for back-compat.
- `ConnectedAccountsCard` iterates `providers`, renders the prominent block from §2, gates Connect/Unlink based on `canConnect/canUnlink`, and reuses the confirm modal from §1.
- Apple connect uses `supabase.auth.linkIdentity({ provider: 'apple', ... })`. If Supabase rejects with "provider not enabled", the toast says "Apple sign-in isn't enabled yet · لم يُفعَّل تسجيل الدخول عبر Apple" and the row stays in connect state — no crash, no silent failure.
- Email/phone rows are informational: show the value, no Connect button (already part of the account).

### Make it available to Providers

- Patient app: card already in `ProfileScreen`. No change.
- Provider shell (`src/pages/ProviderDashboard.tsx`): currently has no profile screen. Add a new top-bar avatar/menu button that opens a slide-over panel `src/components/provider/ProviderAccountPanel.tsx` containing:
  - Display name + organisation
  - `<ConnectedAccountsCard />` (the same component)
  - Sign-out button (reusing the existing `logout` handler)
  This is the smallest non-disruptive surface — no new route, no nav rewrite.
- Admin shell (`src/pages/Admin.tsx`): inject `<ConnectedAccountsCard />` into the existing **Settings → General** tab (`AdminSettingsGeneral`), under a new "My account" subsection. Admin users land here from the existing settings nav; no new menu entries.

## Files

- New `src/components/profile/UnlinkConfirmDialog.tsx`
- New `src/lib/auth/providers.ts`
- New `src/components/provider/ProviderAccountPanel.tsx`
- Edit `src/components/profile/ConnectedAccountsCard.tsx` — multi-provider rendering, prominence, confirm flow, focus/visibility/?profile=1 refresh
- Edit `src/hooks/useLinkedProviders.ts` — return `providers[]`, expose `linkedAt` per provider; keep current `google` field
- Edit `src/lib/auth/googleLink.ts` — already has `clearGoogleLinkage`; add a generic `clearProviderLinkage(userId, provider)` for parity (used by Apple unlink)
- Edit `src/pages/ProviderDashboard.tsx` — add account button + panel mount
- Edit `src/components/admin/AdminSettingsGeneral.tsx` — add "My account" block hosting the card

## Out of scope

- No new database migrations (existing `profiles.google_*` columns are sufficient; Apple linkage is read directly from `getUserIdentities()` and not mirrored).
- No backend Supabase auth-config changes; if Apple isn't enabled in the project, the row degrades gracefully.
- No changes to QuickSignup / LoginScreen / PhoneInput.

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` → 0 errors.
- `bunx vitest run` → 443 still pass; add tests for `useLinkedProviders.providers[]` shape and for the confirm-dialog open/cancel/confirm path with mocked `supabase.auth`.
- Manual: phone+password user → Profile → tap **Connect Google** → return → row auto-flips to Linked with email + connection date visible. Tap **Unlink** → confirm modal appears → Cancel keeps state → Confirm unlinks and toasts. Sign in as a provider → top-bar avatar → same card behaves identically. Admin Settings → General → "My account" → same card.
