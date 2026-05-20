## Records picker — keyboard-on-demand fix

**Request:** when the menu opens "Attach from My Records", don't pop the soft keyboard; only show it when the user actually taps the search field to type.

**Current behaviour (`src/components/chat/ChatRecordsPicker.tsx`):** the search `<input>` has no explicit `autoFocus`, but on Android/iOS WebViews a visible text input inside a freshly mounted bottom-sheet can still attract focus (focus trap, native IME heuristics, or any ancestor calling `.focus()`). Result: keyboard slides up under the sheet → layout reflow → race with the picker's mount/data-load → crash + journey route unwind described earlier.

**Plan (UI-only, presentation layer):Exact implementation requirements for ChatRecordsPicker**

Ask Lovable to implement these **specific safeguards**:

1. **Never auto-focus search on open**
  - Ensure search input has autoFocus={false} (or removed).
  - Do not call .focus() in mount effects.
2. **Use explicit “enable typing” intent**
  - Add isSearchArmed state default false.
  - Render input as:
    - readOnly={!isSearchArmed}
    - inputMode={isSearchArmed ? "search" : "none"}
  - On tap/click of the input container:
    - set isSearchArmed(true)
    - then requestAnimationFrame(() => inputRef.current?.focus())
3. **Reset on close**
  - On sheet close/unmount:
    - blur input
    - clear isSearchArmed(false)
  - Prevent stale focus returning when re-opened.
4. **Guard against parent focus traps**
  - Ensure no parent effect/focus-trap grabs first input automatically.
  - If using a modal/focus-lock lib, disable initial focus targeting for this sheet.
5. **Viewport stability on mobile keyboard**
  - Keep list container height stable (max-height / internal scroll).
  - Avoid layout jumps when visual viewport changes.

---

## **Acceptance criteria for this keyboard fix**

- Opening “Attach from My Records” does **not** open keyboard.
- Keyboard opens **only after user taps search**.
- Closing/reopening sheet remains stable (no instant keyboard).
- No crash/route unwind during open + first data fetch.
- Search still works normally once armed.

  
