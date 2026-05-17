## What's wrong

The chat inbox row (the "popup"/list the user sees from the screenshot) always renders a generic `<User>` icon for direct threads. The avatar resolver we added earlier is only wired into the chat **header** and **Contact info** screen — not the inbox list row. That's why "Alaa Zohair" still shows the default silhouette instead of initials / uploaded photo / Google picture.

## Fix

**1. `src/components/chat/ChatInbox.tsx` — `ThreadAvatar`**

- Accept `threadId` and call `useResolvedContact(threadId, "direct")` for `kind === "direct"` rows.
- Render priority inside the existing 44px circle:
  1. `contact.avatarUrl` → `<img>` filling the circle (covers uploaded photo + Google picture, since the resolver already orders them).
  2. else `contact.initials` → bold letter on the teal-light background.
  3. else fallback `<User>` icon (only when no participant resolved yet).
- Leave `provider` (Stethoscope) and `ai` (emoji) branches untouched.
- Pass the prop from the call site at line 116: `<ThreadAvatar threadId={t.id} kind={t.kind} persona={t.ai_persona} />`.

**2. `src/components/chat/ChatInbox.tsx` — "Find a person" results row (line ~309)**

- Same treatment for search results: show initials from `r.display_name` instead of always rendering the silhouette icon. Keep the icon only when no display name exists.

**3. Light caching (optional, in `useResolvedContact`)**

- Add a tiny in-memory `Map<threadId, ResolvedContact>` to avoid one Supabase round-trip per row while scrolling the inbox. Re-runs still happen on remount so updates stay correct.

No DB changes, no changes to `contactResolver`, `ConversationProfile`, or `HumanChatView` — those already work. This is a targeted UI fix to make the inbox row honor the same resolution we already use elsewhere.

## Out of scope

- No changes to chat threading, AI rows, provider clinic avatars, or the New chat sheets.
- No new tables or RLS changes.
