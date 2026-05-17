import { expect, test } from "@playwright/test";

/**
 * Pixel screenshot regression for the chat inbox + people search rows
 * in both LTR (English) and RTL (Arabic) language modes.
 *
 * Fixtures live in src/pages/VisualHarness.tsx. If you intentionally
 * change row markup, re-run with `--update-snapshots`.
 */

const CASES = [
  { name: "inbox-ltr",  view: "inbox",  lang: "en", testId: "inbox-list"  },
  { name: "inbox-rtl",  view: "inbox",  lang: "ar", testId: "inbox-list"  },
  { name: "search-ltr", view: "search", lang: "en", testId: "search-list" },
  { name: "search-rtl", view: "search", lang: "ar", testId: "search-list" },
] as const;

for (const c of CASES) {
  test(`${c.name} matches baseline`, async ({ page }) => {
    await page.goto(`/visual/chat-inbox?view=${c.view}&lang=${c.lang}`);
    // Wait for the harness shell to mount (lazy route + fonts).
    const list = page.getByTestId(c.testId);
    await list.waitFor({ state: "visible" });
    // Let webfonts settle so initials don't snap before DM Sans loads.
    await page.evaluate(() => (document as any).fonts?.ready);
    await expect(list).toHaveScreenshot(`${c.name}.png`);
  });
}
