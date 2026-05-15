# QuickSignup password gating relaxation

## Goal
For the Quick Traveller Sign-up flow only:
1. Accept passwords rated **Fair** and above (currently only accepts all 6 rules = Strong).
2. Remove the **"Not a common password"** requirement entirely.

## Why scoped to QuickSignup
`LoginScreen.tsx` (recovery/new-password view) also imports `allRequiredPass` from the same component. Changing `allRequiredPass` globally would silently relax recovery gating too. We will keep `allRequiredPass` unchanged and add a new signup-specific validator.

## Changes

### 1. `src/components/auth/PasswordStrength.tsx`
- **Keep** `REQUIRED_KEYS` and `allRequiredPass` exactly as-is so `LoginScreen.tsx` is untouched.
- **Remove** the `notCommon` rule from the displayed `rules` array (line ~96) so users no longer see it in the checklist on any screen.
- **Add** new export `fairAndAbovePass`:
  - Checks the 5 remaining rules: `length`, `upper`, `lower`, `number`, `notIdentity`.
  - Returns `true` when **≥ 3** of those 5 pass (Fair threshold per existing band definitions).
- **Adjust** the band/segment logic so the UI still makes sense with 5 invisible required keys instead of 6. Mapping:
  - 0–2 rules → Weak (1 segment)
  - 3 rules → Fair (2 segments)
  - 4 rules → Good (3 segments)
  - 5 rules → Strong (4 segments)

### 2. `src/pages/QuickSignup.tsx`
- Replace the single call `allRequiredPass(pwChecks)` with `fairAndAbovePass(pwChecks)` (lines 48 and 82).
- No other behavioural changes (optional fields, terms checkbox, server error handling all stay the same).

### 3. Tests
- `src/components/auth/__tests__/PasswordStrength.test.tsx`
  - Keep existing `allRequiredPass` tests.
  - Add tests for `fairAndAbovePass`: verify it returns `true` at 3/5 rules and `false` at 2/5 or below.
- `src/pages/__tests__/QuickSignup.test.tsx`
  - Update the "disables submit when password fails required rules" test so the "weak" example now uses a password that fails the *new* signup threshold (e.g. only 2 of 5 rules) and the "strong" example uses a Fair-or-better password (e.g. 3 of 5 rules).
  - Remove assertions against `pw-rule-notCommon` since that rule is no longer rendered.

## Verification (post-implementation)
- `npx tsc -p tsconfig.app.json --noEmit`
- `bunx vitest run src/components/auth/__tests__/PasswordStrength.test.tsx src/pages/__tests__/QuickSignup.test.tsx`
- `bunx vitest run` (full suite)
- `bun run build`
