## Goal

Three things, scoped to the Chat module:

1. **Profile page** when tapping a chat header.
2. **Reply / quote messages** in human chats.
3. **Messenger-style floating "chat head"** for active conversations — a draggable circular avatar bubble that floats over the app (and via push notification on mobile), shows an unread badge, and opens that thread on tap.

---

## 1. Tap header → Conversation Profile page

**New file:** `src/components/chat/ConversationProfile.tsx` — a full-screen sheet inside the chat module (no router change; same in-app navigation pattern the chat already uses).

Layout (top to bottom):
- Large 96px circular avatar (provider stethoscope / direct initial / AI emblem).
- Display name (EN) + Arabic role line.
- For **provider** threads: clinic, specialty, hours, linked records count, "View linked appointments" deep-link to Care Hub.
- For **direct** threads: phone-style identity row (display name + device id chip), no medical metadata.
- Action rows: Mute notifications · Search in conversation · Clear chat · Block (direct only).
- Footer: thread created date, encryption disclaimer line.

Wiring:
- `HumanChatView.tsx`: make the header avatar + title block a button → calls a new `onOpenProfile()` prop.
- `ChatScreen.tsx`: add `view === "profile"` state, render `ConversationProfile` overlaying the chat with back button returning to the thread.
- Data: reuse `participants[threadId]` from `useChatInbox` + a small `useThreadProfile(threadId)` helper that pulls extended provider info from existing `provider`/`organization` rows when `kind === "provider"`.

---

## 2. Reply / quote messages

**Schema:** add nullable `reply_to_id uuid` (self-FK) + indexed `reply_to_id` on `public.chat_messages`. RLS unchanged (already covers the table).

**Hook:** `useChatThread.ts` — extend `send(body, opts?: { replyToId?: string })`; expose joined `reply_to` preview (sender + 60-char body snippet) when loading rows.

**UI in `HumanChatView.tsx`:**
- Long-press (touch) or right-click (desktop) a bubble → shows a small action bar above it (Reply · Copy · React-placeholder-disabled).
- On Reply: a **quote pill** appears above the composer with the snippet + ✕ to cancel; pressing Send attaches `replyToId`.
- Inside a bubble, if `reply_to` exists, render a left gold-bar quote block above the message body that scroll-snaps to the original when tapped.

Same treatment is **not** added to AI chat (per answer scope).

---

## 3. Messenger-style chat-head bubble

**New file:** `src/components/chat/ChatHeadBubble.tsx` — fixed-position circular avatar (56×56) with unread badge, pinned to the right edge inside the 390px shell.

Behavior:
- Mounted once in `AppShell` (or `Index.tsx` near `IncomingMessageOverlay`) so it's visible across all screens **except** when the chat thread it represents is already open.
- Source of truth: `useChatInbox().unreadByThread` + a new `useActiveChatHead()` hook that picks the most recently active thread with `unreadByThread > 0` (or the thread the user pinned via a "Minimize" button — see below).
- Tap → opens that thread via the existing `openChatThread` flow in `Index.tsx`.
- Drag along the Y axis (touch + mouse); X snaps to nearest edge. Position persisted in `localStorage`.
- Long-press → small menu: "Open chat", "Mute thread", "Dismiss bubble".
- **Minimize affordance** inside `HumanChatView` header: a new ⤡ button collapses the thread back to a bubble so the user can keep it floating while navigating.
- Auto-hides when no unread + not pinned, or when on the inbox/thread route for that same thread.

**Native push (mobile):** the chat-head bubble lives **in-app only**. True OS-level "bubbles over other apps" is an Android Bubbles API feature that requires Capacitor native plumbing. For this iteration, the **mobile notification** already fired by `useGlobalChat`/`push.ts` gets:
- Unread count appended to the notification title (`Aisha (3)`).
- Tapping it deep-links to the thread via existing `pendingChatThreadId` flow.
Native Android "chat bubbles over other apps" is called out as a follow-up that needs a Capacitor plugin and is **not** built in this plan.

---

## Files touched

- `src/components/chat/HumanChatView.tsx` — clickable header, long-press, reply pill, quoted-bubble render, minimize button.
- `src/components/chat/ConversationProfile.tsx` *(new)*.
- `src/components/chat/ChatHeadBubble.tsx` *(new)*.
- `src/hooks/useChatThread.ts` — `replyToId` send arg + joined `reply_to` preview.
- `src/hooks/useActiveChatHead.ts` *(new)* — picks the floating thread, persists position/pinned state.
- `src/screens/ChatScreen.tsx` — profile view state, wire minimize→bubble.
- `src/pages/Index.tsx` — mount `<ChatHeadBubble />` next to `IncomingMessageOverlay`.
- `src/lib/native/push.ts` — append unread count to notification title.
- Migration: add `reply_to_id` to `chat_messages`.

## Out of scope (call-outs)

- Reactions, voice notes, attachments in human chats, day separators, typing/seen polish — not selected.
- True Android system Bubbles overlay — needs native Capacitor work; will be a follow-up.

## Validation

- Open a thread → tap header → profile page renders with correct provider/direct content; back returns to the thread with scroll position preserved.
- Long-press a bubble → Reply → quote pill appears → send → new bubble shows the gold-bar quote; tap quote scrolls to original.
- Send a message from another device to a thread you're not viewing → chat head appears with unread "1" badge → drag to reposition → tap → opens that thread → bubble hides.
- Reload the app → chat head position persists; bubble auto-hides when unread = 0.
