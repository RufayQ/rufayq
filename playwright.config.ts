import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression tests for the chat inbox + people search.
 *
 * Runs against the dev-only harness route /visual/chat-inbox, which
 * renders deterministic fixtures (no Supabase, no network) so pixel
 * snapshots are stable. We only run a single chromium project at a
 * fixed 390×900 viewport (the mobile shell) to keep baselines small.
 *
 * Update baselines:    bunx playwright test --update-snapshots
 * Run tests:           bunx playwright test
 * Open last report:    bunx playwright show-report
 */
export default defineConfig({
  testDir: "./tests/visual",
  snapshotDir: "./tests/visual/__screenshots__",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    // Disable animations + caret blink so screenshots are deterministic.
    actionTimeout: 10_000,
    trace: "off",
  },
  expect: {
    toHaveScreenshot: {
      // Allow tiny anti-aliasing diffs that vary between machines/fonts.
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"], viewport: { width: 390, height: 900 } },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:8080/visual/chat-inbox?view=inbox&lang=en",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
