## Scope

Branch: `edit/edt-bc3726f8-449b-4dbb-a6e0-ec4b4268ebec` @ `3b93138`. The live signup is `src/pages/QuickSignup.tsx`. `LoginScreen.tsx` no longer hosts signup (guarded by `LoginScreen.register-removed.test.tsx`) and will not be touched. The canonical combobox is `src/components/NationalityCombobox.tsx`; no `auth/` duplicate will be created.

## Implementation

### 1. `src/pages/QuickSignup.tsx`

- Add state: `const [gender, setGender] = useState<"" | "male" | "female" | "other">("")`.
- Inside the existing `{showOptional && ...}` block (after the Nationality field), add a Gender selector:
  - Three-segment pill (Male / Female / Other) bilingual: `t("Male","ذكر")`, `t("Female","أنثى")`, `t("Other","آخر")`.
  - Selected segment uses gold border/text on `BG_DARK_2`; unselected uses `TEXT_MUTED`. No new design tokens; reuses existing `inputStyle` palette.
  - Buttons are `type="button"` and never affect `canSubmit`.
- Update `profiles` upsert to include `gender: gender || null` alongside the existing `nationality: nationality.trim() || null`.
- Do NOT add `gender` to `canSubmit`. Required gating stays: firstName, lastName, valid e164, password, terms, optional valid email.

### 2. `src/pages/__tests__/QuickSignup.test.tsx`

Add/update tests that read straight from the rendered DOM and a mocked `supabase.from('profiles').upsert` spy:

- `optional details are hidden by default in English` — assert "First name (Arabic)", "Nationality" label, and Gender pill are NOT in the document on initial render.
- `clicking Add optional details reveals Arabic name, nationality, and gender` — click the toggle, assert all three groups present.
- `submitting with only required fields persists nationality: null and gender: null` — fill required fields only, submit, assert the upsert payload has `nationality: null, gender: null` and never `"Saudi Arabia"` or `"male"`.
- `selecting a gender in optional details persists that value` — open optional details, click Female pill, submit, assert upsert payload `gender: "female"`.

Test infrastructure:

- Mock `@/integrations/supabase/client` so `supabase.auth.signUp` resolves with a fake user, `supabase.auth.getSession` resolves with a session, and `supabase.from('profiles').upsert` is a `vi.fn()` we can assert on.
- Mock `@/hooks/useFreshStart` to no-op.
- Wrap render in `MemoryRouter`.

### 3. `src/components/__tests__/NationalityCombobox.test.tsx`

Already covers: EN-stored→EN display, EN-stored→AR display (relocalize), AR-stored→EN display (relocalize), placeholder fallback, localized emit on selection. **No changes needed.** Will re-run to confirm green.

## Out of scope

- LoginScreen.tsx (no signup code — explicitly removed; do not recreate).
- `src/components/auth/NationalityCombobox.tsx` (does not exist on this branch — do not create duplicate).
- Password rules, design tokens, layout.

In this checkout:

- current HEAD is 512e148, branch work;
- there is **no** src/pages/QuickSignup.tsx;
- there is **no** src/components/NationalityCombobox.tsx;
- the combobox is at src/components/auth/NationalityCombobox.tsx;
- signup/gender/nationality code still exists in src/screens/LoginScreen.tsx.

So the implementation plan is likely correct **for Lovable’s branch**, but it is **not applicable to this checkout**.

---

## **If Lovable is definitely working on branch 3b93138**

If they really are on branch:

`edit/edt-bc3726f8-449b-4dbb-a6e0-ec4b4268ebec @ 3b93138`  


and if that branch really has:

- src/pages/QuickSignup.tsx,
- src/components/NationalityCombobox.tsx,
- LoginScreen.register-removed.test.tsx,
- signup routed through QuickSignup,

then their plan is **good** and I would approve it with two small additions.

### **Add these two requirements**

1. **Assert gender is not required for submit**

Add/keep a test that proves selecting gender is optional and does not affect canSubmit.

2. **Assert “Other” persists correctly**

Since they add "other" as a third option, add a test for it or at least include it in the selector test coverage.

Suggested addition:

`Also add:`  
`- Test that canSubmit does not require gender.`  
`- Test that selecting Other persists gender: "other".`  


Other than that, their plan is well-scoped for their branch:

- gender defaults to "";
- gender is inside optional details;
- gender persists as gender || null;
- nationality persists as nationality.trim() || null;
- tests assert no silent "Saudi Arabia" or "male";
- no duplicate combobox;
- no old LoginScreen restoration.

---

## **If this PR is supposed to target the branch I can inspect here**

Then **do not accept Lovable’s plan**, because it targets the wrong files.

Current branch evidence:

- src/screens/LoginScreen.tsx imports NationalityCombobox from @/components/auth/NationalityCombobox. 【F:src/screens/LoginScreen.tsx†L1-L7】
- Registration state still has gender: "male" and nationality: "Saudi Arabia". 【F:src/screens/LoginScreen.tsx†L56-L60】
- These values are still persisted directly as gender: reg.gender and nationality: reg.nationality. 【F:src/screens/LoginScreen.tsx†L281-L292】
- NationalityCombobox is only present at src/components/auth/NationalityCombobox.tsx, not src/components/NationalityCombobox.tsx. 【F:src/components/auth/NationalityCombobox.tsx†L22-L23】

For this branch, the correct fix remains:

`Patch src/screens/LoginScreen.tsx and src/components/auth/NationalityCombobox.tsx, not QuickSignup.`  


---

## **What I would tell Lovable now**

Send this:

`Your plan is approved only for branch edit/edt-bc3726f8-449b-4dbb-a6e0-ec4b4268ebec @ 3b93138 if raw output proves QuickSignup is the live signup.`  
  
`Please add two test requirements:`  
`1. Gender is optional and does not affect submit gating.`  
`2. Selecting "Other" persists gender: "other".`  
  
`Otherwise proceed as planned:`  
`- edit src/pages/QuickSignup.tsx`  
`- edit src/pages/__tests__/QuickSignup.test.tsx`  
`- do not touch LoginScreen`  
`- do not create auth/NationalityCombobox duplicate`  
`- verify typecheck, targeted tests, full suite, and build.`  
  
`But if the PR target is branch work @ 512e148, your plan is targeting the wrong files. In that branch, patch:`  
`- src/screens/LoginScreen.tsx`  
`- src/components/auth/NationalityCombobox.tsx`  
`and fix gender/nationality defaults there.`  


---

## **Commands I used to validate current checkout**

`pwd`  
`git rev-parse --short HEAD`  
`git branch --show-current`  
`git status --short`  
`rg --files src | rg 'QuickSignup|NationalityCombobox|LoginScreen|register-removed'`  
`rg -n "QuickSignup|quick-signup|NationalityCombobox|gender:|nationality:" src/App.tsx src/pages src/screens src/components -g '*.{ts,tsx}' | head -260`  


  
  
Verification

1. `npx tsc -p tsconfig.app.json --noEmit` → 0 errors.
2. `bunx vitest run src/pages/__tests__/QuickSignup.test.tsx src/components/__tests__/NationalityCombobox.test.tsx` → all green.
3. `bunx vitest run` → full suite green (no regressions).
4. `bun run build` → success.

Final report will paste exit codes, changed-file list, and cite line numbers showing `gender` default `""`, `nationality` default `""`, `gender: gender || null`, `nationality: nationality.trim() || null`, plus the new test names.

## Files

- Edit: `src/pages/QuickSignup.tsx`
- Edit: `src/pages/__tests__/QuickSignup.test.tsx`
- (No new files.)