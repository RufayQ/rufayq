# Landing routing & contact fixes

Two small, presentation-only changes — no business logic touched.

## 1. Pricing link scrolls to top of section

**File:** `src/pages/Landing.tsx`

- In `navLinks`, change the Pricing entry from a route (`pricingHref`, `isRoute: true`) to a plain anchor `{ href: "#pricing" }`, matching Features/How/FAQ/Contact. (The dedicated `/pricing` route still exists for direct visits and the `Index` page, but the nav itself stays on-page.)
- Remove the now-unused `pricingHref` variable.
- Mobile menu link updates automatically since it maps over the same `navLinks`.

**File:** `src/pages/LandingBelow.tsx`

- On the `<section id="pricing" …>` (line 214), add `scroll-margin-top: 80px` (via inline style merge) so `scrollIntoView({ block: "start" })` lands just below the sticky 64–72px navbar instead of behind it.
- Apply the same `scroll-margin-top` to the other anchored sections (`#features`, `#how`, `#faq`, `#contact`) so every in-page jump clears the sticky nav consistently. Quick to add since they're already in this file.

The existing hash-polling effect in `Landing.tsx` and direct anchor clicks both rely on `scrollIntoView({ block: "start" })`, which honors `scroll-margin-top` — no JS offset math needed.

## 2. Hide phone number on Contact cards

**File:** `src/pages/LandingBelow.tsx` (contact cards array, lines 347–363)

For the WhatsApp and Mobile cards:
- Drop the visible `value` (`+966 56 959 0418`) from the rendered card.
- Keep `href` intact: `https://wa.me/966569590418?text=…` and `tel:+966569590418` — screen readers still announce the destination via the link.
- Update labels to action-oriented copy:
  - WhatsApp → EN "Chat on WhatsApp" / AR "تواصل عبر واتساب"
  - Mobile → EN "Call us" / AR "اتصل بنا"
- Add `aria-label` on each `<a>` (e.g. `Open WhatsApp chat with RufayQ support`, `Call RufayQ support`) so assistive tech gets a clear action description without needing the number on screen.
- Email card stays unchanged (already shows the address; that's intentional).

Rendering logic: replace the unconditional `<p>{c.value}</p>` with a conditional that only renders when `c.value` is set, so the email card keeps its address and the other two cards collapse cleanly. Existing card height stays close — the `sub` line keeps vertical rhythm.

## Verification

- Click Pricing in desktop + mobile nav → page scrolls so the "PRICING" eyebrow / heading is visible just under the navbar (not mid-section).
- Click Features / How / FAQ / Contact → same clean offset.
- Contact section: WhatsApp card has no visible number, tapping opens `wa.me` with prefilled message in a new tab. Mobile card has no visible number, tapping triggers `tel:` dialer. Email card unchanged.
- 473px viewport (current preview): cards stack, no overflow, hover/active states still work.
- No file outside `src/pages/Landing.tsx` and `src/pages/LandingBelow.tsx` is touched.
