Fix + Verification Pass — Optional Arabic Fields Disclosure + Report Defect Correction  
  
Do not redesign. Do not add dependencies. Do not change password rules, schema/RLS, edge functions, or auth business logic.

Important: Your previous branch-reality report conflicts with the repo state I can see. Before patching, prove the actual branch state with command output.

Step 0 — Branch reality proof

Run these commands from repo root and paste the exact output in your report:

pwd

git rev-parse --short HEAD

git status --short

rg --files src | rg 'QuickSignup|LoginScreen|Auth\.tsx|App\.tsx|PasswordStrength'

rg -n "quick-signup|QuickSignup|register view is retired|PasswordStrength" src/App.tsx src/pages src/screens src/components/auth 2>/dev/null

find src/components/auth -maxdepth 3 -type f | sort

Based on this output, identify the actual live signup component:

- If src/pages/QuickSignup.tsx truly exists and is routed from src/App.tsx, patch QuickSignup.tsx.

- If QuickSignup.tsx does not exist, patch src/screens/LoginScreen.tsx.

- Do not reference nonexistent files in the final report.

- Name the exact file you patched.

Product fix

In English signup mode, Arabic-name fields should not be visible in the primary signup path. Hide optional Arabic/profile fields behind an “Add optional details” disclosure/collapse, matching the attached UI direction.

Requirements:

1. Primary signup fields should stay minimal:

   - Name fields required by the current implementation

   - Mobile number

   - Password

   - Terms/privacy checkbox

2. Optional fields should move behind the disclosure:

   - Arabic name fields

   - DOB

   - Nationality

   - Any similar non-required profile details currently inline

3. The disclosure should be closed by default in English mode.

4. In Arabic mode, it is acceptable for Arabic-related optional details to be open by default if that matches the current language UX.

5. Preserve all state and submission payload fields.

6. Preserve PasswordStrength UI and allRequiredPass/evaluatePassword gating.

7. Keep the change minimal and in the actual signup component only.

8. If tests assert old behavior, update the test with a one-line justification.

Known branch-state caveat:

- In my visible checkout, the optional fields are inline in src/screens/LoginScreen.tsx:

  Full Name, Arabic name, ID/Passport, DOB, mobile, nationality.

- If your branch instead has src/pages/QuickSignup.tsx, prove it with the Step 0 command output and patch that file.

Verification commands

Run from repo root:

bun install

If bun install fails, report the failure and fall back to npm ci only if necessary.

Then run:

npx tsc -p [tsconfig.app](http://tsconfig.app).json --noEmit

Targeted tests:

- Use the actual PasswordStrength test path discovered in Step 0.

- If the file is flat, run:

  bunx vitest run src/components/auth/PasswordStrength.test.tsx src/screens/__tests__/HomeScreen.test.tsx

- If the file is under **tests**, run:

  bunx vitest run src/components/auth/__tests__/PasswordStrength.test.tsx src/screens/__tests__/HomeScreen.test.tsx

Full suite:

bunx vitest run

Build:

bun run build

Manual checks to report with ✅ / ⚠️ and actual file:line references

1. Optional-field disclosure:

   Confirm Arabic-name/profile optional fields are hidden behind “Add optional details” in English mode.

2. Registration password gating:

   Confirm signup submit is gated by evaluatePassword/allRequiredPass for:

   - length

   - upper

   - lower

   - number

   - notCommon

   - notIdentity

3. Recovery/new-password:

   Confirm the actual recovery/new-password flow renders PasswordStrength and gates submit with the same rules.

   If there is no recovery/new-password UI in your branch, report that with file evidence.

   Do not incorrectly claim it is absent if LoginScreen.tsx has a newpass view.

4. Home wiring:

   Report what HomeScreen actually renders today.

   If it renders PatientMetricsGrid, PhaseRibbon5, and HomeJourneyPreview, cite those lines.

   If it renders JourneyConstellation instead, cite those lines.

   Do not report stale wiring.

5. Phase routing:

   Confirm whether Home phase taps navigate with phase:<id> or only milestone:<id>.

   Confirm what JourneyScreen actually reads: phase:, milestone:, or both.

6. RTL:

   Confirm PhaseRibbon5 does not double-reverse phase order.

   Specifically check for manual .reverse() usage and [PHASES.map](http://PHASES.map) usage.

Arabic wordmark sweep

Run:

rg -n "رفيق|رفيّق|رُفيق|رفيِّق|رُفَيِّق" src public index.html

Report:

- Count before.

- Any changed files.

- Count after.

- Every Arabic brand mention must be رُفَيِّق.

- Bare رفيق may remain only if it is clearly the generic Arabic noun “companion,” not the brand. For each remaining generic-noun occurrence, list file:line and surrounding phrase.

Final report format

1. Branch reality proof:

   Paste the Step 0 command outputs.

2. Commands run:

   Exact command strings, exit codes, and concise stdout/stderr summaries.

3. Files changed:

   Exact file paths and one-line summary per file.

4. Failures fixed:

   Any failing command, cause, and minimal fix.

   If no command failed, say so.

5. Manual checks:

   ✅ / ⚠️ checklist with actual file:line references.

6. Arabic wordmark sweep:

   Count before, changed files, count after, and generic noun exceptions.

7. Remaining concerns:

   Anything needing product/user decision.

Do not submit a report that references QuickSignup.tsx unless your Step 0 output proves that file exists and is routed in this branch.

Do not submit a report that references src/components/auth/__tests__/PasswordStrength.test.tsx unless your Step 0 output proves that file exists.

Why I’d send this version instead of Lovable’s current plan

Lovable’s plan may be valid in their environment, but it is not consistent with the branch I can inspect. The safest approach is to make them paste branch-proof command output before making or reporting changes.

Current checkout evidence

The current route table I can inspect has /app, /ar/app, /auth, and /ar/auth, but not /quick-signup in this section. 【F:src/App.tsx†L99-L108】

The traveler click path in Auth.tsx navigates to /app with query params. 【F:src/pages/Auth.tsx†L58-L60】

The actual flat PasswordStrength.test.tsx path exists and imports from ./PasswordStrength. 【F:src/components/auth/PasswordStrength.test.tsx†L1-L6】

The inline optional profile fields visible in this checkout are in LoginScreen.tsx: Arabic name, DOB, and nationality are in the same primary field list as required fields. 【F:src/screens/LoginScreen.tsx†L870-L889】

The registration password meter is already wired below the password input and should be preserved. 【F:src/screens/LoginScreen.tsx†L953-L963】

Commands I used for this validation

pwd

rg --files src | rg 'QuickSignup|LoginScreen|Auth\.tsx|App\.tsx|PasswordStrength'

rg -n "quick-signup|QuickSignup|register view is retired|PasswordStrength" src/App.tsx src/pages src/screens src/components/auth 2>/dev/null | head -120

git status --short; git log --oneline -3

nl -ba src/App.tsx | sed -n '90,125p'

nl -ba src/pages/Auth.tsx | sed -n '50,75p'

nl -ba src/screens/LoginScreen.tsx | sed -n '849,889p;953,963p'

nl -ba src/components/auth/PasswordStrength.test.tsx | sed -n '1,8p'## My validation of Lovable’s proposed plan