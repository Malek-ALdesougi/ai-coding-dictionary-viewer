import path from "node:path";
import { pathToFileURL } from "node:url";
export const APP = pathToFileURL(path.resolve(process.env.APP || "dist/index.html")).href;
export const isPhoneProject = testInfo => testInfo.project.name === "phone";

/** Open the app. `seen` skips the first-visit welcome card. Collects console errors. */
export async function open(page, { seen = true, hash = "" } = {}) {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  if (seen) await page.addInitScript(() => { try { localStorage.setItem("dict-seen", "1"); } catch (e) {} });
  await page.goto(APP + hash);
  await page.locator("#graph g.node").first().waitFor({ state: "attached" });
  await page.waitForTimeout(1800);                       // let the force layout settle
  return errors;
}
/** Pick a term the way a person would: through search. */
export async function pickTerm(page, name) {
  await page.locator("#search").fill(name);
  await page.locator("#results .res").first().waitFor();
  await page.locator("#search").press("Enter");
  await page.locator("#panel.open").waitFor();
  await page.waitForTimeout(900);
}
export const hash = page => page.evaluate(() => decodeURIComponent(location.hash.replace(/\+/g, " ")));
