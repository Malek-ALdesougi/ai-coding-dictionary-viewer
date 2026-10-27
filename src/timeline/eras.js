// Phone timeline: collapsible blocks of history, one open at a time, filterable by section.
import { tlNodes, byTime, SECTIONS, secVar } from "../data.js";
import { state, on } from "../state.js";
import { select } from "../selection.js";
import { esc, $ } from "../lib/dom.js";
import { scrollBehavior } from "../lib/env.js";
import { rowHTML, markRows } from "./rows.js";

const el = $("tl-eras");
const ERAS = [["roots", "Roots", "Before 2017"], ["17-22", "2017–2022", "Early language models"], ["2023", "2023", "Chatbots to tools"], ["2024", "2024", "Agents take shape"], ["2025a", "2025 · Jan–Jun", "Coding agents arrive"], ["2025b", "2025 · Jul–Dec", "Patterns of work"], ["2026", "2026", "Latest"]];
export function eraOf(n) {
  const [y, m] = n.history.date.split("-").map(Number);
  return y < 2017 ? "roots" : y <= 2022 ? "17-22" : y === 2023 ? "2023" : y === 2024 ? "2024" : y === 2025 ? ((m || 1) <= 6 ? "2025a" : "2025b") : "2026";
}
const ui = { open: new Set(), sec: -1 };      // local view state: which era is open, which section chip is on
const shortSec = i => ((SECTIONS[i] || {}).name || "Other").replace(/^The /, "").split(/[ ,]/)[0];
const chev = `<svg class="i chev" aria-hidden="true" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>`;

function render() {
  const sorted = tlNodes.slice().sort(byTime);
  let h = `<div class="wrap"><p class="lvintro era-intro">${tlNodes.length} terms in the order they appeared. Tap an era to open it.</p><div class="eras-chips" role="toolbar" aria-label="Filter by section">`
    + `<button class="ec${ui.sec === -1 ? " on" : ""}" data-s="-1" aria-pressed="${ui.sec === -1}">All</button>`
    + SECTIONS.map((s, i) => `<button class="ec${ui.sec === i ? " on" : ""}" data-s="${i}" aria-pressed="${ui.sec === i}"><i class="sw" style="background:${secVar(i)}"></i>${esc(shortSec(i))}</button>`).join("") + `</div>`;
  for (const [id, name, sub] of ERAS) {
    const all = sorted.filter(n => eraOf(n) === id); if (!all.length) continue;
    const list = all.filter(n => ui.sec === -1 || n.section === ui.sec), open = ui.open.has(id);
    const dots = [...new Set(all.map(n => n.section))].slice(0, 6).map(i => `<i class="sw" style="background:${secVar(i)}"></i>`).join("");
    const preview = all.slice().sort((a, b) => b.deg - a.deg).slice(0, 3).map(n => n.id).join(", ");
    const body = list.length ? list.map(n => rowHTML(n, { event: false, entered: true })).join("") : `<p class="lvintro">No ${esc(shortSec(ui.sec))} terms in this era.</p>`;
    h += `<section class="era${open ? " open" : ""}${list.length ? "" : " empty"}" data-e="${id}">`
      + `<button class="era-h" aria-expanded="${open}"><span class="era-l"><span class="era-n">${esc(name)}</span><span class="era-p">${esc(open ? sub : preview + "…")}</span></span>`
      + `<span class="era-r">${dots}<span class="era-c">${ui.sec === -1 ? all.length : list.length + "/" + all.length}</span>${chev}</span></button>`
      + `<div class="era-b">${body}</div></section>`;
  }
  const keep = el.scrollTop;
  el.innerHTML = h + `</div>`;
  el.scrollTop = keep;
  markRows();
}
/** Open the era holding the selected term (clearing a section filter that would hide it). */
function revealSelected() {
  const s = state.selected; if (!s || !s.history) return;
  const e = eraOf(s);
  if (ui.open.has(e) && (ui.sec === -1 || ui.sec === s.section)) return;
  ui.open = new Set([e]); if (ui.sec !== -1 && ui.sec !== s.section) ui.sec = -1;
  render();
}

export function init() {
  render();
  el.addEventListener("click", e => {
    const ec = e.target.closest(".ec");
    if (ec) { ui.sec = +ec.dataset.s; render(); return; }
    const eh = e.target.closest(".era-h");
    if (eh) {
      const id = eh.parentElement.dataset.e;
      if (ui.open.has(id)) ui.open.delete(id); else ui.open = new Set([id]);
      render();
      el.querySelector(`[data-e="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
      return;
    }
    const c = e.target.closest("[data-id]"); if (c) select(c.dataset.id);
  });
  el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { const r = e.target.closest(".trow"); if (r && e.target === r) { e.preventDefault(); select(r.dataset.id); } } });
  on(["selected", "tlMode"], s => {
    if (s.tlMode !== "eras") return;
    revealSelected(); markRows();
    if (s.selected && s.view === "timeline") setTimeout(() => el.querySelector(".trow.sel")?.scrollIntoView({ block: "center", behavior: scrollBehavior() }), 160);
  });
  on("view", s => { if (s.view === "timeline" && s.tlMode === "eras" && s.selected) setTimeout(() => el.querySelector(".trow.sel")?.scrollIntoView({ block: "center", behavior: scrollBehavior() }), 160); });
}
