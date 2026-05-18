# Two changes: Lounge card masking + Pinned-as-circles

## 1. Hide / unhide the lounge card number

The card number is sensitive (16 digits, same shape as a credit card). Today it's printed in full on every card row.

**File:** `src/components/lounge/LoungeAccessSection.tsx`

- Add per-card local state `revealed: Record<membershipId, boolean>` (in-memory only, no persistence — reveal resets on page reload, which is the right default for sensitive numbers).
- Default render of the number becomes masked: keep the last 4 digits visible, replace the rest with `•` in groups of 4 → `•••• •••• •••• 0979`. The reveal state shows the existing formatted full number.
- Add a small toggle button at the right end of the number row using `Eye` / `EyeOff` (lucide), styled to match the gold/teal palette already used on the card. Stops click propagation so it doesn't open the QR sheet.
- Accessibility: `aria-label="Show card number"` / `"Hide card number"` and `aria-pressed`.

**Out of scope for the lounge card change:**
- The full-screen QR sheet (line ~372) still shows the full number — that view is the explicit "I want to use this card" surface, so masking it there would defeat the purpose.
- `TravelRecordsList.tsx` row that shows `m.membershipNumber` as a generic file label is left alone (it's a record list, not the card art).

## 2. Pinned records as small circles (like Helicopter View)

Today the pinned section in `TravelRecordsList` renders pinned items as full-width card rows above the rest of the list. The request: make pins look like the small circles in the Helicopter View (gold ring on selected, simple white circle with icon otherwise), and let the main records list scroll vertically underneath as it already does.

**File:** `src/components/records/TravelRecordsList.tsx`

- Replace the existing pinned section block (~lines 501–519) with a horizontal **pin strip**:
  - One round chip per pinned item, **44×44 px** circle, white background, soft shadow, gold 1.5px ring (matches helicopter "selected" treatment).
  - Icon inside the circle: `Sofa` for lounge cards, `ImageIcon` for image attachments, `FileText` for everything else. Same iconography used by the row renderer today.
  - Below each circle, a 2-line truncated label (10px font, navy) so the user can identify the pin without opening it. Width capped at ~64px so circles stay tight.
- Strip layout: `flex gap-3 overflow-x-auto` with hidden scrollbar, snap-x, horizontal padding so the first/last chip clears the edge. This matches the Helicopter View's horizontal feel.
- Header row stays: `PINNED · مثبتة (n/MAX)` on the left, `Clear pinned` on the right.
- Tap behaviour:
  - **Tap circle** → opens the same preview / lounge QR sheet the full row currently opens (reuse `setQrTarget(m.membership)` for lounge, `openPreview(item)` for attachments).
  - **Long-press or tap-and-hold** is not added — keep it simple. To unpin, the user opens the item's row in the main list and taps the existing pin icon (unchanged flow). Alternative considered (small × on the circle) rejected as too noisy at 44px.
- The records list below the strip continues to scroll vertically inside the existing scroll root — no layout change there.

**Out of scope:**
- Increasing `MAX_PINS` beyond 2 (kept at current value; user can ask separately if they want more circle slots).
- Drag-to-reorder pins.
- Changing the medical records segment (pins there, if any, are out of scope of this request).
- Pin circles on the Records header chip strip (`All / Passport / Visas / …`) — those are category filters, not pins.

## Visual reference
The pin circles mirror the Helicopter View pattern from the second screenshot: white circle, soft shadow, gold ring on the active/highlighted one. We'll apply the gold ring to every pinned circle (since being pinned == "highlighted" by definition).
