# Plan — Journey notification icon + Notification history

## Please implement the Journey notification icon + Notification history enhancement.

Scope:

- UI/UX only.

- No schema changes.

- No new hooks.

- No push delivery changes.

- No RLS changes.

- No notification creation changes.

- Reuse existing `NotificationCenter`, `usePatientNotifications`, and `useChatInbox`.

Files to touch:

1. `src/screens/JourneyScreen.tsx`

2. `src/components/NotificationCenter.tsx`

---

## Part A — Add notification bell to Journey header

Journey currently renders only the header kebab menu. Add the shared notification bell next to it.

In `src/screens/JourneyScreen.tsx`:

1. Import:

```ts

import NotificationCenter from "@/components/NotificationCenter";

In the Journey header right side, replace:

tsx

<HeaderMenu items={journeyMenuItems} />

with:

tsx

<div className="flex items-center gap-2">

  <NotificationCenter color="#fff" onNavigate={onNavigate} />

  <HeaderMenu items={journeyMenuItems} />

</div>

Requirements:

Bell should sit to the left of the kebab.

Keep existing header layout and spacing otherwise unchanged.

Do not change journeyMenuItems.

Do not change HeaderMenu.

Use the same onNavigate prop already available to Journey if present.

If JourneyScreen’s prop type does not currently expose onNavigate, use the existing navigation callback already used by Journey menu items. Do not introduce a new navigation system.

Part B — Add History tab to NotificationCenter

Edit src/components/NotificationCenter.tsx.

1. Extend tab type

Change:

ts

type Tab = "all" | "chats" | "alerts";

to:

ts

type Tab = "all" | "chats" | "alerts" | "history";

2. Add tab pill

Update tab order to:

ts

["all", "chats", "alerts", "history"]

Labels:

all: All / الكل

chats: Messages / الرسائل

alerts: Alerts / التنبيهات

history: History / السجل

Important:

Keep existing pill styling.

The History tab should not show an unread count badge.

3. Preserve existing tab behavior

Keep current unread-first behavior for:

All

Chats

Alerts

Existing behavior should remain:

Chats tab: unread chat threads only.

Alerts tab: alerts list as currently implemented.

All tab: current mix of unread chats + alerts.

Do not regress existing unread count behavior.

4. Add history behavior

When tab === "history":

Alerts history

Show read alerts only:

ts

items

  .filter((notification) => [notification.is](http://notification.is)_read)

  .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))

  .slice(0, 50)

If the existing usePatientNotifications already returns a pre-sorted list, still sort defensively.

Chat history

Show all chat threads, read + unread:

ts

threads

  .sort((a, b) => Date.parse(b.last_message_at) - Date.parse(a.last_message_at))

  .slice(0, 30)

Use the same chat row rendering as the existing chat list, but in History mode:

do not render the unread count pill/dot,

keep last message preview,

keep timestamp,

still allow tapping the row to open the chat thread if onOpenThread exists.

5. Mark all read behavior

Current Mark read button should not appear in History.

Update condition from:

tsx

alertUnread > 0 && tab !== "chats"

to something like:

tsx

alertUnread > 0 && tab !== "chats" && tab !== "history"

6. Category chips / filters

If NotificationCenter currently has category chips for alerts in this branch, keep them visible in History and have them filter read alerts by category.

If this branch does not currently have category chips, do not add a new filtering system as part of this change. Just make sure the History tab works with the existing UI.

7. Empty state

When tab === "history" and both history lists are empty, show:

English:

text

No past notifications yet

Arabic:

text

لا توجد إشعارات سابقة

Use the same empty-state visual style as the current notification center.

For other tabs, keep the existing empty state:

text

You're all caught up

لا توجد تنبيهات جديدة

8. Avoid mutation

When sorting threads or items, do not mutate arrays returned by hooks.

Use copies:

ts

[...threads].sort(...)

[...items].sort(...)

9. Recommended implementation structure

Add derived arrays near the existing display logic:

ts

const unreadThreads = threads.filter((thread) => (unreadByThread[[thread.id](http://thread.id)] ?? 0) > 0);

const historyThreads = [...threads]

  .sort((a, b) => Date.parse(b.last_message_at) - Date.parse(a.last_message_at))

  .slice(0, 30);

const historyAlerts = [...items]

  .filter((notification) => [notification.is](http://notification.is)_read)

  .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))

  .slice(0, 50);

const displayedAlerts =

  tab === "chats"

    ? []

    : tab === "history"

      ? historyAlerts

      : items;

const displayedThreads =

  tab === "alerts"

    ? []

    : tab === "history"

      ? historyThreads

      : unreadThreads;

When rendering chat rows:

ts

const isHistory = tab === "history";

const count = unreadByThread[[thread.id](http://thread.id)] ?? 0;

Only show unread badge if:

tsx

!isHistory && count > 0

10. Acceptance criteria

Journey header shows notification bell to the left of the kebab.

Bell opens the existing NotificationCenter.

Bell uses white icon color in Journey header.

NotificationCenter has four tabs:

All

Messages

Alerts

History

Existing All/Chats/Alerts behavior is unchanged.

History tab shows read alerts, newest first, max 50.

History tab shows all chat threads, newest first, max 30.

History chat rows do not show unread badge/dot.

Mark read button is hidden in History.

History empty state says:

No past notifications yet · لا توجد إشعارات سابقة

No schema changes.

No push/RLS/business-logic changes.

Run npm run typecheck.

---

## One caveat

If the product intent is truly “Records, Care Hub, and Home all render NotificationCenter,” then Care Hub may also need a bell in this repo, because its current header appears to render only `HeaderMenu`. 【F:src/screens/CareHubScreen.tsx†L74-L81】

But your enhancement specifically scopes Part A to **Journey**, so I would keep Care Hub out of this change unless you explicitly want all main headers normalized.

---

## Checks I ran

* ✅ `git status --short; nl -ba src/screens/JourneyScreen.tsx | sed -n '1,80p'; rg -n "NotificationCenter|HeaderMenu|journeyMenuItems|Header" src/screens/JourneyScreen.tsx src/screens/HomeScreen.tsx src/screens/CareHubScreen.tsx src/screens/RecordsScreen.tsx -S; nl -ba src/screens/JourneyScreen.tsx | sed -n '820,930p'; nl -ba src/components/NotificationCenter.tsx | sed -n '1,260p'`

* ✅ `nl -ba src/components/NotificationCenter.tsx | sed -n '1,150p'; nl -ba src/screens/JourneyScreen.tsx | sed -n '860,910p'; nl -ba src/screens/RecordsScreen.tsx | sed -n '140,154p'; nl -ba src/screens/HomeScreen.tsx | sed -n '1,80p'; rg -n "NotificationCenter" src/screens/HomeScreen.tsx src/screens/CareHubScreen.tsx src/screens/RecordsScreen.tsx src/screens/JourneyScreen.tsx -n`

* ✅ `nl -ba src/screens/JourneyScreen.tsx | sed -n '880,910p'; nl -ba src/screens/CareHubScreen.tsx | sed -n '70,85p'; nl -ba src/components/NotificationCenter.tsx | sed -n '104,150p'`

&nbsp;