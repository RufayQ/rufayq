# Three small fixes

## 1. Bug: Arabic name inputs invisible in EN mode (root cause found)

`src/index.css:301-304` has a global rule:

```
html[data-lang="en"] [dir="rtl"]:not(.lang-keep) { display: none !important; }
```

The two Arabic-name `<input dir="rtl">` elements at `src/pages/QuickSignup.tsx:336-356` match it and get hidden — only their labels render, which matches the screenshot exactly.

**Fix:** append `lang-keep` to the className on both Arabic inputs (the documented opt-out at `index.css:298-299`). One-line change per input. No CSS edits, no behavior change.

## 2. Recovery flow parity (your remaining-concerns item 1)

In `src/screens/LoginScreen.tsx`'s `newpass` view (around line 401):

- Import `PasswordStrength`, `evaluatePassword`, `allRequiredPass` from `@/components/auth/PasswordStrength`.
- Render `<PasswordStrength password={newPass} visible={…} />` under the new-password input.
- Replace the existing local `valid` boolean with one that requires `allRequiredPass(evaluatePassword(newPass))` AND the confirm-match check that's already there.
- Identity hints (firstName/lastName/phone) aren't available in the recovery context, so omit them — the meter still enforces length/upper/lower/number/notCommon.

No schema, RLS, or auth-business-logic changes.

## 3. HomeScreen (your remaining-concerns item 2)

Skip — you flagged it as awaiting product decision, not a request. Will not touch.

4. Nationality to be drop down list across the wole application with search to pick the nationality 

## Verification

- `npx tsc -p tsconfig.app.json --noEmit`
- `bunx vitest run src/pages/__tests__/QuickSignup.test.tsx src/components/auth/__tests__/PasswordStrength.test.tsx src/screens/__tests__/LoginScreen.register-removed.test.tsx src/screens/__tests__/HomeScreen.test.tsx`
- `bunx vitest run` (full)
- `bun run build`

Report exit codes + a short ✅/⚠️ checklist citing real file:line.