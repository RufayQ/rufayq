## Problem

The bell in **Records** and **Care Hub** uses the older `NotificationBell` component, which renders its panel with `absolute inset-0`. The nearest positioned ancestor is the colored header strip, so tapping the bell only "opens" a panel inside the header — visually nothing useful happens.

The Home screen already uses a proper full-screen notifications surface via `NotificationCenter` (portal, `fixed inset-0`, scoped to the 390px mobile shell, with Alerts + Chats tabs).

## Fix

Swap `NotificationBell` → `NotificationCenter` in the two screens so tapping the bell opens the same full notifications screen used on Home.

**1. `src/screens/RecordsScreen.tsx`**
- Replace the `NotificationBell` import with `NotificationCenter`.
- Replace `<NotificationBell color="#fff" />` (around line 152) with `<NotificationCenter color="#fff" onOpenThread={...} />`. Wire `onOpenThread` to the existing route to the Chat screen (use the same handler shape Home uses; if not trivially available, omit and let the user navigate manually — the alerts list still works).

**2. `src/screens/CareHubScreen.tsx`**
- Same swap around line 86.

**3. Leave `NotificationBell.tsx` in place**
- Don't delete it yet — it's still referenced by the HomeScreen unit test. Removal can be a follow-up. No behavior change to existing users of that component.

## Out of scope
- No new screens, no new tables, no notification source changes.
- Bell badge counts already come from `usePatientNotifications` inside `NotificationCenter`, so unread counts stay correct.
- No changes to Home's header.
