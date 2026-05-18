Please implement Lounge QR fullscreen + HD download + UI tests, but align the implementation with the current repo.

Important current repo reality:

- `src/components/lounge/LoungeAccessSection.tsx` currently uses a local `SimpleQr` SVG component, not `QRCodeSVG`.

- `LoungeMembership` currently has `passImage`, but does not have `qrSecret` or `qrImageUrl`.

- The sheet already has a basic PNG download button, but there is no fullscreen QR view.

- Do not assume `QRCodeSVG`, `qrSecret`, or `qrImageUrl` exist unless you add them intentionally.

Scope:

- Prefer a pure UI/utility change.

- No backend changes.

- No Supabase changes.

- No native filesystem/share integration.

- No QR library migration unless absolutely necessary.

Files:

- edit: `src/components/lounge/LoungeAccessSection.tsx`

- new: `src/components/lounge/__tests__/LoungeAccessSection.test.tsx`

---

## Part 1 — Add fullscreen QR view

In `src/components/lounge/LoungeAccessSection.tsx`, add fullscreen mode to `LoungeQrSheet`.

Current flow:

- User clicks a lounge card.

- `LoungeQrSheet` opens.

- The generated QR is shown using `SimpleQr`.

Add:

- local state:

  `const [fullscreen, setFullscreen] = useState(false);`

- a tappable QR surface around the generated QR:

  `data-testid="qr-open-fullscreen"`

- when clicked, set `fullscreen` to true.

- fullscreen overlay container:

  `data-testid="qr-fullscreen"`

Fullscreen requirements:

- fixed inset overlay above the normal sheet

- dark/black translucent background

- centered QR content

- close button top-right

- download button top-left

- close button keeps existing behavior and only closes fullscreen first

- no visual redesign beyond necessary fullscreen support

Add test IDs:

- `data-testid="qr-open-fullscreen"` on the tap target

- `data-testid="qr-fullscreen"` on fullscreen container

- `data-testid="qr-generated"` on the generated QR SVG

- `data-testid="qr-fullscreen-download"` on the fullscreen download button

Also add:

- `data-testid="lounge-card-expand-{id}"` only if there is an actual expand toggle in this branch.

- If there is no expand toggle in this branch, do not invent a fake test ID. Instead, test opening the lounge QR sheet by clicking the lounge card.

---

## Part 2 — HD PNG download for generated QR

The current `downloadPng()` serializes the on-screen SVG and exports a 768px canvas.

Replace or extend it so fullscreen Download exports a crisp HD PNG.

Requirements:

- export at 1024×1024

- white background

- generated QR remains sharp

- filename:

  `rufayq-lounge-{program-slug}-{last4}.png`

- show success toast:

  `Saved to downloads · تم الحفظ`

- show error toast on failure

- do not crash if canvas/image serialization fails

Because current code uses `SimpleQr`, do not require `QRCodeSVG`.

Recommended approach:

1. Render an offscreen/generated SVG string from the same QR data.

2. Either:

   - reuse `SimpleQr` via `renderToStaticMarkup`, or

   - create a helper that produces equivalent SVG markup for the same QR value at 1024px.

3. Convert SVG string to an image.

4. Draw it onto a 1024×1024 canvas with white background.

5. Export with:

   `canvas.toDataURL("image/png")`

6. Trigger a download with a temporary anchor.

If using `renderToStaticMarkup`, import:

```ts

import { renderToStaticMarkup } from "react-dom/server";

Do not wrap imports in try/catch.

Use a helper like:

ts

function triggerDownload(dataUrl: string, filename: string) {

  const a = document.createElement("a");

  a.href = dataUrl;

  [a.download](http://a.download) = filename;

  document.body.appendChild(a);

  [a.click](http://a.click)();

  a.remove();

}

Part 3 — Optional uploaded QR image support

Only implement this if product wants users to upload an actual QR image separately from pass photo.

If implementing uploaded QR mode:

Add qrImageUrl?: string to LoungeMembership.

Add QR image upload input in the lounge form.

Persist qrImageUrl.

If membership.qrImageUrl exists, render it instead of generated QR.

Add:

data-testid="qr-uploaded"

Download behavior for uploaded QR:

load source image into Image

draw at natural size

if smaller than 1024px, upscale to at least 1024px

set imageSmoothingEnabled = false

export PNG

Add tests for uploaded QR.

If not implementing qrImageUrl, do not write tests for uploaded QR image. Current passImage is not the same thing as uploaded QR.

Part 4 — Tests

Create:

src/components/lounge/__tests__/LoungeAccessSection.test.tsx

Use existing Vitest + Testing Library setup.

Mock:

@/lib/loungeMemberships

sonner

Current model seed should match actual LoungeMembership.

Minimum tests if only generated QR mode is implemented:

Renders lounge cards from mocked memberships.

Clicking a lounge card opens LoungeQrSheet.

Clicking qr-open-fullscreen opens qr-fullscreen.

qr-generated SVG exists in fullscreen.

Clicking qr-fullscreen-download:

calls anchor click()

sets download ending in .png

sets href beginning with data:image/png

calls toast success.

If adding qrImageUrl, also add:

Uploaded QR fullscreen renders qr-uploaded image.

Uploaded QR download uses uploaded-image path and triggers download.

Test implementation details:

Stub HTMLCanvasElement.prototype.getContext.

Stub HTMLCanvasElement.prototype.toDataURL to return:

data:image/png;base64,FAKEHD

Spy on [HTMLAnchorElement.prototype.click](http://HTMLAnchorElement.prototype.click).

Mock Image loading if testing uploaded images.

Do not hit Supabase or real localStorage.

Avoid testing implementation internals; test user-visible behavior and download trigger.

Acceptance criteria

Existing lounge card flow still works.

Generated QR can open fullscreen.

Fullscreen has close and download buttons.

Download produces a 1024px-style PNG export path from generated QR.

Download filename matches:

rufayq-lounge-{program-slug}-{last4}.png

Success and error toasts are bilingual.

Tests cover generated QR fullscreen and download.

If uploaded QR support is added, tests cover uploaded QR fullscreen and download.

npm run typecheck passes.

npm run test -- src/components/lounge/__tests__/LoungeAccessSection.test.tsx passes.

---

## My recommendation

Do **not** ask Lovable to implement the original plan literally unless you also want to add `qrImageUrl` to the lounge data model.

For the current codebase, the safest immediate ask is:

> Add fullscreen + HD download for the existing generated lounge QR, with tests.

Then do uploaded QR image support as a separate enhancement.

---

## Checks I ran

* ✅ `git status --short; nl -ba src/components/lounge/LoungeAccessSection.tsx | sed -n '1,260p'; find src -maxdepth 3 -type f \( -name 'setup.ts' -o -name 'setupTests.ts' -o -name '*.test.tsx' \) | sort | sed -n '1,120p'; nl -ba vitest.config.ts 2>/dev/null || true; nl -ba vite.config.ts | sed -n '1,80p'`

* ✅ `nl -ba src/components/lounge/LoungeAccessSection.tsx | sed -n '53,90p'; nl -ba src/lib/loungeMemberships.ts | sed -n '1,130p'; rg -n "QRCodeSVG|qrcode|react-qr" package.json package-lock.json src -S`## Validation verdict

The enhancement is **useful**, but the plan as written does **not match the current repo implementation**.

The current `LoungeAccessSection.tsx` already has a basic PNG download button in the normal QR sheet, but it does **not** have the fullscreen QR branch described in the plan. Alsonot `SecretqrImage It

Namemembership

passAt

current QR a ` component.【F:src/components/lounge/LoungeAccessSection.tsx†L87-L90】

’s it is actionable.

What is currently true

Current lounge sheet already has PNG/PDF actions

Inside LoungeQrSheet, there is already:

downloadPng()

printPdf()

a PNG button

a PDF button

【F:src/components/lounge/LoungeAccessSection.tsx†L59-L83】

But the existing PNG export serializes the on-screen SVG and renders it to a 768×768 canvas, not a dedicated 1024px HD export. 【F:src/components/lounge/LoungeAccessSection.tsx†L103-L114】

tsJSON: :.memberName,

m: membership.membershipNumber

})

【F:src/components/lounge/LoungeAccessSection.tsx†L53-L57】

 is no separate `Secret### Current concept is image, not uploaded QR image

The current model has `?:`, the sheet toggle between QR and lounge image 【F:src/lib/loungeMemberships.ts†L3-L12】That is different from the `qrImageUrl` mode.

So auploaded image” cannot be valid Lovable first addsqrImageUrl` to the data model/form.

---

## Recommended correction

Split the enhancement into **two levels**:

### Level 1 — Safe enhancement matching current repo

Do this now:

* Add fullscreen mode to the existing QR sheet.

* Add a fullscreen Download button.

* Generate a high-resolution 1024× PNG the QR.

* Add test IDs* Add tests * opening lounge sheet,

  * fullscreen generated QR,

  * generated,

 * toggling pass image needed.

This requires no model.

### Level  QR image

Do this if you want lounge to support an QR image from pass photo Add `qrImageUrl string` to `oungeMembership`.

* Add upload control for image.

* Persist in `oungeMembership`.

* Render uploaded QR mode when present.

* Add uploaded QR fullscreen/download tests.

That is no longer “pure UI”; it is a small data model/storage UI change.

---

# Corrected Lovable prompt

Paste this to Lovable:

```text

Please implement Lounge QR fullscreen + HD download + UI tests, but align the implementation with the current repo.

Important current repo reality:

- `src/components/lounge/LoungeAccessSection.tsx` currently uses a local `SimpleQr` SVG component, not `QRCodeSVG`.

- `LoungeMembership` currently has `passImage`, but does not have `qrSecret` or `qrImageUrl`.

- The sheet already has a basic PNG download button, but there is no fullscreen QR view.

- Do not assume `QRCodeSVG`, `qrSecret`, or `qrImageUrl` exist unless you add them intentionally.

Scope:

- Prefer a pure UI/ change- No changes.

- No Sup changes.

- No native integration.

- No QR library migration unless absolutely necessary.

:

-: `src/components/loungeAccess`

: `src/components/loungetests__/LoungeAccessSection.test.tsx`

---

## Part 1 — Add fullscreen QR view

In `src/components/lounge/LoungeAccessSection.tsx`, add fullscreen mode to `LoungeQrSheet`.

Current flow:

- User clicks a lounge card.

- `LoungeQrSheet` opens.

- The generated QR is shown using `SimpleQr`.

Add:

- local state:

  `const [fullscreen, setFullscreen] = useState(false);`

- a tappable QR surface around the generated QR:

  `data-testid="qr-open-fullscreen"`

- when clicked, set `fullscreen` to true.

- fullscreen overlay container:

  `data-testid="qr-fullscreen"`

Fullscreen requirements:

- fixed inset overlay above the normal sheet

- dark/black translucent background

- centered QR content

- close button top-right

- download button top-left

- close button keeps existing behavior and only closes fullscreen first

-

Add test IDs-data-testid-open-full `on- generated` data-testid="qr button:

-card If invent a fake test ID. Instead, test opening the lounge QR sheet card HDThedownloadP SVGpx exports HDRequirements:

 export at10241024

 white background generated remains

- filenamerufq-lugpng`

 toast  `Saved to downloads ·`

 show error do crash if/image serialization fails

Because code  `do not` QRCodeSVGRecommended approach:

 Render offscreen SVG string the same QR.

2. Either:

   - reuse `` via `renderToMarkup or

   - create a helper that produces equivalent SVG markup for the same QR value at 1024px.

3. Convert SVG string to an image.

4. Draw it onto a 1024×1024 canvas with white background.

5. Export with:

   `canvas.toDataURL("image/png")`

6. Trigger a download with a temporary anchor.

If using `renderToStaticMarkup`, import:

```ts

import { renderToStaticMarkup } from "react-dom/server";

Do not wrap imports in try/catch.

Use a helper like:

ts

function triggerDownload(dataUrl: string filename: string) {

  const = document.createa");

  a.href =Url a filename;

.body.appendChild(a);

 [a.click](http://a.click)();

  a.remove();

}

Part3 Optional uploaded image supportOnly implement this if product wants to upload an actual QR image separately from passIf uploaded QR1 AddqrImageUrl string toLoungeMembership`.

Add QR image upload lounge form.

Persist qrImageUrl.

If membership.qrImageUrl exists, render it instead of generated QR.

Add:

data-testid="qr-uploaded"

Download behavior for uploaded QR:

load source image into Image

draw at natural size

if smaller than 1024px, upscale to at least 1024px

set imageSmoothingEnabled = false

export PNG

Add tests for uploaded QR.

If not implementing qrImageUrl, do not write tests for uploaded QR image. Current passImage is not the same thing as uploaded QR.

Part 4 — Tests

Create:

src/components/lounge/__tests__/LoungeAccessSection.test.tsx

Use existing Vitest + Testing Library setup.

Mock:

@/lib/loungeMemberships

sonner

Current model seed match actualL`.

Minimum tests if only generated QR is implemented:

1.enders from memberships.

2. Clicking a lounge card opens LoungeQrSheet3.-open-full opens-fullscreen.

4. SVG exists Clicking-full - calls anchor data

.

If qrImageUrl, also add:

Uploaded QR fullscreen renders qr-uploaded image.

Uploaded QR download uses uploaded-image path and triggers download.

Test implementation details:

Stub HTMLCanvasElement.prototype.getContext.

Stub HTMLCanvasElement.prototype.toDataURL to return:

data:image/png;base64,FAKEHD

Spy on [HTMLAnchorElement.prototype.click](http://HTMLAnchorElement.prototype.click).

Mock Image loading if testing uploaded images.

Do not hit Supabase or real localStorage.

Avoid testing implementation internals; test user-visible behavior and download trigger.

Acceptance criteria

Existing lounge card flow still works.

Generated QR can open fullscreen.

Fullscreen has close and download buttons.

Download produces a 1024px-style PNG export path from generated QR.

Download filename matches:

rufayq-lounge-{program-slug}-{last4}.png

Success and error toasts are bilingual.

Tests cover generated QR fullscreen and download.

If uploaded QR support is added, tests cover uploaded QR fullscreen and download.

npm run typecheck passes.

`npm run test -- src/components/__testsLSection.ts``

**** Lov to implement the you to `qrImage to model.

For code the safest ask>.

Then uploaded image a separate---

status --short; nl -Access - '1,260p'; find src -maxdepth 3 -type f \( -name 'setup.ts' -o -name 'setupTests.ts' -o -name '*.test.tsx' \) | sort | sed -n '1,120p'; nl -ba vitest.config.ts 2>/dev/null || true; nl -ba vite.config.ts | sed -n '1,80p'

✅ `nl -ba src/components/lounge/LoungeAccessSection.tsx | sed -n '53,90p'; nl -ba src/lib/loungeMemberships.ts | sed -n '1p -nqreactqr package-lock.json src -S