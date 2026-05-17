## Current state

Read/unread state already exists end-to-end:
- `patient_notifications.is_read` column + realtime
- `usePatientNotifications` exposes `markRead`, `markAllRead`, `unreadCount`
- `NotificationCenter` renders unread rows with accent border/bg, read rows muted, shows a "Mark read" pill in the header
- Bell badge counts unread

What's missing in the UI: there's no way to mark a single alert read **without** also navigating away and closing the panel. Tapping a row currently fires `markRead → navigate → close`. So a user who just wants to dismiss a notification can't.

## Fix (UI-only, `src/components/NotificationCenter.tsx`)

**1. Per-row dismiss control**
- On each unread alert row, add a small circular "✓" button on the right side. `onClick` stops propagation, calls `markRead(notification.id)`, and does NOT close the panel or navigate.
- Hide the button once the row is read (still showing the muted styling so the user can see history).
- Bilingual `aria-label`: "Mark as read · تعليم كمقروء".

**2. Make the bulk action more obvious**
- Promote the existing header "Mark read" pill: always render it when `alertUnread > 0`, with a small count (e.g. "Mark 3 read · تعليم 3"). No behavior change, just visibility.

**3. Tap behavior unchanged**
- Tapping the row body still marks read + navigates (when there's a `link`) + closes — that's the expected "open the thing" flow.
- For rows with no `link`, tapping still marks read but no longer closes the panel, so users can quickly burn through a stack of info-only alerts.

## Out of scope
- No schema changes (`is_read` already exists).
- No "mark unread" toggle, no swipe gestures, no per-row delete — can be added later if asked.
- Chat-thread rows in the same panel keep their current behavior (unread count comes from messages, not this flag).
