# Recovery/new-password parity with QuickSignup

## Problem

After the last change:

- `PasswordStrength` no longer displays the "Not a common password" rule.
- But `LoginScreen.tsx` (the recovery → new-password view at line ~401-415) still gates submission with `allRequiredPass`, which **still requires** `notCommon` plus all 5 other rules.
- Result: recovery requires Strong (6/6), shows a 5-rule checklist that can be 100% green while submit stays disabled. Inconsistent with QuickSignup, which now accepts Fair (≥3/5).

The "Forgot password?" CTA on the sign-in view (`handleForgot`) is the only entry point and lands on the same `newpass` view, so fixing it covers the entire forget-password scenario.

## Also, the password acceptance is accepting fair to strong, yet still the server rejects it

## Change

### `src/screens/LoginScreen.tsx`

- Update import (line 14) from `allRequiredPass` → `fairAndAbovePass`.
- Inside the `newpass` view (line ~404):
  - `const pwOk = fairAndAbovePass(pwChecks);`
  - Keep the existing `valid = pwOk && newPass === newPassConfirm` and the confirm-match border-error styling.
- Update the input label (line ~425) from "New password (min 8 chars)" to something neutral like "New password" (the meter still shows length requirement); leave Arabic as-is.

No schema, RLS, edge function, or other auth-flow changes. No styling redesign.

## Tests

- Add a small test in `src/screens/__tests__/` (new file `LoginScreen.newpass-gate.test.tsx`) that:
  - Renders `LoginScreen` with `view` forced to `newpass` via the recovery path is awkward; simpler: extract assertion at unit level by importing `fairAndAbovePass` and asserting it's the gate used. **Or** skip a new test and rely on the existing `PasswordStrength` + `fairAndAbovePass` unit tests, since the LoginScreen change is a one-line wiring swap that typecheck + manual confirms.
- Decision: skip new test (consistent with previous recovery-flow patches that didn't add LoginScreen-specific tests). TypeScript + the existing 441-test suite cover regression risk.

## Add Google Sign in 

&nbsp;

## Verification

- `npx tsc -p tsconfig.app.json --noEmit`
- `bunx vitest run` (full)
- `bun run build`
- Manual checklist: cite `LoginScreen.tsx:14` (import) and `:404` (gate) showing `fairAndAbovePass`.