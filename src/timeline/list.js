// Timeline as a plain dated list, grouped by year.
import { group } from "d3";
import { tlNodes, byTime } from "../data.js";
import { state, on } from "../state.js";
import { select } from "../selection.js";
import { motion, scrollBehavior } from "../lib/env.js";
import { $ } from "../lib/dom.js";
import { rowHTML, markRows } from "./rows.js";

const el = $("tl-list");
function build() {
  let html = `<div class="wrap"><div class="jump"><span>Jump to</span><button data-j="first">Roots</button><button data-j="2017">The LLM era</button><button data-j="last">Latest</button></div>`;
  for (const [y, arr] of group(tlNodes.slice().sort(byTime), n => Math.floor(n.t)))
    html += `<section class="ygroup" data-y="${y}"><h3 class="yr">${y}</h3><div class="yitems">${arr.map(n => rowHTML(n)).join("")}</div></section>`;
  el.innerHTML = html + `</div>`;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { root: el, threshold: 0.05 });
  el.querySelectorAll(".trow").forEach((r, i) => { if (motion.reduce) r.classList.add("in"); else { r.style.transitionDelay = (i % 5) * 45 + "ms"; io.observe(r); } });
}
export const scrollToSelected = () => el.querySelector(".trow.sel")?.scrollIntoView({ block: "center", behavior: scrollBehavior() });

export function init() {
  build();
  el.addEventListener("click", e => {
    const j = e.target.closest("[data-j]");
    if (j) {
      const w = j.dataset.j;
      if (w === "first") el.scrollTo({ top: 0, behavior: scrollBehavior() });
      else if (w === "last") el.scrollTo({ top: el.scrollHeight, behavior: scrollBehavior() });
      else [...el.querySelectorAll(".ygroup")].find(x => +x.dataset.y >= +w)?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
      return;
    }
    const c = e.target.closest("[data-id]"); if (c) select(c.dataset.id);
  });
  el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { const r = e.target.closest(".trow"); if (r && e.target === r) { e.preventDefault(); select(r.dataset.id); } } });
  markRows();
  on(["selected", "level"], markRows);
  on(["selected", "view", "tlMode"], s => { if (s.selected && s.view === "timeline" && s.tlMode === "list") setTimeout(scrollToSelected, 160); });
}
