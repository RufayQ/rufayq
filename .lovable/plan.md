Please finish Admin.tsx wiring for the QC module, but first verify prerequisites.

This task is only valid if the following already exist:

- QC leaf keys in `src/components/admin/shell/adminNav.ts`

- QC module in `NAV_MODULES`

- QC components:

  - `AdminQcRuns`

  - `AdminQcSmoke`

  - `AdminQcBugs`

  - `AdminQcValidations`

  - `AdminQcCrashEvents`

- role type support for `qc_tester`

- AdminLogin already accepts `qc_tester`

If any prerequisite is missing, stop and report the missing prerequisite instead of adding broken imports/switch cases.

---

## Scope

Preferred scope:

- `src/pages/Admin.tsx` only

But if `AdminLogin.tsx` still does not accept `qc_tester`, call that out as a required prerequisite/follow-up. Do not claim qc_tester access works unless login accepts it.

---

## 1. Add QC component imports

In `src/pages/Admin.tsx`, import:

```ts

import AdminQcRuns from "@/components/admin/qc/AdminQcRuns";

import AdminQcSmoke from "@/components/admin/qc/AdminQcSmoke";

import AdminQcBugs from "@/components/admin/qc/AdminQcBugs";

import AdminQcValidations from "@/components/admin/qc/AdminQcValidations";

import AdminQcCrashEvents from "@/components/admin/qc/AdminQcCrashEvents";

Only add these if the files exist.

2. Update Admin role type

Current role state must support qc_tester:

ts

const [role, setRole] = useState<"admin" | "moderator" | "qc_tester" | null>(null);

Update the auth role check:

ts

if ([res.data](http://res.data).roles.includes("admin")) setRole("admin");

else if ([res.data](http://res.data).roles.includes("moderator")) setRole("moderator");

else if ([res.data](http://res.data).roles.includes("qc_tester")) setRole("qc_tester");

Do not change server-side RLS assumptions; this is only UI routing.

3. Restrict qc_tester to the QC module only

Update visibleModules:

ts

const visibleModules = useMemo(

  () => NAV_MODULES

    .filter((g) => role !== "qc_tester" || g.key === "qc")

    .map((g) => ({

      ...g,

      leaves: g.leaves.filter((l) => role === "admin" || !l.adminOnly),

    }))

    .filter((g) => g.leaves.length > 0),

  [role],

);

QC leaves should not be marked adminOnly, so all QC leaves remain visible to admin, moderator, and qc_tester.

4. Snap qc_tester away from stale non-QC leaves

Add a type-safe helper near the top of Admin.tsx:

ts

const QC_LEAVES: LeafKey[] = [

  "qc_runs",

  "qc_smoke",

  "qc_bugs",

  "qc_validations",

  "qc_crash_events",

];

const isQcLeaf = (value: LeafKey) => QC_LEAVES.includes(value);

Then add an effect after role is resolved:

ts

useEffect(() => {

  if (role === "qc_tester" && !isQcLeaf(leaf)) {

    setLeaf("qc_runs");

  }

}, [role, leaf]);

Do not use [role] only, because the effect reads leaf.

5. Add switch cases for all QC leaves

In the main render switch, add:

tsx

case "qc_runs": return <AdminQcRuns />;

case "qc_smoke": return <AdminQcSmoke />;

case "qc_bugs": return <AdminQcBugs />;

case "qc_validations": return <AdminQcValidations />;

case "qc_crash_events": return <AdminQcCrashEvents />;

Do not wrap these in gate(isAdmin, ...).

QC leaves should be accessible to:

admin

moderator

qc_tester

Server RLS remains the source of truth.

6. Optional but recommended: hide non-QC topbar actions for qc_tester

If QuickCreateMenu, global search, or permissions debug expose non-QC actions to qc_tester, hide or limit them.

At minimum:

qc_tester should not see quick-create actions that route to non-QC leaves.

qc_tester should not be able to use global search to navigate to hidden non-QC modules.

If those components already respect visible leaves/roles, no extra change is needed.

7. Acceptance criteria

Admin and moderator can see the QC module plus their normal allowed modules.

qc_tester can enter /admin.

qc_tester sees only the Quality Control module.

If qc_tester has stale admin.leaf=dashboard, they are redirected to qc_runs.

All five QC leaves render:

qc_runs

qc_smoke

qc_bugs

qc_validations

qc_crash_events

No QC leaf is wrapped in admin-only gate.

npm run typecheck passes.

If AdminLogin.tsx is not already updated for qc_tester, explicitly report that as a blocker/follow-up.

---

## My recommendation

Do **not** let Lovable implement “three small edits to `Admin.tsx`” unless they confirm the rest of the QC module already exists.

For the current repo state, the right sequence is:

1. Add database/RLS + `qc_tester` role.

2. Add `adminNav.ts` QC leaves/module.

3. Add QC components.

4. Update `AdminLogin.tsx` to allow `qc_tester`.

5. Then apply this `Admin.tsx` wiring.

This proposed enhancement is step 5, not step 1.

---

## Checks I ran

* ✅ `git status --short; nl -ba src/pages/Admin.tsx | sed -n '1,120p;120,310p'; rg -n "qc_runs|qc_smoke|qc_bugs|qc_validations|qc_crash_events|AdminQc|qc_tester|Quality Control" src/pages/Admin.tsx src/components/admin/shell/adminNav.ts src/components/admin -S`

&nbsp;