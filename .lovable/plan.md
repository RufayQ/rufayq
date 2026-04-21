

## Fix Pricing, Admin Activation Worklist, and Provider Login

Three targeted fixes — no schema changes, no new dependencies.

### 1. Pricing page — kill the React ref warning + small polish

**Issue:** Console warns `Function components cannot be given refs… Check the render method of Pricing.` Triggered because `CurrencySwitcher` is a plain function component placed inside a `<p>` (line 145) and inside a flex `<div>` (line 122). React 18 attaches a ref via the parent slot system; without `forwardRef`, this prints a noisy dev warning on every render.

**Fix:** Convert `CurrencySwitcher` to use `React.forwardRef` and forward the ref to the trigger `<button>`. No behavioural change, warning disappears.

Also: the inline `<CurrencySwitcher variant="inline" />` is rendered inside a `<p>` element, but it renders a `<button>` — invalid HTML (block-in-paragraph in some browsers). Change the wrapper from `<p>` to `<span>` / `<div>` to silence hydration noise.

### 2. Admin → User Activations — fix OTP recipient mismatch + visibility

**Issue:** When a user clicks "Get a code from admin" on the OTP screen, they see something like `+966569590418`. The verification-assist row stores `recipient` as whatever the user typed, but `consume_manual_otp(_recipient, _code)` in the DB matches an EXACT string. Admins were getting fresh codes that the user couldn't redeem because the strings differed (spaces, missing `+`, casing on email).

**Fix:**
- Normalise the prefilled recipient in the `prompt()` to E.164 (strip spaces, ensure leading `+` for digits-only) and lowercase for emails — the same normalisation the OTP screen uses.
- Add a small helper note in the modal showing **both** the issued recipient and "User must enter exactly this on their screen".
- Make the "Patients" persona section the default and show the count badges prominently (already there, just confirm flow). Add a refresh button so admins don't need to reload the page.
- Ensure the section toggle is the FIRST thing shown so the worklist for pending patient activations is obvious (per prior feedback that "there's no worklist for pending activation user profiles").

### 3. Provider Login — accept email OR phone + show password-recovery path

**Issue:** The `approve-provider` edge function provisions providers with their `contact_email` (real email) and a temp password sent in the response. But:
- The login form is email-only and gives a generic "invalid credentials" with no path forward.
- Providers who lose their temp password have no self-serve reset.

**Fix:**
- Add a **"Forgot password"** link below the form that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })`. Reuses any existing `/reset-password` page; if missing, we can route to `/auth?reset=1`.
- Improve error copy: when `provider_members` returns 0 rows, distinguish between "no auth user" vs "auth user not linked to org" and tell admin contact path (`enterprise@rufayq.com`).
- Trim/lowercase the email on submit (some providers paste with trailing space).
- Keep email-based login (matches how `approve-provider` provisions accounts — no phone-based provider login needed).

### Files touched

```text
src/components/CurrencySwitcher.tsx        forwardRef wrapper
src/pages/Pricing.tsx                      <p> → <span> around inline switcher
src/components/admin/AdminVerificationAssist.tsx   normalise recipient + refresh btn + clearer modal copy
src/pages/ProviderLogin.tsx                forgot-password link + better errors + email trim
```

### Out of scope (call out separately if you want them next)
- Family workflow backend wiring polish (already shipped, reported working).
- Enterprise page rebuild from prompt 4.
- SEO keyword strategy implementation.

