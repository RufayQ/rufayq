# AdminLogin: Recognize qc_tester

## Scope
`src/pages/AdminLogin.tsx` only. The DB enum already includes `qc_tester` (migration `20260517140546…`), and `Admin.tsx` already routes QC testers to the QC-only shell. Today, `AdminLogin` blocks them at the door because `isStaff` only checks for `admin` / `moderator`.

## Changes

1. **Staff check** — accept QC testers:
   ```ts
   const STAFF_ROLES = ["admin", "moderator", "qc_tester"] as const;
   const isStaff = roles?.some((r) => (STAFF_ROLES as readonly string[]).includes(r.role));
   ```

2. **Copy refresh** (so the portal stops implying admin/support only):
   - Sub-header: `"Admin & support sign-in only"` → `"Admin, support & QC tester sign-in"`.
   - Footer note: `"Patient sign-in is on the main app. This portal is staff-only and access is logged."` → `"Patient sign-in is on the main app. This portal is for admin, support, and QC staff. Access is logged."`.
   - Failed-role toast: `"This account is not a staff account"` → `"This account doesn't have admin, support, or QC access."`.
   - SEO description: `"Staff sign-in for RufayQ administrators and moderators."` → `"Staff sign-in for RufayQ admins, support agents, and QC testers."`.

3. **Audit payload** is already generic (`roles: roles?.map(r => r.role)`) so QC tester sign-ins are captured automatically — no change needed.

## Out of scope
- `Admin.tsx` routing (already QC-aware).
- Permission matrix, team management UI, or any other admin component.
- Adding QC tester to `AdminSettingsTeam` / `AdminCustomerService` listings.
