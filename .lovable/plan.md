## Scope

Two small UX improvements to the Human chat composer/bubbles in `src/components/chat/HumanChatView.tsx`. UI-only — no schema, no `useChatThread`, no `ChatRecordsPicker` changes.

## 1. Stage attachment in composer (with remove)

Currently `handleAttachRecord` immediately calls `send(...)` the moment a record is picked, so there is no way to back out.

Change to a two-step flow:

- Add state `const [pendingAttachment, setPendingAttachment] = useState<PickedRecord | null>(null);`
- `handleAttachRecord(rec)` now just closes the picker and sets `pendingAttachment = rec` (no send, no toast).
- Render a small attachment pill above the composer (same slot/style family as the existing reply pill), showing:
  - 📎 paperclip icon
  - `rec.label` (bold) + `rec.file_name` (muted, truncated)
  - small source chip `rec.sourceLabelEn · rec.sourceLabelAr`
  - an `X` button → `setPendingAttachment(null)` (aria-label "Remove attachment · إزالة المرفق")
- The send button's disabled rule becomes: `disabled = sending || (!input.trim() && !pendingAttachment)` so the user can send an attachment with no caption.
- `handleSend` composes the outgoing body:
  - if `pendingAttachment`: prepend the same 3 lines currently produced (`📎 label — file_name`, `(sourceLabelEn · sourceLabelAr)`, signedUrl when present), then a blank line, then the typed `input` (if any).
  - clear `pendingAttachment` on success alongside `input` / `replyTo`.
  - keep existing `replyToId` wiring.
- Reply pill and attachment pill can both be visible; stack them (attachment under reply) using the same shrink-0 mx-2 container styling.

## 2. Tap-to-open link in sent bubbles

The body is rendered as a raw string today (`{m.body}` inside a `whiteSpace: pre-wrap` div). Replace that single expression with a tiny inline renderer that linkifies URLs:

- New local helper `renderBodyWithLinks(body: string, mine: boolean)`:
  - Split on a URL regex (`/(https?:\/\/[^\s]+)/g`).
  - Map non-URL chunks to plain text spans.
  - Map URL chunks to `<a href={url} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()}>` styled as a tap target:
    - underline, font-medium, color `var(--gold)` when `mine`, `var(--teal-deep)` otherwise
    - `wordBreak: break-all` so long signed URLs wrap inside the bubble
- Use it in place of `{m.body}` (line 274) and also for the quoted preview (line 270 truncated body stays plain text — quotes don't need to be tappable).
- Long-press / context-menu handlers stay on the bubble; `stopPropagation` on the anchor keeps "tap the link" from also triggering the action menu.

No changes to other files. Existing attachment messages already in the thread will start showing tap-to-open links retroactively because the renderer just parses the body string.

## **Milestone “From Records” and Chat “My Records” must read from the same API/service (listAllUserRecords) and apply the same filtering semantics (user/device scope, deletion visibility, sort order), so both surfaces show the same list for the same user context.**

## **Concrete parity criteria to prevent regression**

1. Same source count parity
  - For a seeded user/device, milestone picker count equals chat picker count (minus intentionally non-linkable record origins).
2. Same top N ordering
  - First 5 items match by stable IDs and date ordering between chat and milestone pickers.
3. Same search behavior
  - Same query text returns same matching IDs in both pickers.
4. Same tier behavior
  - My Records remains free in both entry points; no contradictory badge/label.
5. Same failure behavior
  - API failure shows non-crashing toast in both flows.

  
  
Out of scope

- AI chat composer, `ChatRecordsPicker` internals, message schema/metadata, file previews, image thumbnails inside bubbles.