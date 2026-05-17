Please implement a new Quality Control section in the admin portal plus a single-shot Android smoke report workflow.

This is a product/admin feature, so keep it scoped and do not change public patient/doctor UX.

High-level goal:

Create an admin-only QC area where:

1. admins, moderators, and QC testers can log manual issues,

2. upload and parse Android smoke reports,

3. review system/automated crash events,

4. create linked bug reports,

5. track fix validation.

Important:

- Do not add a public bug-report widget.

- Do not add Slack/email notifications.

- Do not create automated CI ingestion yet.

- Manual smoke-report upload is enough for v1.

- Keep the existing Android multi-row smoke script working.

- Admin UI can remain English-only.

---

# Part A — Android single-shot smoke report

## Goal

Add a single consolidated Android smoke report artifact that QC can upload into the admin portal.

Keep the existing multi-row `scripts/qa/android-splash-smoke.sh` for CI/manual matrix testing.

Add a new single-shot wrapper:

```text

scripts/qa/[android-smoke-report.sh](http://android-smoke-report.sh)

Add shared shell helpers:

`scripts/qa/lib/smoke-lib.sh`  


## **Case taxonomy**

Use this exact taxonomy:

`Case 1 — JS never reached React boot`  
`Case 2 — Remote URL / network failure`  
`Case 3 — JS / chunk load failure`  
`Case 4 — Native crash`  
`Case 5 — WebView renderer crash`  
`Case 6 — Memory pressure`  


Detection rules:

`Case 1:`  
  `no [RufayqStartup] React mounted`  
  
`Case 2:`  
  `ERR_NAME_NOT_RESOLVED`  
  `ERR_INTERNET_DISCONNECTED`  
  `net::ERR_`  
  `WebViewClient error`  
  
`Case 3:`  
  `ChunkLoadError`  
  `Loading chunk`  
  `Failed to fetch dynamically imported module`  
  `SyntaxError`  
  `ReferenceError`  
  
`Case 4:`  
  `FATAL EXCEPTION`  
  `AndroidRuntime: FATAL`  
  
`Case 5:`  
  `RenderProcessGone`  
  `Renderer process gone`  
  `WebView crashed`  
  
`Case 6:`  
  `OutOfMemoryError`  
  `lowmemorykiller`  
  `lmkd kill`  
  `onTrimMemory CRITICAL`  


Sub-tags should layer on top without changing the numeric case:

`+FIREBASE_INIT_FAIL`  
  `FirebaseApp not initialized`  
  `Missing google_app_id`  
  `google-services`  
  `SERVICE_NOT_AVAILABLE`  
  
`+ERROR_BOUNDARY`  
  `[RufayqStartup] ErrorBoundary rendered`  
  
`+RENDERED_BLANK`  
  `React mounted but post-screenshot is still splash/black`  


If multiple case patterns appear, use deterministic severity ordering:

1. Native crash
2. WebView renderer crash
3. Memory pressure
4. Network failure
5. JS/chunk failure
6. JS never reached React boot

But if React never mounted and network errors are present, prefer Case 2 over Case 1 because it explains why boot did not happen.

## **scripts/qa/lib/smoke-lib.sh**

Create reusable Bash functions:

`has_marker()`  
`classify_case()`  
`is_blank_or_splash()`  
`start_logcat()`  
`screenshot()`  
`device_summary()`  
`local_capacitor_mode()`  


Keep functions portable Bash and compatible with the existing script.

classify_case() should output a machine-parseable line, for example:

`2|Remote URL / network failure|FIREBASE_INIT_FAIL,ERROR_BOUNDARY`  


## **scripts/qa/android-smoke-report.sh**

Single-shot behavior:

1. Verify adb exists.
2. Verify exactly one authorized device is connected.
3. Clear logcat.
4. Start full logcat capture for the run window.
5. Force-stop and cold-launch APP_ID, default com.rufayq.app.
6. Capture:
  - pre.png
  - post.png
  - logcat-full.txt
7. Classify with classify_case.
8. Emit:

`qa-artifacts/android-smoke-<timestamp>/smoke-report.md`  


Use this exact report structure:

`# RufayQ Android Smoke Report — <timestamp>`  
  
`Device: <model> (Android <version>)`  
`Package: com.rufayq.app`  
`Activity: <resolved activity if available>`  
`Local capacitor mode: <bundled|remote-url|unknown>`  
`Verdict: PASS / FAIL — Case <N>: <human label> [+sub-tags]`  
  
`## Startup checklist`  
  
`- React mounted: yes/no`  
`- SplashScreen.hide requested: yes/no`  
`- Splash fallback timeout fired: yes/no`  
`- ErrorBoundary rendered: yes/no — "<first line if present>"`  
`- Post-screenshot is splash/black: yes/no`  
  
`## Push / FCM checklist`  
  
`- Push prompt mounted: yes/no`  
`- Push registration attempted: yes/no`  
`- Push permission granted: yes/no`  
`- Firebase initialized: yes/no/unknown`  
`- Push token received: yes/no`  
`- Push token saved to backend: yes/no`  
`- Push registration error: yes/no — "<first line if present>"`  
  
`## Full adb logcat`  
  
````log`  
`<entire logcat-full.txt contents>`  


## **Screenshots**

- pre.png
- post.png

  
`Exit codes:`  
`- 0 on PASS`  
`- 1..6 on FAIL matching Case N`  
`- 7 for environment/preflight errors, such as no adb device`  
  
`The script must always print the absolute report path before exiting.`  
  
`## Existing matrix script`  
  
`Edit scripts/qa/android-splash-smoke.sh only enough to source scripts/qa/lib/smoke-lib.sh and use classify_case for report wording.`  
  
`Do not remove the multi-row matrix behavior.`  
  
`Validation:`  
`- bash -n scripts/qa/lib/smoke-lib.sh`  
`- bash -n scripts/qa/android-smoke-report.sh`  
`- bash -n scripts/qa/android-splash-smoke.sh`  
  
`---`  
  
`# Part B — Database / roles / RLS`  
  
`## Add qc_tester role`  
  
`Create a Supabase migration.`  
  
`Add enum value:`  
  
````sql`  
`ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'qc_tester';`  


Important:

- Make sure this migration is compatible with Supabase/Postgres enum behavior.
- If enum additions cannot be used inside a transaction in this environment, structure the migration accordingly.

Update generated Supabase types so app_role includes:

`"admin" | "moderator" | "user" | "qc_tester"`  


## **Helper concept**

Use existing public.has_role(user_id, role).

For all QC tables:

- admin, moderator, qc_tester can SELECT/INSERT/UPDATE
- admin only can DELETE

## **Tables**

Create enums:

`CREATE TYPE public.qc_bug_status AS ENUM (`  
  `'open',`  
  `'in_progress',`  
  `'fixed',`  
  `'validated',`  
  `'closed',`  
  `'wont_fix'`  
`);`  
  
`CREATE TYPE public.qc_bug_severity AS ENUM (`  
  `'blocker',`  
  `'critical',`  
  `'major',`  
  `'minor',`  
  `'trivial'`  
`);`  
  
`CREATE TYPE public.qc_run_result AS ENUM (`  
  `'pass',`  
  `'fail',`  
  `'blocked',`  
  `'skipped'`  
`);`  
  
`CREATE TYPE public.qc_crash_event_status AS ENUM (`  
  `'new',`  
  `'triaged',`  
  `'linked_to_bug',`  
  `'ignored'`  
`);`  


### **qc_test_runs**

`CREATE TABLE public.qc_test_runs (`  
  `id uuid PRIMARY KEY DEFAULT gen_random_uuid(),`  
  `reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,`  
  `build_version text NOT NULL,`  
  `platform text NOT NULL CHECK (platform IN ('web','ios','android')),`  
  `device text,`  
  `scenario text NOT NULL,`  
  `result public.qc_run_result NOT NULL,`  
  `case_code smallint CHECK (case_code BETWEEN 1 AND 6),`  
  `case_subtags text[] NOT NULL DEFAULT '{}',`  
  `notes text,`  
  `smoke_report text,`  
  `logcat_excerpt text,`  
  `created_at timestamptz NOT NULL DEFAULT now()`  
`);`  


### **qc_bugs**

`CREATE TABLE public.qc_bugs (`  
  `id uuid PRIMARY KEY DEFAULT gen_random_uuid(),`  
  `reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,`  
  `assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,`  
  `test_run_id uuid REFERENCES public.qc_test_runs(id) ON DELETE SET NULL,`  
  `crash_event_id uuid,`  
  `source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','smoke_report','system_crash')),`  
  `title text NOT NULL,`  
  `description text NOT NULL,`  
  `severity public.qc_bug_severity NOT NULL DEFAULT 'major',`  
  `status public.qc_bug_status NOT NULL DEFAULT 'open',`  
  `platform text CHECK (platform IN ('web','ios','android')),`  
  `build_version text,`  
  `case_code smallint CHECK (case_code BETWEEN 1 AND 6),`  
  `case_subtags text[] NOT NULL DEFAULT '{}',`  
  `screenshot_paths text[] NOT NULL DEFAULT '{}',`  
  `created_at timestamptz NOT NULL DEFAULT now(),`  
  `updated_at timestamptz NOT NULL DEFAULT now()`  
`);`  


### **qc_bug_validations**

`CREATE TABLE public.qc_bug_validations (`  
  `id uuid PRIMARY KEY DEFAULT gen_random_uuid(),`  
  `bug_id uuid NOT NULL REFERENCES public.qc_bugs(id) ON DELETE CASCADE,`  
  `validator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,`  
  `build_version text NOT NULL,`  
  `outcome text NOT NULL CHECK (outcome IN ('validated','still_broken','cannot_reproduce')),`  
  `notes text,`  
  `created_at timestamptz NOT NULL DEFAULT now()`  
`);`  


### **qc_crash_events**

Add this because the product requirement includes automated bugs/crash events.

`CREATE TABLE public.qc_crash_events (`  
  `id uuid PRIMARY KEY DEFAULT gen_random_uuid(),`  
  `source text NOT NULL CHECK (source IN (`  
    `'react_error_boundary',`  
    `'unhandled_rejection',`  
    `'android_smoke',`  
    `'native_logcat',`  
    `'backend_job'`  
  `)),`  
  `platform text CHECK (platform IN ('web','ios','android')),`  
  `build_version text,`  
  `device text,`  
  `app_version text,`  
  `case_code smallint CHECK (case_code BETWEEN 1 AND 6),`  
  `case_subtags text[] NOT NULL DEFAULT '{}',`  
  `error_name text,`  
  `error_message text,`  
  `stack text,`  
  `log_excerpt text,`  
  `metadata jsonb NOT NULL DEFAULT '{}'::jsonb,`  
  `status public.qc_crash_event_status NOT NULL DEFAULT 'new',`  
  `linked_bug_id uuid REFERENCES public.qc_bugs(id) ON DELETE SET NULL,`  
  `created_at timestamptz NOT NULL DEFAULT now(),`  
  `triaged_at timestamptz,`  
  `triaged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL`  
`);`  


Then add FK from qc_bugs.crash_event_id after qc_crash_events exists:

`ALTER TABLE public.qc_bugs`  
  `ADD CONSTRAINT qc_bugs_crash_event_id_fkey`  
  `FOREIGN KEY (crash_event_id)`  
  `REFERENCES public.qc_crash_events(id)`  
  `ON DELETE SET NULL;`  


## **Stamping triggers**

Create a trigger function to stamp:

- qc_test_runs.reporter_id = auth.uid() on insert if null
- qc_bugs.reporter_id = auth.uid() on insert if null
- qc_bug_validations.validator_id = auth.uid() on insert if null

Use existing public.update_updated_at_column() for qc_bugs.updated_at.

## **RLS**

Enable RLS on:

- qc_test_runs
- qc_bugs
- qc_bug_validations
- qc_crash_events

Use a role predicate equivalent to:

`public.has_role(auth.uid(), 'admin'::public.app_role)`  
`OR public.has_role(auth.uid(), 'moderator'::public.app_role)`  
`OR public.has_role(auth.uid(), 'qc_tester'::public.app_role)`  


Policies:

- SELECT: QC staff predicate
- INSERT: QC staff predicate
- UPDATE: QC staff predicate
- DELETE: admin only

For qc_crash_events, allow:

- SELECT/UPDATE by QC staff
- DELETE by admin
- INSERT only through service role or a controlled SECURITY DEFINER RPC/edge function, not arbitrary public inserts

## **Storage**

Create private bucket:

`INSERT INTO storage.buckets (id, name, public)`  
`VALUES ('qc-attachments', 'qc-attachments', false)`  
`ON CONFLICT DO NOTHING;`  


Storage policies:

- admin/moderator/qc_tester can read/write
- admin only can delete
- path convention: {bug_id}/{filename}

---

# **Part C — Admin navigation and access**

## **adminNav.ts**

Add ShieldCheck icon.

Extend LeafKey with:

`| "qc_runs"`  
`| "qc_smoke"`  
`| "qc_bugs"`  
`| "qc_validations"`  
`| "qc_crash_events"`  


Extend badgeKey union with:

`| "open_qc_bugs"`  
`| "new_qc_crash_events"`  


Add module:

`{`  
  `key: "qc",`  
  `label: "Quality Control",`  
  `icon: ShieldCheck,`  
  `hint: "Testing, bugs, crash triage",`  
  `sections: ["Testing", "Bugs", "Automation"],`  
  `leaves: [`  
    `{ key: "qc_runs", label: "Test Runs", section: "Testing" },`  
    `{ key: "qc_smoke", label: "Smoke Reports", section: "Testing", pillTone: "new" },`  
    `{ key: "qc_bugs", label: "Bug Tracker", section: "Bugs", badgeKey: "open_qc_bugs" },`  
    `{ key: "qc_validations", label: "Fix Validation", section: "Bugs" },`  
    `{ key: "qc_crash_events", label: "Automated Events", section: "Automation", badgeKey: "new_qc_crash_events", pillTone: "new" }`  
  `]`  
`}`  


## **useAdminBadges.ts**

Add counts:

- open_qc_bugs: count qc_bugs where status in open, in_progress, fixed
- new_qc_crash_events: count qc_crash_events where status = new

Current badge interface only has support tickets, receipts, apps, and claims. Extend it safely. The existing badge hook pattern is in useAdminBadges.ts.

`Then include citations? Final answer can include file citations because asking validation. Continue prompt.`  
  
`Need include current role type limitations maybe in prompt.`  
  
`Continue final. `  
`Need be concise but sufficient. `  
`Ensure final includes commands run with emojis? Since answering question, final guidelines say cite files and terminal commands used. Need include checks list with emoji? Good.`  
  
`Need not mention make PR because no changes. No commit.`  
  
`Finish. `  
`Use citations after statements. Ensure cited lines. `  
`Need maybe include "Admin role state type must include qc_tester" in prompt. Continue. `  
`Need include "Admin.tsx". We'll cite.`  
  
`Let's finish. `  
          ``  
`Need maybe include Admin UI components details in prompt. `  
`Ok. `  
          ``  
`Need include "complete fix" prompt rest. `  
`Final oververbosity 5. `  
          ``  
`Let's generate. `  
          ``  
`Wait: user asks "what about this enhancement below..." They want maybe prompt not implementation. We can answer with "yes but adjust". Good. `  
          ``  
`Need cite terminal commands used. At bottom. `  
          ``  
`Proceed. `  
          ``  
`Use file citations in summary. `  
          ``  
`Final. `  
           ``  
          ``  
`Need mention authClient roles current only admin/moderator lines. Already cite. Good. `  
           ``  
`Need include AdminLogin cite. `  
           ``  
`Need include "adminNav has no qc leaves" cite lines 7-17 and modules. Good. `  
  
`Ok final. `  
           ``  
`Use Markdown. `  
          ``  
`Let's output. `  
           ``  
        `| "new_qc_crash_events";`  
  
`const ZERO: AdminBadges = {`  
  `open_tickets: 0,`  
  `pending_receipts: 0,`  
  `pending_apps: 0,`  
  `pending_claims: 0,`  
  `open_qc_bugs: 0,`  
  `new_qc_crash_events: 0,`  
`};`  


## **Admin.tsx**

Current role state only allows:

`"admin" | "moderator" | null`  


Update it to:

`"admin" | "moderator" | "qc_tester" | null`  


Current auth check only recognizes admin/moderator. Add qc_tester.

If role is qc_tester:

- show only the QC module
- if saved leaf is not a QC leaf, redirect to qc_runs
- hide QuickCreate/global admin actions if they expose non-QC operations

Example logic:

`const isQcTester = role === "qc_tester";`  
  
`const visibleModules = useMemo(() => {`  
  `const base = role === "qc_tester"`  
    `? NAV_MODULES.filter((g) => g.key === "qc")`  
    `: NAV_MODULES;`  
  
  `return base`  
    `.map((g) => ({`  
      `...g,`  
      `leaves: g.leaves.filter((l) => role === "admin" || !l.adminOnly),`  
    `}))`  
    `.filter((g) => g.leaves.length > 0);`  
`}, [role]);`  


Add a guard effect:

`useEffect(() => {`  
  `if (role !== "qc_tester") return;`  
  `const allowed = new Set(["qc_runs", "qc_smoke", "qc_bugs", "qc_validations", "qc_crash_events"]);`  
  `if (!allowed.has(leaf)) setLeaf("qc_runs");`  
`}, [role, leaf]);`  


Wire the leaf switch:

`case "qc_runs": return <AdminQcRuns />;`  
`case "qc_smoke": return <AdminQcSmoke />;`  
`case "qc_bugs": return <AdminQcBugs />;`  
`case "qc_validations": return <AdminQcValidations />;`  
`case "qc_crash_events": return <AdminQcCrashEvents />;`  


## **AdminLogin.tsx**

Accept qc_tester as staff.

Current logic only accepts:

`admin || moderator`  


Change to:

`admin || moderator || qc_tester`  


Update UI copy from “Admin & support sign-in only” to something like:

`Staff & QC sign-in only`  


---

# **Part D — Admin QC UI components**

Create folder:

`src/components/admin/qc/`  


Add:

`AdminQcRuns.tsx`  
`AdminQcSmoke.tsx`  
`AdminQcBugs.tsx`  
`AdminQcValidations.tsx`  
`AdminQcCrashEvents.tsx`  
`lib/parseSmokeReport.ts`  


## **Shared UI expectations**

Use existing admin visual style:

- dark admin shell
- tables/cards consistent with existing admin components
- no public/mobile app styling
- English only

## **parseSmokeReport.ts**

Pure TypeScript parser.

Input:

- smoke report markdown string

Output:

`interface ParsedSmokeReport {`  
  `verdict: "pass" | "fail" | "unknown";`  
  `caseCode: number | null;`  
  `caseLabel: string | null;`  
  `caseSubtags: string[];`  
  `logcatExcerpt: string | null;`  
  `startupChecklist: Record<string, string>;`  
  `pushChecklist: Record<string, string>;`  
`}`  


Parse:

- Verdict: PASS
- Verdict: FAIL — Case N: ... [+TAG,+TAG]
- fenced Full adb logcat block
- checklist bullet fields

Add unit tests if test setup is available.

## **AdminQcRuns.tsx**

Features:

- paginated table
- columns:
  - date
  - reporter
  - build
  - platform
  - device
  - scenario
  - result
  - case code
- filters:
  - platform
  - result
  - case code
- “New run” modal/form:
  - build_version
  - platform
  - device
  - scenario
  - result
  - case_code
  - case_subtags
  - notes
  - smoke_report
  - logcat_excerpt

## **AdminQcSmoke.tsx**

Features:

- markdown file picker for smoke-report.md
- parse with parseSmokeReport
- show parsed:
  - verdict
  - case code
  - sub-tags
  - logcat present yes/no
- form fields:
  - build_version
  - platform
  - device
  - scenario
  - notes
- Save inserts into qc_test_runs
- After save, show:
  - “Create bug from this run”
- “Create bug from this run” should prefill:
  - title: Startup FAIL — Case N
  - description with smoke summary and repro
  - test_run_id
  - platform
  - build_version
  - case_code
  - case_subtags
  - severity:
    - Case 4/5/6: critical
    - Case 1/2/3: major

## **AdminQcBugs.tsx**

Features:

- list with filters:
  - status
  - severity
  - platform
  - assignee
  - case_code
  - source
- create bug form:
  - title
  - description markdown
  - severity
  - status
  - platform
  - build_version
  - case_code
  - linked test_run_id optional
  - linked crash_event_id optional
  - screenshots upload to qc-attachments
- side panel details:
  - markdown preview
  - screenshot grid using signed URLs
  - assignee picker
  - severity dropdown
  - status dropdown
  - linked test run
  - linked crash event

## **AdminQcValidations.tsx**

Features:

- list bugs where status in:
  - fixed
  - in_progress
  - open
- per-bug validation timeline
- add validation:
  - build_version
  - outcome
  - notes
- if outcome = validated, update bug status to validated
- if outcome = still_broken, update bug status to in_progress
- if outcome = cannot_reproduce, leave status selectable or default to open

## **AdminQcCrashEvents.tsx**

This is required by the product requirement for automated crash/system events.

Features:

- list automated crash/system events
- filters:
  - status
  - source
  - platform
  - case_code
  - sub-tags
- details side panel:
  - error name/message
  - stack
  - log excerpt
  - metadata JSON
  - linked bug if any
- actions:
  - mark triaged
  - ignore
  - create bug from event
  - link to existing bug

Create bug from event should:

- insert qc_bugs
- set source = system_crash
- link crash_event_id
- copy error/log fields into description
- set crash event status = linked_to_bug
- set linked_bug_id

---

# **Part E — System crash / automated event logging**

Add a safe v1 pathway for automated events.

Do not allow arbitrary public inserts directly into qc_crash_events.

Implement one of these safe approaches:

Preferred:

- Supabase Edge Function using service role:  
log-qc-crash-event
- Accept sanitized payload:
  - source
  - platform
  - build_version
  - device
  - error_name
  - error_message
  - stack
  - log_excerpt
  - metadata
- Add basic rate limiting/deduplication where practical.

Alternative if Edge Functions are out of scope:

- Create SECURITY DEFINER RPC:  
public.log_qc_crash_event(...)
- Sanitize/truncate payload.
- Do not expose sensitive user data.
- Rate-limit/dedupe if possible.

Add client-side hooks only if safe:

- top-level React error boundary can log react_error_boundary
- window.unhandledrejection can log unhandled_rejection
- Android smoke report upload can log android_smoke

Do not block app startup if crash logging fails.

---

# **Part F — Verification**

Run available local checks:

`bash -n scripts/qa/lib/smoke-lib.sh`  
`bash -n scripts/qa/android-smoke-report.sh`  
`bash -n scripts/qa/android-splash-smoke.sh`  
`npm run typecheck`  
`npm run test -- src/components/admin/qc/lib/parseSmokeReport.test.ts`  


If Android device is available:

`./scripts/qa/android-smoke-report.sh`  


Expected:

- healthy build exits 0
- report contains Verdict: PASS
- full logcat block exists
- pre/post screenshots exist

Force network failure / bad server URL:

- report says FAIL — Case 2
- script exits 2

Admin verification:

1. Sign in as admin:
  - QC module visible along with all normal admin modules
2. Sign in as moderator:
  - QC module visible
  - admin-only non-QC modules still hidden as before
3. Sign in as qc_tester:
  - only Quality Control module visible
  - no Users/Billing/CMS/Settings modules visible
4. Upload smoke-report.md:
  - parser extracts verdict/case/logcat
  - save creates qc_test_runs
5. Create bug from smoke run:
  - creates linked qc_bugs
6. Create bug from crash event:
  - creates linked qc_bugs
  - marks event linked_to_bug
7. Add validation:
  - creates qc_bug_validations
  - updates bug status according to outcome

Final response must list:

- migration file
- new shell scripts
- new admin QC components
- nav/auth changes
- RLS/storage policies
- tests/checks run

  
`---`  
  
`## My recommendation`  
  
`I would implement this as **two PRs**, not one giant change:`  
  
`### PR 1 — QC data model + Admin QC MVP`  
  
`* qc_tester role`  
`* QC tables`  
`* RLS/storage`  
`* Admin nav`  
`* basic Test Runs / Smoke Reports / Bugs / Validations / Automated Events screens`  
`* smoke-report parser`  
  
`### PR 2 — Android single-shot smoke report tooling`  
  
`* smoke-lib.sh`  
`* android-smoke-report.sh`  
`* refactor existing splash smoke script to share classification logic`  
  
`This reduces risk. The admin DB/UI work is already sizable; mixing it with shell script refactors makes review harder.`  
  
`---`  
  
`## Checks I ran`  
  
`* ✅ git status --short; find src/components/admin -maxdepth 3 -type f | sort | sed -n '1,200p'; nl -ba src/components/admin/shell/adminNav.ts | sed -n '1,220p'; nl -ba src/components/admin/shell/useAdminBadges.ts | sed -n '1,220p'; nl -ba src/pages/Admin.tsx | sed -n '1,360p'; nl -ba src/pages/AdminLogin.tsx | sed -n '1,220p'`  
`* ✅ nl -ba src/pages/Admin.tsx | sed -n '100,130p;260,340p'`  
`* ✅ nl -ba src/components/admin/shell/adminNav.ts | sed -n '1,128p'`  
`* ✅ nl -ba src/integrations/supabase/types.ts | sed -n '7778,7788p'`  
`* ✅ rg -n "CREATE TYPE public.app_role|app_role|has_role|update_updated_at_column|storage.buckets|CREATE POLICY.*storage|user_roles" supabase/migrations src/integrations/supabase/types.ts -S`  


  
