## Goal

Add a category filter to the notifications panel so the user can quickly narrow the Alerts list to **Appointments**, **Medications**, **Care updates** (admission / discharge / instructions), or **Billing** (invoices, claims, authorizations).

## Where

`src/components/NotificationCenter.tsx` only. No schema change — we already store a `kind` per row in `patient_notifications` and the producers use stable values: `appointment`, `medication`, `instruction`, `admission`, `announcement`, `invoice`, `claim_request`, `authorization`, `consent_request`, `credit_note`.

## Design

**1. Category map (top of file)**
```ts
type Category = "all" | "appointments" | "meds" | "care" | "billing";
const CATEGORY_KINDS: Record<Exclude<Category,"all">, string[]> = {
  appointments: ["appointment"],
  meds: ["medication"],
  care: ["admission", "instruction", "announcement", "consent_request"],
  billing: ["invoice", "claim_request", "authorization", "credit_note"],
};
```
Anything not in those buckets stays visible only under "All".

**2. New `categoryFilter` state**
- Only rendered when the current tab is `all` or `alerts` (chats tab hides it).
- Render as a second, smaller scroll-x row of chip buttons just under the existing All/Messages/Alerts tabs, with icons:
  - Appointments — `CalendarClock`, AR "المواعيد"
  - Medications — `Pill`, AR "الأدوية"
  - Care updates — `Stethoscope`, AR "تحديثات الرعاية"
  - Billing — `Receipt`, AR "الفواتير"
  - All — first chip, AR "الكل"
- Each chip shows a small unread count badge (filtered count of unread alerts in that category).

**3. Apply filter to `displayedAlerts`**
```ts
const filtered = categoryFilter === "all"
  ? items
  : items.filter(n => CATEGORY_KINDS[categoryFilter].includes(n.kind));
const displayedAlerts = tab === "chats" ? [] : filtered;
```

**4. Empty state copy**
When a category is selected and `filtered.length === 0`, show "No {category} notifications · لا توجد تنبيهات" instead of the generic empty state, with a "Show all" reset button.

**5. Bulk "Mark N read" behavior**
- Keep the existing pill but make it scope-aware: when a filter is active, it marks only the visible filtered set as read (call `markRead` for each unread row in `filtered`). When `all`, behaves as today.

## Out of scope
- No new `kind` values, no producer changes, no DB migration.
- No saved-filter preference (resets per panel open).
- No category filter on the Messages tab.
