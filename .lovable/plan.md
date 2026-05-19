Great callout. Your issue is really about **one canonical UX** across sections, not isolated fixes per screen.

Here is a **revised plan** that enforces UX/UI consistency app-wide, with Journey as the source of truth where you specified.

## **Unified UX/UI Plan (Revised)**

1. **Define canonical components first (Journey as source of truth)**
  - Treat Journey implementations as the baseline for:
    - Lounge card/sheet UX
    - Attachment preview UX (PDF/images)
  - Create shared components/hooks (instead of copying UI into Records):
    - UnifiedAttachmentPreview (modal + actions + rendering + back handling)
    - UnifiedLoungeCard / UnifiedLoungeSheet (card, details, QR flow, actions)
  - Replace section-specific variants in Records (and other tabs where applicable) with these shared components.
2. **Fix overlay architecture globally (not only milestones)**
  - Portal all attachment-related overlays to document.body:
    - label picker
    - preview modal
    - “From Records” picker
  - Standardize z-index layering tokens so overlays always sit above:
    - milestone sheets
    - bottom nav
    - nested cards/containers
  - Ensure this applies everywhere these overlays are used, not just Journey milestones.
3. **Unify attachment preview behavior across app**
  - Replace Records preview flow with the same interaction model used in Journey:
    - full-screen dark modal
    - title/file header
    - close button
    - identical action row (share/open/rename/delete as allowed)
    - robust rendering for image and PDF using a shared renderer
  - Keep metadata/key-fields visible in the same structured layout for visa/passport and similar docs.
  - Add consistent mobile back behavior: back closes preview first, then returns to originating context.
4. **Unify Lounge UX/UI across Journey, Records, and other applicable screens**
  - Make Journey lounge UX the canonical implementation.
  - Replace simplified Records lounge UI with the shared lounge component:
    - same card visuals, hierarchy, and spacing
    - same QR panel and full-screen scan flow
    - same upload/edit/download/share actions
    - same metadata presentation and states
  - Remove duplicate lounge logic and keep one behavior path for all sections.
5. **Scanner/layout consistency in embedded contexts**
  - Audit ScannerWizard container behavior when launched from milestones/sheets:
    - full viewport size
    - safe-area handling
    - independent internal scrolling
    - no clipping from parent transforms/overflow
  - Reuse shared overlay primitives for scanner child modals where applicable.
6. **Interaction consistency & state contracts**
  - Standardize modal state and close semantics:
    - tap backdrop
    - close button
    - hardware/browser back
  - Add a single overlay state pattern so section origin (Journey vs Records) does not change behavior.
  - Preserve origin context on close (return user to same milestone/card state).
7. **Focused verification with parity checks**
  - Tests (unit/integration) for shared components:
    - portal mounting
    - modal layering
    - back-button close behavior
    - PDF/image rendering parity
  - Regression tests for both Journey and Records entry points ensuring identical UX outcomes.
  - Manual mobile-size QA checklist:
    - no clipped overlays
    - same lounge UX in Journey and Records
    - same preview UX in Journey and Records
    - same close/back behavior from all entry points.

---

If you want, I can convert this into an **implementation sequence** (PR slices) so it’s easy to execute without regressions (e.g., Slice 1 shared preview, Slice 2 overlay portals, Slice 3 lounge unification, Slice 4 cleanup/tests).Great callout. Your issue is really about **one canonical UX** across sections, not isolated fixes per screen.

Here is a **revised plan** that enforces UX/UI consistency app-wide, with Journey as the source of truth where you specified.

## **Unified UX/UI Plan (Revised)**

1. **Define canonical components first (Journey as source of truth)**
  - Treat Journey implementations as the baseline for:
    - Lounge card/sheet UX
    - Attachment preview UX (PDF/images)
  - Create shared components/hooks (instead of copying UI into Records):
    - UnifiedAttachmentPreview (modal + actions + rendering + back handling)
    - UnifiedLoungeCard / UnifiedLoungeSheet (card, details, QR flow, actions)
  - Replace section-specific variants in Records (and other tabs where applicable) with these shared components.
2. **Fix overlay architecture globally (not only milestones)**
  - Portal all attachment-related overlays to document.body:
    - label picker
    - preview modal
    - “From Records” picker
  - Standardize z-index layering tokens so overlays always sit above:
    - milestone sheets
    - bottom nav
    - nested cards/containers
  - Ensure this applies everywhere these overlays are used, not just Journey milestones.
3. **Unify attachment preview behavior across app**
  - Replace Records preview flow with the same interaction model used in Journey:
    - full-screen dark modal
    - title/file header
    - close button
    - identical action row (share/open/rename/delete as allowed)
    - robust rendering for image and PDF using a shared renderer
  - Keep metadata/key-fields visible in the same structured layout for visa/passport and similar docs.
  - Add consistent mobile back behavior: back closes preview first, then returns to originating context.
4. **Unify Lounge UX/UI across Journey, Records, and other applicable screens**
  - Make Journey lounge UX the canonical implementation.
  - Replace simplified Records lounge UI with the shared lounge component:
    - same card visuals, hierarchy, and spacing
    - same QR panel and full-screen scan flow
    - same upload/edit/download/share actions
    - same metadata presentation and states
  - Remove duplicate lounge logic and keep one behavior path for all sections.
5. **Scanner/layout consistency in embedded contexts**
  - Audit ScannerWizard container behavior when launched from milestones/sheets:
    - full viewport size
    - safe-area handling
    - independent internal scrolling
    - no clipping from parent transforms/overflow
  - Reuse shared overlay primitives for scanner child modals where applicable.
6. **Interaction consistency & state contracts**
  - Standardize modal state and close semantics:
    - tap backdrop
    - close button
    - hardware/browser back
  - Add a single overlay state pattern so section origin (Journey vs Records) does not change behavior.
  - Preserve origin context on close (return user to same milestone/card state).
7. **Focused verification with parity checks**
  - Tests (unit/integration) for shared components:
    - portal mounting
    - modal layering
    - back-button close behavior
    - PDF/image rendering parity