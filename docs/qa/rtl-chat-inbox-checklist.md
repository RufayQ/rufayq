# RTL Visual Test Checklist — Chat Inbox & People Search

Quick manual pass to verify avatars, labels, and row alignment render
correctly when the app language is Arabic. The mobile shell is pinned
`dir="ltr"` globally (see `LanguageContext.tsx`), so per-element
`dir="auto"` is what carries Arabic text correctly — these checks
catch regressions in those overrides.

## Setup

1. Open the app at viewport **390×844** (mobile shell).
2. Switch language to Arabic:
   - Settings → Language → العربية, **or**
   - DevTools: `localStorage.setItem("rufayq.lang","ar"); location.reload();`
3. Seed at least one of each thread kind in the inbox:
   - AI persona (medical / shopping / tour)
   - Direct chat with an Arabic-named contact (e.g. `أحمد القحطاني`)
   - Direct chat with a Latin-named contact (e.g. `Maria Lopez`)
   - Direct chat with a mixed/symbol name (e.g. `🌙 Dr. Sara`)
   - Provider thread (care team)

## Chat Inbox — `ChatInbox.tsx`

### Layout
- [ ] All rows: **avatar on the LEFT**, name + preview center, timestamp + badge on the RIGHT. (Layout does NOT mirror because the shell is `dir="ltr"`.)
- [ ] Row card is full-width inside the 390 px shell, 12 px horizontal padding, 12 px vertical, 12 px gap between avatar/text/meta.
- [ ] Tab bar (All / AI / Care / People) renders left-to-right; counts (e.g. `3`) sit immediately after the label.
- [ ] Bottom-nav badge total matches the sum of per-tab unread counts.

### Avatar
- [ ] Arabic-named contact shows correct **Arabic initials** (e.g. `أم` for `أحمد محمد`), not `?` or a Latin letter.
- [ ] Latin-named contact shows English initials (e.g. `ML`).
- [ ] Mixed/symbol-prefixed name (`🌙 Dr. Sara`) skips the emoji and shows `DS` — not the emoji glyph.
- [ ] Empty / generic title (`Conversation`) falls back to rufayq_id or device-id letters, never blank or `?`.
- [ ] Uploaded avatar image fully fills the 44×44 circle, `object-cover`, no stretch.
- [ ] Provider rows show the stethoscope icon (teal-deep bg). AI rows show the persona emoji (navy bg, gold ring).
- [ ] **Skeleton shimmer** appears for < ~300 ms on first paint, then resolves — does not flash repeatedly while scrolling.

### Name & preview (per-element `dir="auto"`)
- [ ] Arabic name reads **right-to-left** within its truncation box; punctuation (`.`, `،`, `()`) hugs the correct side.
- [ ] Latin name reads left-to-right in the same row right next to it.
- [ ] Mixed-script preview (e.g. `أرسل لك تقرير MRI`) keeps each script flowing naturally; no reversed digits or broken punctuation.
- [ ] Long names truncate with ellipsis on the **trailing** side of the script (Arabic truncates on the left edge of its run, Latin on the right).
- [ ] Unread preview text is bolder (`fontWeight: 600`) and navy; read preview is gray.

### Timestamp & unread badge
- [ ] Time uses Latin numerals (e.g. `2:14 PM`) — intentional, project-wide.
- [ ] Unread pill sits **flush right**, vertically aligned with the time.
- [ ] `99+` cap renders without overflow.

### Tap targets (RTL hit-testing)
- [ ] Tapping anywhere on the row opens the conversation.
- [ ] Tapping ONLY the avatar opens the contact profile (not the thread) for direct + provider rows.
- [ ] Keyboard: Tab focuses row → teal focus ring; Shift+Tab + Tab again focuses avatar → gold ring. Enter on each fires the correct action.
- [ ] Back from profile returns to inbox (not into the thread).

## People Search Results — `ChatInbox.tsx` (NewChatSheet → People)

- [ ] Search input placeholder is bilingual; typing Arabic characters appears left-to-right inside the input box (because shell is `dir="ltr"`) but search still matches Arabic full_name_ar.
- [ ] Each result row mirrors inbox layout: avatar left, name center, "Start chat · بدء" CTA right.
- [ ] Avatar initials for results follow the same Unicode-aware rule (no naive `slice(0,1)` failures on emoji/symbols).
- [ ] When `display_name` is empty, initials fall back to `rufayq_id` (e.g. `RQ` for `rq-7K2P`), never a blank circle.
- [ ] Name renders with `dir="auto"` — Arabic names align inside their truncation box correctly.
- [ ] No console warning about nested interactive elements (`<button>` in `<button>`).

## ChatHeadBubble (floating)

- [ ] Bubble for a direct thread shows the resolved initials (not a single sliced char) and the avatar image if uploaded.
- [ ] Long-press menu items `Open chat · فتح`, `Unpin · إلغاء التثبيت`, `Dismiss · إخفاء` all render readably in both scripts.

## Notification Center & Cross-screen

- [ ] Notification rows with Arabic sender names render with `dir="auto"`; numerals stay LTR.
- [ ] Opening a thread from a notification lands in `HumanChatView` with the correct title in the header.

## Regression watch-list (things previously broken)

- Initials slice with `.slice(0,1)` on emoji-prefixed names → showed `?` or junk. **Fixed** via Unicode `\p{L}` first-letter pick + `cleanWords` in `contactResolver.ts`.
- Missing `dir="auto"` on row name → Arabic punctuation drifted to wrong side. **Fixed** in `ChatInbox.tsx`, `ConversationProfile.tsx`.
- Avatar wrapped in `<span role="button">` inside `<button>` row → invalid HTML, no focus ring. **Fixed** by converting row to `<div role="button">` and avatar to a real `<button>` with `focus-visible:ring-2`.
- Multiple inbox mounts opened duplicate realtime channels. **Fixed** via shared `chat-inbox-shared` channel with refcount + 120 ms debounce.

## Tooling shortcuts

- Toggle the cache debug indicator:
  `localStorage.setItem("rufayq.debug.contactCache","1"); location.reload();`
  Then look for `C` (green) / `M` (gray) / `R` (amber) badges on direct-chat avatars.
- Force-clear the contact cache without reloading:
  `import("@/hooks/useResolvedContact").then(m => m.invalidateContactCache())` (from DevTools, in a dev build).
