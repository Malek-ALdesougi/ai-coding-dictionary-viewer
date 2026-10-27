// Run: npx playwright test            (builds nothing; point APP at a built file)
//      APP=dist/index.html npx playwright test
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  expect: { timeout: 15_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled", timeout: 15_000 } },
  fullyParallel: true,
  reporter: [["list"]],
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, browserName: "chromium" } },
  ],
});
