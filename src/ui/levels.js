// "Term levels": fade every term that is not Beginner / Intermediate / Advanced, with a banner saying so.
import { nodes, LEVELS, lvBars, levelCounts } from "../data.js";
import { state, set, on } from "../state.js";
import { closePopover } from "./menus.js";
import { $, esc } from "../lib/dom.js";

const HELP = { beginner: "Everyday ideas you meet on day one.", intermediate: "How the pieces fit together in real projects.", advanced: "The technical mechanics behind cost and quality." };
const examples = l => nodes.filter(n => n.level === l).sort((x, y) => y.deg - x.deg).slice(0, 4).map(n => n.id).join(", ");
export const setLevel = l => set({ level: LEVELS[l] ? l : "all" });

function sync(s) {
  const lv = s.level, menu = $("level-menu");
  menu.querySelectorAll(".item").forEach(b => { b.classList.toggle("on", b.dataset.l === lv); b.setAttribute("aria-checked", String(b.dataset.l === lv)); });
  $("level-lbl").textContent = lv === "all" ? "Term levels" : "Levels: " + LEVELS[lv].label;
  $("level-btn").classList.toggle("active", lv !== "all");
  const bn = $("lvbanner");
  if (lv === "all") { bn.classList.remove("show"); return; }
  const c = levelCounts[lv] || 0, o = nodes.length - c;
  $("lvb-t").innerHTML = `Showing ${c} ${LEVELS[lv].label.toLowerCase()} terms<span class="lvlong">. The other ${o} are faded.</span><span class="lvshort"> · ${o} faded</span>`;
  bn.classList.add("show");
}

export function init() {
  const menu = $("level-menu");
  menu.setAttribute("role", "menu");
  menu.innerHTML = `<div class="dr-label">How technical?</div><p class="lvintro">Pick a level and only those terms stay bright on the map and lists. The rest fade back, never disappear.</p>`
    + `<button class="item" role="menuitemradio" data-l="all"><div class="it-t">Everything <span class="cnt">${nodes.length}</span></div><div class="it-s">No filter. Every term at full brightness.</div></button>`
    + Object.keys(LEVELS).map(l => `<button class="item" role="menuitemradio" data-l="${l}"><div class="it-t">${lvBars(l)} ${LEVELS[l].label} <span class="cnt">${levelCounts[l] || 0}</span></div><div class="it-s">${HELP[l]}<br><i>e.g. ${esc(examples(l))}</i></div></button>`).join("");
  menu.onclick = e => { const b = e.target.closest(".item"); if (b) { setLevel(b.dataset.l); closePopover(); } };
  $("lvb-x").onclick = () => setLevel("all");
  sync(state);
  on("level", sync);
}
