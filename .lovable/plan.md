## one critical mismatch in your current branch:

- I don’t see a src/components/chat/ChatRecordsPicker.tsx file in this repo snapshot, and there are no references to ChatRecordsPicker in src/.
- The keyboard-risk surface you currently have is in the milestone picker search inside RelatedDocumentsCard (which now already uses a “search armed” approach). 【F:src/components/RelatedDocumentsCard.tsx†L93-L94】【F:src/components/RelatedDocumentsCard.tsx†L678-L684】

&nbsp;

**Plan**

**No source edits.** The fix is on the correct (and only) picker component for this branch. The earlier validation pointed at a file/line range from a different branch.

If you want extra hardening, the only safe additions would be:

1. Add `onPointerDown={armSearch}` to the input (currently we only arm on container click / input focus). Belt-and-suspenders against pointer-routing quirks on some Android WebViews.
2. Add a regression test (`ChatRecordsPicker.keyboard.test.tsx`) asserting `document.activeElement !== input` after open, and that tapping the row arms + focuses.

### **Recommendation (exact)**

Use the same safeguards in the real picker component:

1. No auto-focus on open.
2. isSearchArmed gate (readOnly, optional inputMode control).
3. On user tap: arm + requestAnimationFrame(() => input.focus()).
4. On close: blur + reset armed state.
5. Keep list in fixed max-height/internal scroll to avoid viewport jumps.

Your acceptance criteria are solid and should be kept exactly as written.