# Remove fake status bar (Option 1) + spacing & shell refinements

## Goals
1. Remove the cosmetic time/signal/battery bar from every in-app screen.
2. Reclaim the ~44px without shifting or clipping any header content.
3. Keep the marketing "phone mockup" chrome (rounded frame, ring, shadow) so the desktop preview still looks like a device — just without the duplicated fake status row.

## Changes

### 1. `src/pages/Index.tsx` — drop StatusBar from the shell
- Remove the `import StatusBar from "@/components/StatusBar"` line.
- Delete the `showStatusBar` flag and the entire `{showStatusBar && (...)}` block (lines 527, 567–571).
- The teal gradient wrapper around StatusBar goes with it; each screen's own header (HomeHeader, section headers, Login/Onboarding splashes) already paints its own top background edge-to-edge, so the phone frame's top inner edge will now be the header itself.

### 2. Safe-area / header top padding
Screens currently rely on StatusBar providing the first 44px of vertical breathing room above their header content. After removal, bump the top padding on the screens whose first element sits flush to the top:
- `src/components/home/HomeHeader.tsx`: change `pt-3` → `pt-6` (adds 12px so the wordmark/avatar row clears the rounded phone notch area).
- `src/screens/JourneyScreen.tsx`, `RecordsScreen.tsx`, `CareHubScreen.tsx`, `MedicationsScreen.tsx`, `ProfileScreen.tsx`, `SettingsScreen.tsx`, `SupportScreen.tsx`, `PricingScreen.tsx`, `NotificationSettingsScreen.tsx`, `ChatScreen.tsx`: audit each section header's top padding and add the same ~12px bump only where the header currently starts at `pt-2`/`pt-3`. Leave screens that already use `pt-5`+ untouched.
- `LoginScreen.tsx` / `OnboardingScreen.tsx`: already full-bleed hero — no change needed beyond verifying their internal top padding.

Use `env(safe-area-inset-top)` via a wrapper style on the phone shell content div so native Android builds inside Capacitor still respect the device notch:
```tsx
<div className="flex-1 flex flex-col overflow-hidden min-h-0"
     style={{ background: "var(--off-white)",
              paddingBottom: showNav ? 64 : 0,
              paddingTop: "env(safe-area-inset-top, 0px)" }}>
```
This only adds padding on real devices (web preview returns 0px), so the desktop mockup is unaffected.

### 3. Phone shell preview — keep chrome, drop duplication
The outer frame in `Index.tsx` (lines 556–566) — rounded 44px corners, 8px `phone-ring`, soft shadow — stays exactly as-is. That's the "phone chrome" the user wants to keep. Removing only the inner StatusBar row achieves the goal without touching the mockup look.

Optional polish (low risk):
- Add a subtle 24px-wide × 6px-tall "notch" pill centered at the top of the frame for the marketing illusion, rendered as an absolutely-positioned div inside the shell:
```tsx
<div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none
                w-[88px] h-[22px] rounded-full"
     style={{ background: "#000" }} />
```
Only renders on ≥500px viewports (hidden on `max-[500px]` via the same responsive override pattern already used on the frame). This preserves the "phone preview" feel without the fake clock.

### 4. Tests
- `src/pages/__tests__/Index.regression.test.tsx`: remove the `vi.mock("@/components/StatusBar", ...)` line (line 55) and any `getByTestId("status-bar")` assertions (search and clean up).
- Run vitest to confirm green.

### 5. Cleanup
- Delete `src/components/StatusBar.tsx` (no remaining importers after step 1).
- `LanguageSwitcher` is still imported by Settings, so it stays.

## Out of scope
- Native Capacitor status bar plugin config (already handled separately; only the in-canvas fake bar is being removed).
- Any changes to header colors, gradients, or notification/menu placement.

## Files touched
- `src/pages/Index.tsx` (remove StatusBar + add safe-area padding + optional notch)
- `src/components/home/HomeHeader.tsx` (top padding bump)
- ~6–8 screen files (small `pt-*` bumps where headers were flush)
- `src/pages/__tests__/Index.regression.test.tsx` (drop mock + assertions)
- Delete `src/components/StatusBar.tsx`
