// Search box: names first, then plain-English lines, definitions and full entries. Typos are fine (Fuse.js).
import Fuse from "fuse.js";
import { nodes, lvBars, secVar } from "../data.js";
import { state, set, on } from "../state.js";
import { select } from "../selection.js";
import { $, esc } from "../lib/dom.js";

const search = $("search"), results = $("results");
const fuse = new Fuse(nodes, {
  keys: [{ name: "id", weight: 4 }, { name: "plain", weight: 1.5 }, { name: "description", weight: 1 }, { name: "body", weight: 0.35 }],
  includeScore: true, includeMatches: true, ignoreLocation: true, threshold: 0.34, minMatchCharLength: 2,
});
const MAX = 8;
let items = [], idx = -1;

/** Fuse ranking, nudged so exact / prefix / word-start name hits always lead, plus "all words somewhere" matches. */
function rank(q) {
  const words = q.split(/\s+/).filter(Boolean), byNode = new Map();
  for (const r of fuse.search(q)) {
    const name = r.item.id.toLowerCase();
    let s = r.score;
    if (name === q) s -= 3; else if (name.startsWith(q)) s -= 2; else if (name.split(/[\s\-.]+/).some(w => w.startsWith(q))) s -= 1.5; else if (name.includes(q)) s -= 1;
    byNode.set(r.item, { n: r.item, s, nameMatch: r.matches?.find(m => m.key === "id") });
  }
  if (words.length > 1) for (const n of nodes) {
    if (byNode.has(n)) continue;
    const hay = `${n.id} ${n.plain || ""} ${n.description || ""}`.toLowerCase();
    if (words.every(w => hay.includes(w))) byNode.set(n, { n, s: 0.5 });
  }
  return [...byNode.values()].sort((a, b) => a.s - b.s || a.n.id.localeCompare(b.n.id));
}

const mark = (text, q) => {
  const i = text.toLowerCase().indexOf(q);
  return i < 0 ? esc(text) : esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
};
function markName(r, q) {                       // exact substring if there is one, else Fuse's fuzzy match ranges
  const t = r.n.id;
  if (t.toLowerCase().includes(q) || !r.nameMatch) return mark(t, q);
  let out = "", at = 0;
  for (const [a, b] of r.nameMatch.indices.filter(([a, b]) => b - a >= 1)) { out += esc(t.slice(at, a)) + "<mark>" + esc(t.slice(a, b + 1)) + "</mark>"; at = b + 1; }
  return out + esc(t.slice(at));
}
function snippet(n, q) {
  const body = (n.body || "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`>|#-]+/g, " ").replace(/\s+/g, " ");
  const lead = n.plain || n.description || "";
  const src = [lead, n.description || "", body].find(t => t.toLowerCase().includes(q)) || lead;
  const i = src.toLowerCase().indexOf(q);
  if (i < 0) return esc(src.length > 110 ? src.slice(0, 107) + "…" : src);
  const a = Math.max(0, i - 40), b = Math.min(src.length, i + q.length + 70);
  return (a ? "…" : "") + mark(src.slice(a, b), q) + (b < src.length ? "…" : "");
}

function hide() { results.classList.remove("open"); search.setAttribute("aria-expanded", "false"); search.removeAttribute("aria-activedescendant"); }
export const hideResults = hide;
export const resultsOpen = () => results.classList.contains("open");
function highlight(i) {
  idx = i;
  results.querySelectorAll(".res").forEach((r, j) => { r.classList.toggle("on", j === i); r.setAttribute("aria-selected", String(j === i)); });
  const cur = results.querySelector(".res.on");
  if (cur) { search.setAttribute("aria-activedescendant", cur.id); cur.scrollIntoView({ block: "nearest" }); }
}
function run() {
  const raw = search.value.trim(), q = raw.toLowerCase();
  if (!q) { set({ matches: null }); hide(); return; }
  const ranked = rank(q);
  set({ matches: new Set(ranked.map(r => r.n.id)), popover: null });
  items = ranked.slice(0, MAX).map(r => r.n);
  results.innerHTML = items.length
    ? ranked.slice(0, MAX).map((r, i) => `<div class="res" id="res-${i}" role="option" aria-selected="false" data-id="${esc(r.n.id)}" style="--c:${secVar(r.n.section)}"><span class="sw"></span><span class="nm">${markName(r, q)}</span><span class="lv">${lvBars(r.n.level)}</span><span class="sn">${snippet(r.n, q)}</span></div>`).join("")
      + (ranked.length > MAX ? `<div class="res-empty">+ ${ranked.length - MAX} more highlighted on the map</div>` : "")
    : `<div class="res-empty">No term matches “${esc(raw)}”. Try a shorter word, or open <b>Browse terms</b> to see them all.</div>`;
  results.classList.add("open"); search.setAttribute("aria-expanded", "true");
  highlight(items.length ? 0 : -1);
}
export function clearSearch() { search.value = ""; set({ matches: null }); hide(); }
function pick(id) { clearSearch(); select(id); search.blur(); }

export function init() {
  search.addEventListener("input", run);
  search.addEventListener("focus", () => { if (search.value.trim()) run(); });
  results.addEventListener("mousedown", e => { const r = e.target.closest(".res"); if (r) { e.preventDefault(); pick(r.dataset.id); } });
  results.addEventListener("mousemove", e => { const r = e.target.closest(".res"); if (r) { const i = [...results.querySelectorAll(".res")].indexOf(r); if (i !== idx) highlight(i); } });
  search.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (items.length) highlight((idx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length); }
    else if (e.key === "Enter") { const n = items[Math.max(0, idx)]; if (n && resultsOpen()) pick(n.id); }
    else if (e.key === "Escape") { clearSearch(); search.blur(); }
  });
  document.addEventListener("click", e => { if (!e.target.closest(".searchbox")) hide(); });
  on(["popover", "drawer", "selected"], s => { if (s.popover || s.drawer || s.selected) hide(); });
}
