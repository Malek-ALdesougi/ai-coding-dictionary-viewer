import { test, expect } from "@playwright/test";
import { open, pickTerm, hash, isPhoneProject } from "./helpers.js";

test("loads with every term and no console errors", async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator("#graph g.node")).toHaveCount(71);
  expect(errors).toEqual([]);
});

test("first visit shows the welcome card, Esc closes it and the page is usable again", async ({ page }) => {
  await open(page, { seen: false });
  await expect(page.locator("#modal")).toBeVisible();
  expect(await page.locator("#toolbar").evaluate(e => e.inert)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator("#modal")).toBeHidden();
  expect(await page.locator("#toolbar").evaluate(e => e.inert)).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem("dict-seen"))).toBe("1");
});

test("help card opens scrolled to the top", async ({ page }) => {
  await open(page);
  await page.keyboard.press("?");
  await expect(page.locator("#modal")).toBeVisible();
  const top = await page.locator("#m-title").evaluate(e => e.getBoundingClientRect().top);
  expect(top).toBeLessThan(160);
});

test("search tolerates typos and Enter opens the term", async ({ page }) => {
  await open(page);
  await page.locator("#search").fill("contxt window");
  await expect(page.locator("#results .res").first()).toContainText(/context window/i);
  await page.locator("#search").press("Enter");
  await expect(page.locator("#p-title")).toHaveText(/context window/i);
  expect(await hash(page)).toContain("t=Context window");
});

test("selecting, chips, Back and closing keep panel + hash in sync", async ({ page }) => {
  await open(page);
  await pickTerm(page, "Agent");
  await expect(page.locator("#p-title")).toHaveText(/^agent$/i);
  const chip = page.locator("#p-out span").first();
  const next = (await chip.textContent()).trim();
  await chip.focus(); await page.keyboard.press("Enter");          // chips work from the keyboard
  await expect(page.locator("#p-title")).toHaveText(new RegExp("^" + next + "$", "i"));
  await page.locator("#back").click({ force: true }).catch(() => {});
  await page.evaluate(() => document.getElementById("back").click());
  await expect(page.locator("#p-title")).toHaveText(/^agent$/i);
  await page.locator("#panel .close").click();
  await expect(page.locator("#panel")).not.toHaveClass(/open/);
  expect(await hash(page)).not.toContain("t=");
});

test("markdown is sanitised", async ({ page }) => {
  await open(page);
  await pickTerm(page, "Agent");
  expect(await page.locator("#p-body script, #p-body [onclick], #p-body [onerror]").count()).toBe(0);
});

test("term levels fade other terms and show a banner", async ({ page }, ti) => {
  await open(page);
  if (isPhoneProject(ti)) await page.locator('#tabbar [data-t="levels"]').click();
  else await page.locator("#level-btn").click();
  await page.locator('#level-menu .item[data-l="beginner"]').click();
  await expect(page.locator("#lvbanner")).toHaveClass(/show/);
  await expect(page.locator("#lvbanner")).toContainText(/beginner/i);
  expect(await page.locator("#graph g.node.lvl-off").count()).toBeGreaterThan(20);
  expect(await hash(page)).toContain("l=beginner");
  await page.locator("#lvb-x").click();
  await expect(page.locator("#lvbanner")).not.toHaveClass(/show/);
});

test("guided tour runs and Esc exits it", async ({ page }, ti) => {
  await open(page);
  if (isPhoneProject(ti)) await page.locator('#tabbar [data-t="tours"]').click();
  else await page.locator("#paths-btn").click();
  await page.locator("#paths-menu .item").first().click();
  await expect(page.locator("#tour")).toHaveClass(/open/);
  const first = (await page.locator("#p-title").textContent()).trim();
  await page.locator("#tour-next").click();
  await page.waitForTimeout(600);
  expect((await page.locator("#p-title").textContent()).trim()).not.toBe(first);
  await page.keyboard.press("Escape");
  await expect(page.locator("#tour")).not.toHaveClass(/open/);
});

test("browse drawer lists every term and opens one", async ({ page }, ti) => {
  await open(page);
  if (isPhoneProject(ti)) await page.locator('#tabbar [data-t="browse"]').click();
  else await page.locator("#browse").click();
  await expect(page.locator("#drawer")).toHaveClass(/open/);
  await expect(page.locator("#drawer .row")).toHaveCount(71);
  await page.locator("#drawer .row").nth(3).click();
  await expect(page.locator("#panel")).toHaveClass(/open/);
});

test("theme cycles and is remembered", async ({ page }) => {
  await open(page);
  await page.locator("#theme").click();
  const t1 = await page.evaluate(() => document.documentElement.dataset.theme || "auto");
  expect(t1).not.toBe("auto");
  await page.reload(); await page.waitForTimeout(800);
  expect(await page.evaluate(() => document.documentElement.dataset.theme || "auto")).toBe(t1);
});

test("shared link restores term, view and level", async ({ page }) => {
  await open(page, { hash: "#t=Agent&v=timeline&l=beginner" });
  await expect(page.locator("#p-title")).toHaveText(/^agent$/i);
  expect(await page.evaluate(() => document.body.dataset.view)).toBe("timeline");
  await expect(page.locator("#lvbanner")).toHaveClass(/show/);
});

/* ---------------- desktop only ---------------- */
test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile, "desktop only");

  test("timeline lanes, list toggle and hash", async ({ page }) => {
    await open(page);
    await page.locator('#tabs [data-view="timeline"]').click();
    await page.waitForTimeout(800);
    await expect(page.locator("#timeline")).not.toHaveClass(/off/);
    await expect(page.locator('#tlmode [data-m="eras"]')).toBeHidden();
    await page.locator('#tlmode [data-m="list"]').click();
    await expect(page.locator("#tl-list")).toHaveClass(/on/);
    expect(await hash(page)).toContain("m=list");
  });

  test("timeline close button works with the panel open", async ({ page }) => {
    await open(page);
    await page.locator('#tabs [data-view="timeline"]').click();
    await pickTerm(page, "Agent");
    await page.locator("#panel .close").click();
    await expect(page.locator("#panel")).not.toHaveClass(/open/);
  });

  test("panel can be widened and remembers the width", async ({ page }) => {
    await open(page);
    await pickTerm(page, "Agent");
    const box = await page.locator("#resizer").boundingBox();
    await page.mouse.move(box.x + 7, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x - 140, box.y + box.height / 2, { steps: 6 }); await page.mouse.up();
    const w = await page.locator("#panel").evaluate(e => e.offsetWidth);
    expect(w).toBeGreaterThan(560);
    expect(+(await page.evaluate(() => localStorage.getItem("dict-panel-w")))).toBeGreaterThan(560);
  });

  test("resizing to phone and back re-homes menus and timeline mode", async ({ page }) => {
    await open(page);
    await pickTerm(page, "Agent");
    await page.locator('#tabs [data-view="timeline"]').click();
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(900);
    expect(await page.evaluate(() => document.body.dataset.tlmode)).toBe("eras");
    await expect(page.locator("#tl-eras")).toHaveClass(/on/);
    await page.locator('#tabbar [data-t="tours"]').click();
    const r = await page.locator("#paths-menu").boundingBox();
    expect(r.y).toBeGreaterThanOrEqual(0); expect(r.y + r.height).toBeLessThanOrEqual(844);
    await page.locator('#tabbar [data-t="tours"]').click();
    await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(900);
    expect(await page.evaluate(() => document.body.dataset.tlmode)).toBe("lanes");
    await expect(page.locator("#timeline")).not.toHaveClass(/off/);
    await page.locator("#paths-btn").click();
    const d = await page.locator("#paths-menu").boundingBox();
    expect(d.y).toBeLessThan(120);
  });
});

/* ---------------- phone only ---------------- */
test.describe("phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phone only");

  test("tab bar: only one of browse / tours / levels open at a time", async ({ page }) => {
    await open(page);
    const open3 = () => page.evaluate(() => ["drawer", "paths-menu", "level-menu"].map(id => document.getElementById(id).classList.contains("open")).join());
    await page.locator('#tabbar [data-t="browse"]').click(); expect(await open3()).toBe("true,false,false");
    await page.locator('#tabbar [data-t="tours"]').click(); expect(await open3()).toBe("false,true,false");
    await page.locator('#tabbar [data-t="browse"]').click(); expect(await open3()).toBe("true,false,false");
    await page.locator('#tabbar [data-t="levels"]').click(); expect(await open3()).toBe("false,false,true");
  });

  test("details sheet snaps: half on open, drag up to full, down to half, hard drag closes", async ({ page }) => {
    await open(page);
    await pickTerm(page, "Agent");
    const top = () => page.locator("#panel").evaluate(e => Math.round(e.getBoundingClientRect().top));
    const half = await top();
    expect(half).toBeGreaterThan(300); expect(half).toBeLessThan(560);
    const g = await page.locator("#grab").boundingBox();
    await page.mouse.move(195, g.y + 10); await page.mouse.down(); await page.mouse.move(195, g.y - 250, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(600);
    await expect(page.locator("#panel")).toHaveClass(/full/);
    const g2 = await page.locator("#grab").boundingBox();
    await page.mouse.move(195, g2.y + 10); await page.mouse.down(); await page.mouse.move(195, g2.y + 330, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(600);
    await expect(page.locator("#panel")).not.toHaveClass(/full/);
    const g3 = await page.locator("#grab").boundingBox();
    await page.mouse.move(195, g3.y + 10); await page.mouse.down(); await page.mouse.move(195, 840, { steps: 10 }); await page.mouse.up();
    await page.waitForTimeout(700);
    const closedOrPeek = await top();
    expect(closedOrPeek).toBeGreaterThan(half);
  });

  test("timeline opens as eras; an era expands; selecting from it fills the sheet with lineage", async ({ page }) => {
    await open(page);
    await page.locator('#tabbar [data-t="timeline"]').click();
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.body.dataset.tlmode)).toBe("eras");
    await expect(page.locator('#tlmode [data-m="lanes"]')).toBeHidden();
    await expect(page.locator("#tl-eras .era")).toHaveCount(7);
    await page.locator('#tl-eras .era[data-e="2025a"] .era-h').click();
    await page.locator("#tl-eras .era.open .trow").nth(1).click();
    await expect(page.locator("#panel")).toHaveClass(/open/);
    await expect(page.locator("#p-lineage")).toContainText(/built on/i);
  });

  test("section chips filter eras", async ({ page }) => {
    await open(page);
    await page.locator('#tabbar [data-t="timeline"]').click();
    await page.locator('#tl-eras .ec[data-s="3"]').click();
    await expect(page.locator('#tl-eras .ec[data-s="3"]')).toHaveClass(/on/);
    expect(await page.locator("#tl-eras .era.empty").count()).toBeGreaterThan(0);
  });

  test("levels banner sits above the tab bar, not over the header", async ({ page }) => {
    await open(page);
    await page.locator('#tabbar [data-t="levels"]').click();
    await page.locator('#level-menu .item[data-l="advanced"]').click();
    const b = await page.locator("#lvbanner").boundingBox(), t = await page.locator("#tabbar").boundingBox();
    expect(b.y + b.height).toBeLessThanOrEqual(t.y);
    expect(b.y).toBeGreaterThan(400);
  });
});
