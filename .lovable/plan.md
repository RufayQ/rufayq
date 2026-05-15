# Signup optional-details correctness pass + NationalityCombobox localization + tests  
  
Signup optional-details correctness pass — branch-accurate version

Do not redesign. Do not change password rules. Do not add dependencies. Do not touch Google connected accounts in this patch.

Important branch reality:

In the branch under review, the signup implementation is in:

- src/screens/LoginScreen.tsx

The nationality combobox is:

- src/components/auth/NationalityCombobox.tsx

Do not reference src/pages/QuickSignup.tsx or src/components/NationalityCombobox.tsx unless your raw command output proves those files exist in the branch being reviewed.

Before editing, paste raw output for:

pwd

git rev-parse --short HEAD

git status --short

rg --files src | rg 'QuickSignup|LoginScreen|NationalityCombobox|googleLink'

rg -n "nationality|gender|NationalityCombobox|QuickSignup|googleLink" src/pages src/screens src/components src/lib -g '*.{ts,tsx}'

Fixes required in this branch:

1. Nationality must not silently default to Saudi Arabia.

   In src/screens/LoginScreen.tsx:

   - Change registration state from nationality: "Saudi Arabia" to nationality: "".

   - Keep the existing placeholder text in the combobox.

   - Persist nationality as reg.nationality || null.

2. Gender is optional in this branch and must not silently default to male.

   In src/screens/LoginScreen.tsx:

   - Change gender initial state from "male" to "".

   - Move the gender selector into the “Add optional details” disclosure with Arabic name, DOB, and nationality.

   - Persist gender as reg.gender || null.

   - Do not add gender to canContinue unless product explicitly wants gender required.

3. NationalityCombobox localization.

   In src/components/auth/NationalityCombobox.tsx:

   - Replace selectedLabel = value || placeholder logic with a country lookup:

     const selectedCountry = COUNTRIES.find(

       (country) =>

         value === [country.name](http://country.name) ||

         value === country.nameAr ||

         value === country.code,

     );

     const selectedLabel = selectedCountry

       ? isAr ? selectedCountry.nameAr : [selectedCountry.name](http://selectedCountry.name)

       : value || placeholder || (isAr ? "اختر الجنسية" : "Select nationality");

   - Keep onChange behavior compatible with the current payload.

   - Stored values in either English or Arabic should display in the current UI language.

4. Tests.

   Add/update tests for the actual files in this branch:

   - English signup: optional fields hidden by default.

   - Clicking “Add optional details” reveals Arabic name, DOB, nationality, and gender.

   - Submitting with only required fields does not save nationality as "Saudi Arabia" or gender as "male"; both should be null/empty in the profile upsert payload.

   - NationalityCombobox displays current-language label for both English and Arabic stored values.

   - NationalityCombobox onChange emits the localized name for the active language.

Suggested test locations:

- If there is no LoginScreen signup test, add one under src/screens/__tests__/LoginScreen.test.tsx or similar existing test convention.

- Add NationalityCombobox tests under src/components/auth/__tests__/NationalityCombobox.test.tsx or keep next to the component if this repo uses flat component tests. Match existing repo convention.

Verification:

npx tsc -p [tsconfig.app](http://tsconfig.app).json --noEmit

bunx vitest run <new/updated LoginScreen signup test> <NationalityCombobox test>

bunx vitest run

bun run build

Report:

- exact files changed

- exact commands and exit codes

- line references proving nationality/gender no longer silently default

- do not mention QuickSignup.tsx unless it exists in the raw command output

Why this corrected prompt is needed

The branch I can inspect shows the actual issue in LoginScreen.tsx:

nationality: "Saudi Arabia" and gender: "male" are still default registration state. 【F:src/screens/LoginScreen.tsx†L56-L60】

Both fields are persisted directly to the profiles row. 【F:src/screens/LoginScreen.tsx†L281-L292】

Gender is still visible in the primary signup form. 【F:src/screens/LoginScreen.tsx†L935-L948】

NationalityCombobox still displays value directly, so it does not relocalize after language changes. 【F:src/components/auth/NationalityCombobox.tsx†L58-L74】

Commands I used to validate this

bash

pwd

bash

git rev-parse --short HEAD

bash

git status --short

bash

rg --files src | rg 'QuickSignup|NationalityCombobox|LoginScreen|PasswordStrength|googleLink|ConnectedAccounts|useLinkedProviders'

bash

rg -n "nationality|gender|NationalityCombobox|QuickSignup|googleLink" src/pages src/screens src/components src/lib -g '*.{ts,tsx}' | head -240

Bottom line

Lovable’s fix intent is good, but their file targeting is wrong for this branch.

The missed fixes are:

LoginScreen.tsx: nationality default should be "", not "Saudi Arabia".

LoginScreen.tsx: gender default should be "", not "male".

LoginScreen.tsx: gender should move into optional details or become explicitly required.

LoginScreen.tsx: save nationality || null and gender || null.

NationalityCombobox.tsx: display selected country in the current language.

Tests should be added against the actual branch files, not QuickSignup.tsx. accept because /work.

**, but the file paths and branch facts are wrong for this checkout.

What Lovable’s plan gets right conceptually

These are valid fixes and should happen:

Nationality should not silently default to Saudi Arabia when hidden in optional details.

**Nationality should persist as null if untouched. NationalityComb should display selected the UI, even the stored value was selected in language.

4.Tests hidden and silent.Those are all.

in Lov’s plan ❌ Quick.ts presentable/pages/Signup.tsxBut not that file. The relevant signup code here is in src/screens/LoginScreen.tsx.

The current visible files include src/screens/LoginScreen.tsx and src/components/auth/NationalityCombobox.tsx, but no src/pages/QuickSignup.tsx.

❌ 2. The live nationality combobox path is different

Lovable says:

srcationalobox fileBut this,/Nity.ts imports it ❌Lov inQuick this this,LoginScreen.ts:

ts

gender: "male"

in registration state. 【F:src/screens/LoginScreen.tsx†L56-L60】

It persists gender: reg.gender. 【F:src/screens/LoginScreen.tsx†L281-L292】

It renders a visible gender selector in the signup form the branch fixed### ❌4 The current branch still has

ity is currently initialized Arabia`. 【F:src/screens/LoginScreen.tsx†L56-L60】

It is then to the Since field is hidden optional details, the silent-default.

❌ 5. Google-linkage file claim is not true in this checkout

Lovable says:

googleLink.ts already exists in this branch

In this checkout, I do not see googleLink.ts. Keep Google connected accounts as a separate workstream, but Lovable stop exist unless raw command output##ed fix prompt for Lov

this instead```text

Signup pass — branch

Do not redesign. not rules not Do not touch Google connected in.

branch reality the review the:

Screenx comb srcobox.ts not reference/QuickSignup.tsx orationality.tsx your raw those exist being reviewed.

, paste output:

revshort HEAD

git status --rg --files src rg 'SignupLoginScreenNationalityrg - "ity|NationalityCombobox src/pages/screens src src/libts,tsx}Fixes this1. Nationality must silently to Saudi Arabia src/screens.tsx:

-:Saudi to nationality.

placeholder theobox - Persist nationalityational ||. is this and must not silently default to male.

In src/screens/LoginScreen.tsx:

Change gender initial state from "male" to "".

Move the gender selector into the “Add optional details” disclosure with Arabic name, DOB, and nationality.

Persist gender as reg.gender || null.

Do gender to can product explicitly wants.ityCombobox localization.

In/components/authationalobox:

Replace selectedLabel = value || logic with a:

const selected = COUNTRIES.find(

country) === const = ?[Country.name](http://Country.name) [selectedCountry.name](http://selectedCountry.name) : placeholder ? "تر الجنسية" : "Select");

Keep on compatible with the current payload - Stored values in either English or should display the current UI language4.

/update tests the files in this:

English signup: optional hidden by default.

Clicking “Add optional details” reveals Arabic name, DOB nationality and.

Submitting with required fields not save nationality as Arabia" asmale"; both null/empty in the upsert payload NationalityCombobox displays current-language for both and.

ityobox onChange emits name active test- there is signup add src/tests/LoginScreen.test.tsx or similar existing convention.

Add Nationality tests under src/components/auth/tests/NationalityComb.test or keep to the component if this repo uses tests. Match existing repo convention.

Verificationn -p.json --Emit

bunx vitest run <new/updated LoginScreen signup test> <NationalityCombobox test>

bunx vitest run

bun run build

Report:

exact files changed

exact commands and exit codes

line references proving nationality/gender no longer silently default

do not mentionSignup.tsx it exists in the raw command output```

this corrected is needed

The I inspect shows the issue inScreen.tsx`:

*nationalSaudi"andgender: "male"` are still default registration state. 【F:src/screens/LoginScreen.tsx†L56-L60】

Both fields are the profiles row 【F:src/screens/LoginScreen.tsx†L281-L292】

still visible in the signup form. not relocalize after language changes. 【F:src/components/auth/NationalityCombobox.tsx†L58-L74】

Commands I used to validate this

gitparse --shortfiles srcQuickSignupLogingoogleLink|ConnectedAccounts|useLinkedProviders'

```bash

rg -n "nationality|gender|NationalityCombobox|QuickSignup|googleLink" src/pages src/screens src/components src/lib -g '*.{ts,tsx}' | head -240

Bottom line

Lovable intent** but targeting branch**.

:

.Screen: not"Loginx gender default should be"", not ": gender shouldnational || . NationalityCombx`: display selected country in.

6 filesx