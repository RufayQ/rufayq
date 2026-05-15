Verification & Fix Pass

No redesign. Run the requested checks, fix only what fails, and sweep the codebase for any Arabic RufayQ wordmark that isn't رُفَيِّق.

Important repo-specific corrections:

- The PasswordStrength test is at:

  src/components/auth/PasswordStrength.test.tsx

  not src/components/auth/__tests__/PasswordStrength.test.tsx.

- There is no src/pages/QuickSignup.tsx in this repo. For signup/recovery verification, inspect:

  src/screens/LoginScreen.tsx

  src/pages/Auth.tsx if relevant.

1. Environment & checks

Run from repo root:

bun install

If bun install fails, report the failure and fall back to npm ci only if needed.

Then run:

npx tsc -p [tsconfig.app](http://tsconfig.app).json --noEmit

Targeted tests:

bunx vitest run src/components/auth/PasswordStrength.test.tsx src/screens/__tests__/HomeScreen.test.tsx

Full test suite:

bunx vitest run

Build:

bun run build

Capture exact stdout/stderr and exit code for each command. Report pass/fail summary.

2. Fix policy

- Only patch code that is actually red, except for the Arabic wordmark sweep requested below.

- No refactors.

- No UI rewrites.

- For each failure:

  - Apply the smallest possible diff.

  - Re-run only the affected command.

  - Re-run the full suite once at the end.

- If a test asserts old behavior, fix the test.

- If production code is wrong, fix production code.

- Include a one-line justification per fix.

3. Manual sanity checks

Read-only inspection unless something is clearly broken:

- src/screens/LoginScreen.tsx + src/components/auth/PasswordStrength.tsx:

  Confirm registration submit is gated by allRequiredPass/evaluatePassword for:

  length, upper, lower, number, notCommon, notIdentity.

- Recovery/new-password flow:

  Confirm the recovery/new-password screen imports/renders PasswordStrength and gates submit on the same allRequiredPass/evaluatePassword rules.

  If it does not, this is an allowed code fix: wire in PasswordStrength + allRequiredPass with no visual changes beyond the meter itself.

- src/screens/HomeScreen.tsx + src/components/home/PatientMetricsGrid.tsx + src/components/home/HomeJourneyPreview.tsx:

  Verify loading skeleton, zero-state, and populated-state branches exist and use existing hooks/data.

- PhaseRibbon5 and JourneyScreen:

  Confirm phase taps call onNavigate("journey", "phase:<id>") or equivalent.

  Confirm JourneyScreen reads phase:<id> context and selects the relevant phase/milestone.

- RTL:

  Search for dir="rtl" / mode === "ar" usage in the new components.

  Confirm the phase ribbon order is not double-reversed.

  Do not manually reverse PHASES; visual mirroring should be handled by dir/flex only.

Report findings as a short checklist with ✅ / ⚠️ and file:line references.

4. Arabic wordmark sweep — رُفَيِّق

Goal:

Every Arabic rendering of the brand should read exactly:

رُفَيِّق

Not bare "رفيق" or another variant.

Procedure:

Run:

rg -n "رفيق|رفيّق|رُفيق|رفيِّق|رُفَيِّق" src public index.html

List every hit.

For each Arabic brand mention that is not already رُفَيِّق, replace it with رُفَيِّق.

Scope includes:

- Wordmark/logo components

- Auth/login/signup screens

- Onboarding

- Home header

- Settings

- Support

- Profile

- Care Hub

- Chat

- Records

- Pricing

- Journey

- Medications

- Static SEO/meta files: index.html, public/manifest.webmanifest, public/llms.txt, public/robots.txt, sitemap/static text if present

- README/user-facing strings if present

- Toasts, disclaimers, share messages

- supabase/functions/** email templates if they contain Arabic brand text

Do not touch:

- code identifiers

- file names

- English "RufayQ"

- Latin wordmark text

After replacement, re-run:

npx tsc -p [tsconfig.app](http://tsconfig.app).json --noEmit

bunx vitest run

bun run build

If string/snapshot tests fail only because the expected Arabic brand spelling changed, update those expectations.

5. Final report format

Reply with:

- Commands run:

  exact command strings + exit codes.

- Failures fixed:

  file, one-line diff summary, and one-line justification.

- Manual checks:

  checklist with ✅ / ⚠️ and file:line references.

- Arabic wordmark sweep:

  count of matching occurrences before,

  files changed,

  count after,

  confirmation that every Arabic brand mention is now رُفَيِّق.

- Remaining concerns:

  anything needing user/product decision.

Out of scope:

- New features

- Visual redesign

- New dependencies

- Schema/RLS changes

- Edge function logic changes