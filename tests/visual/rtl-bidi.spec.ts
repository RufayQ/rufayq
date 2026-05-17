import { expect, test, type Page, type Locator } from "@playwright/test";

/**
 * End-to-end assertions for RTL/bidi behavior in the chat inbox and
 * people-search rows. We force an ambient RTL document (html dir="rtl",
 * lang="ar") via the harness `?dir=rtl` param, then assert:
 *
 *  - row containers stay LTR so flex order (avatar → text → meta) does
 *    NOT mirror — geometry must be deterministic regardless of ancestor
 *  - Arabic display names resolve to a computed RTL direction
 *  - Latin display names resolve to a computed LTR direction
 *  - rufayq_id stays LTR even inside an RTL ancestor (mixed-script safety)
 *  - text alignment of the truncating <p> follows the resolved direction
 *
 * These complement the pixel screenshots: pixels catch visual drift,
 * these assertions catch *semantic* bidi/dir drift even if pixels happen
 * to look identical.
 */

async function openHarness(page: Page, view: "inbox" | "search") {
  await page.goto(`/visual/chat-inbox?view=${view}&lang=ar&dir=rtl`);
  await page.getByTestId(`${view}-list`).waitFor({ state: "visible" });
  await page.evaluate(() => (document as any).fonts?.ready);
}

/** Resolved (computed) direction of an element — handles dir="auto". */
async function computedDir(loc: Locator): Promise<"ltr" | "rtl"> {
  return loc.evaluate(
    (el) => getComputedStyle(el as HTMLElement).direction as "ltr" | "rtl",
  );
}

async function textAlign(loc: Locator): Promise<string> {
  return loc.evaluate((el) => getComputedStyle(el as HTMLElement).textAlign);
}

test.describe("RTL bidi — chat inbox", () => {
  test.beforeEach(async ({ page }) => {
    await openHarness(page, "inbox");
  });

  test("html document is RTL but row containers stay LTR", async ({ page }) => {
    const html = page.locator("html");
    expect(await computedDir(html)).toBe("rtl");

    // Every inbox row pins dir="ltr" so geometry doesn't mirror.
    const rows = page.locator('[data-testid^="inbox-row-"]');
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      expect(await computedDir(rows.nth(i))).toBe("ltr");
    }
  });

  test("Arabic name resolves to RTL, Latin name resolves to LTR", async ({ page }) => {
    const arabicName = page
      .locator('[data-testid="inbox-row-dir-1"] p[dir="auto"]')
      .first();
    const latinName = page
      .locator('[data-testid="inbox-row-dir-2"] p[dir="auto"]')
      .first();

    await expect(arabicName).toHaveText("أحمد القحطاني");
    await expect(latinName).toHaveText("Maria Lopez");

    expect(await computedDir(arabicName)).toBe("rtl");
    expect(await computedDir(latinName)).toBe("ltr");

    // text-align should follow resolved direction (start = right for RTL).
    expect(await textAlign(arabicName)).toMatch(/right|start/);
    expect(await textAlign(latinName)).toMatch(/left|start/);
  });

  test("avatar sits on the visual left of the row even under RTL ancestor", async ({ page }) => {
    const row = page.locator('[data-testid="inbox-row-dir-1"]');
    const avatar = row.locator("div").first(); // first flex child = avatar
    const meta = row.locator('[dir="ltr"].text-right');

    const avatarBox = await avatar.boundingBox();
    const metaBox = await meta.boundingBox();
    expect(avatarBox && metaBox).toBeTruthy();
    // Avatar must be left of the meta column — proves the row didn't mirror.
    expect(avatarBox!.x).toBeLessThan(metaBox!.x);
  });
});

test.describe("RTL bidi — people search", () => {
  test.beforeEach(async ({ page }) => {
    await openHarness(page, "search");
  });

  test("rufayq_id stays LTR even inside RTL ancestor", async ({ page }) => {
    // Row d2 has an Arabic display name + Latin rufayq_id — the riskiest
    // mixed-script case for bidi flipping.
    const row = page.locator('[data-testid="search-row-d2"]');
    const name = row.locator('p[dir="auto"]').first();
    const rufayqId = row.locator('p[dir="ltr"]').first();

    await expect(name).toHaveText("أحمد القحطاني");
    await expect(rufayqId).toHaveText("rq-9XQ1");

    expect(await computedDir(name)).toBe("rtl");
    expect(await computedDir(rufayqId)).toBe("ltr");
  });

  test("emoji-prefixed name still resolves to LTR for Latin body", async ({ page }) => {
    const row = page.locator('[data-testid="search-row-d3"]');
    const name = row.locator('p[dir="auto"]').first();
    await expect(name).toHaveText("🌙 Dr. Sara");
    // Latin script body should win over leading emoji → LTR.
    expect(await computedDir(name)).toBe("ltr");
  });

  test("search row container stays LTR (avatar left of chevron)", async ({ page }) => {
    const row = page.locator('[data-testid="search-row-d2"]');
    expect(await computedDir(row)).toBe("ltr");

    const avatar = row.locator("div").first();
    const chevron = row.locator("svg").last();
    const a = await avatar.boundingBox();
    const c = await chevron.boundingBox();
    expect(a && c).toBeTruthy();
    expect(a!.x).toBeLessThan(c!.x);
  });
});
