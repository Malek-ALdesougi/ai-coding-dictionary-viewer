// Visual regression: reference images live in tests/visual.spec.js-snapshots/.
// After an intended visual change: npx playwright test visual --update-snapshots
import { test, expect } from "@playwright/test";
import { open, pickTerm, isPhoneProject } from "./helpers.js";

for (const scheme of ["light", "dark"]) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme, reducedMotion: "reduce" });
    test(`home ${scheme}`, async ({ page }) => {
      await open(page);
      await expect(page).toHaveScreenshot(`home-${scheme}.png`, { mask: [page.locator("#graph")] });
    });
    test(`term ${scheme}`, async ({ page }) => {
      await open(page);
      await pickTerm(page, "Agent");
      await expect(page).toHaveScreenshot(`term-${scheme}.png`, { mask: [page.locator("#graph")] });
    });
    test(`timeline ${scheme}`, async ({ page }, ti) => {
      await open(page);
      await page.locator(isPhoneProject(ti) ? '#tabbar [data-t="timeline"]' : '#tabs [data-view="timeline"]').click();
      await page.waitForTimeout(1500);
      await expect(page).toHaveScreenshot(`timeline-${scheme}.png`, { mask: [page.locator("#timeline")] });
    });
    test(`menus ${scheme}`, async ({ page }, ti) => {
      await open(page);
      await page.locator(isPhoneProject(ti) ? '#tabbar [data-t="tours"]' : "#paths-btn").click();
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`tours-${scheme}.png`, { mask: [page.locator("#graph")] });
    });
    test(`help ${scheme}`, async ({ page }) => {
      await open(page);
      await page.keyboard.press("?");
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`help-${scheme}.png`);
    });
  });
}
