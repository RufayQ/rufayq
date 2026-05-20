Plan:

1. Update the canonical records picker only

- Apply to the **actual shared picker component in this branch** (currently milestone picker in RelatedDocumentsCard.tsx; if chat has its own picker in your local branch, mirror the same behavior there).”
- Keep existing naming/imports exactly as they are in this branch.

2. Improve accessibility for the search arming flow

- Give the search row an explicit accessible name and state so screen readers understand it is an action before the input is armed.
- Add stable IDs/ARIA wiring between the search container, search input, and screen-reader status/help text.
- Preserve keyboard activation with Enter/Space and make the state transition predictable: unarmed row behaves like a button; armed state transfers focus to the actual search input.

3. Harden focus/blur cleanup

- Replace scattered blur/disarm logic with one cleanup helper.
- Cancel any pending `requestAnimationFrame` focus call when the sheet closes or unmounts.
- Disarm and blur the input on close, unmount, route/navigation lifecycle events, and after successful pick/close paths.
- Guard delayed focus so it cannot refocus the input after the sheet has been closed.

4. Add unexpected focus/keyboard telemetry

- Reuse the existing attach telemetry path instead of adding new backend schema.
- On picker open, capture the initial focused element and viewport height.
- Log a telemetry event if the search input becomes focused while still unarmed, or if the visual viewport shrinks like a keyboard opened before the user armed search.
- Include the existing `route`, device ID hash, and stage names such as `unexpectedFocusOnOpen` / `unexpectedKeyboardOnOpen` for diagnosis.

5. Add/extend e2e-style test coverage

- Extend `src/components/chat/__tests__/ChatRecordsPicker.keyboard.test.tsx` or add a sibling e2e test for the full flow.
- Test that opening “Attach from My Records” does not focus the input, keeps it read-only, and keeps `inputMode="none"`.
- Test that tapping the search row arms/focuses the input, filtering still works, and clicking a returned record calls `onPick` with the expected signed URL/source record.
- Add assertions that close/unmount cleanup blurs/disarms the input and does not allow a pending delayed focus to fire after close.

6. Validation

- Run the repo’s targeted Vitest tests for the records picker and record sources after implementation.
- I will not perform rename refactors or unrelated UI changes.

### **Commands used for this validation**

- ✅ rg -n "ChatRecordsPicker|Attach from My Records|autoFocus|search" src/components/chat src/components src/screens
- ✅ nl -ba src/components/RelatedDocumentsCard.tsx | sed -n '80,110p'
- ✅ nl -ba src/components/RelatedDocumentsCard.tsx | sed -n '270,310p'
- ✅ nl -ba src/components/RelatedDocumentsCard.tsx | sed -n '670,705p'Your plan is **strong**, but for this branch I’d adjust scope wording:

## **Validation Verdict**

- **Conceptually valid:** yes (arming search, cleanup, delayed-focus guard, tests).
- **:** your Step 1 saysChatRecordsPicker.ts, but this repo currently implements the milestone “ from Records UI in RelatedCardx` (and already has partial-arming).【F:src/componentsRelatedDocuments.tsx†L88-L95】【F:src/components/RelatedDocumentsCard.tsx†L678-L684】
- I found **no ChatRecordsPicker** symbol/file references in current src/ search output. (See command below.)