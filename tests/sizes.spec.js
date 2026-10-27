import { test, expect } from "@playwright/test";
import path from "path";
const APP = "file://" + path.resolve("dist/index.html");
for (const [n,w,h] of [["tablet",768,1024],["landscape",844,390],["wide",1280,800],["phone",390,844]])
for (const th of ["light","dark"])
test(`${n} ${th}`, async ({ browser }) => {
  const c = await browser.newContext({ viewport:{width:w,height:h}, colorScheme:th, reducedMotion:"reduce" });
  const p = await c.newPage(); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
  await p.addInitScript(()=>localStorage.setItem("dict-seen","1"));
  await p.goto(APP); await p.waitForSelector(".node");
  const ov = await p.evaluate(()=>document.documentElement.scrollWidth - innerWidth);
  expect(ov).toBeLessThanOrEqual(0); expect(errs).toEqual([]);
  await p.close(); await c.close();
});
