# Manual test — Journey timeline step expand/collapse

Verifies that tapping each step in the Journey screen's timeline expands a
single step at a time and shows the correct bilingual details.

The relevant component is `StepsTab` inside `src/screens/JourneyScreen.tsx`
(see the button at line ~1742 and the expanded body at lines ~1774–1779).

## Setup

1. Open the app preview and log in (or stay in guest mode — both modes show the
   same demo timeline when no DB steps exist).
2. Navigate to **Journey** in the bottom nav.
3. Make sure you're on the **Steps** tab (default).
4. Confirm the screen shows the three phase headers — **BEFORE**, **DURING**,
   **AFTER** — each with at least one timeline card under it.

## Steps to test (run for every visible step)

For each step card on the timeline:

1. **Tap the card body** (anywhere except the round Edit button on the right).
   - ✅ The chevron on the right rotates from ▼ to ▲.
   - ✅ A details panel appears below the title, separated by a 1px divider.
   - ✅ The English `step.details` text renders first.
   - ✅ The Arabic `step.detailsAr` text renders below it, right-aligned
     (`dir="rtl"`) in the Noto Naskh Arabic font.
   - ✅ Any other previously-expanded step **collapses** (only one at a time).

2. **Tap the same card again.**
   - ✅ Chevron flips back to ▼ and the details panel disappears.

3. **Tap the small round Edit button** on the card's right side.
   - ✅ The edit sheet opens.
   - ✅ The card does **not** toggle expanded state (event propagation is
     stopped — see `e.stopPropagation()` on the Edit button).

4. **Active step** (the one with the gold pulsing dot and gold-tinted card):
   - ✅ Even when collapsed, the gold "action label" banner is visible
     (e.g. "Discharge package ready").
   - ✅ When expanded, both the action banner **and** the details panel show.

## Phase coverage checklist

Tap and verify at least one step in each phase:

- [ ] BEFORE — e.g. "Visa & travel docs" → expands with visa/travel details
- [ ] DURING — e.g. "Hospital admission" → expands with admission details
- [ ] AFTER — e.g. "Follow-up consultation" → expands with follow-up details

## RTL / Arabic spacing

While a step is expanded:

- ✅ Arabic text wraps without overflowing the card.
- ✅ Line height matches the rest of the screen (no cramped descenders).
- ✅ Switching the device language to Arabic system-wide does not break the
  English label rendering above it (both languages always show together).

## Known non-issues

- Drag handles (`⋮⋮`) on the left also accept clicks because the whole card is a
  `<button>` — that's intentional. Only the Edit button stops propagation.
- The `flashStepId` gold flash animation can briefly highlight a step after
  it's added/edited; it is unrelated to expand/collapse.
