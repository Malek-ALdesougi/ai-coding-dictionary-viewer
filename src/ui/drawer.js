// Browse drawer: every term grouped by section, plus recently viewed.
import { nodes, byId, SECTIONS, LEVELS, lvBars } from "../data.js";
import { state, set, on, levelOff } from "../state.js";
import { select } from "../selection.js";
import { $, esc, store } from "../lib/dom.js";
import { trap } from "../lib/trap.js";

const drawer = $("drawer"), KEY = "dict-recents";
let recents = [];
try { recents = JSON.parse(store.get(KEY, "[]")).filter(id => byId.has(id)); } catch { recents = []; }
let dtrap;

export const setDrawer = open => set(open ? { drawer: true, popover: null } : { drawer: false });
export const toggleDrawer = () => setDrawer(!state.drawer);

function build() {
  const secs = SECTIONS.length ? SECTIONS : [{ name: "All terms", terms: nodes.map(n => n.id) }];
  drawer.innerHTML = `<div class="dr-h"><span id="dr-title">Browse terms</span><button class="close-x" id="dr-x" aria-label="Close">×</button></div><div id="dr-recent"></div>`
    + secs.map((s, i) => `<details class="sec" open style="--c:var(--sec${i + 1})"><summary><span class="chev" aria-hidden="true"></span><span>${esc(s.name)}</span><span class="cnt">${s.terms.length}</span></summary>`
      + s.terms.filter(t => byId.has(t)).map(t => { const n = byId.get(t);
        return `<button class="row" data-id="${esc(t)}" title="${esc(n.plain)}"><span class="sw"></span><span class="nm">${esc(t)}</span><span class="lv" title="${LEVELS[n.level].label}">${lvBars(n.level)}</span></button>`; }).join("") + `</details>`).join("");
  renderRecents();
}
function renderRecents() {
  $("dr-recent").innerHTML = recents.length ? `<div class="dr-label">Recently viewed</div><div class="dr-chips">${recents.map(id => `<button data-id="${esc(id)}">${esc(id)}</button>`).join("")}</div>` : "";
}
function pushRecent(id) {
  recents = [id, ...recents.filter(x => x !== id)].slice(0, 6);
  store.set(KEY, JSON.stringify(recents));
  renderRecents();
}
function markRows(s) {
  drawer.querySelectorAll(".row").forEach(r => { r.classList.toggle("sel", !!s.selected && r.dataset.id === s.selected.id); r.classList.toggle("lvl-off", levelOff(byId.get(r.dataset.id))); });
}

export function init() {
  drawer.setAttribute("aria-labelledby", "dr-title");
  build();
  dtrap = trap(drawer, { initialFocus: () => drawer.querySelector(".row.sel") || $("dr-x") });
  drawer.addEventListener("click", e => {
    if (e.target.closest("#dr-x")) { setDrawer(false); return; }
    const r = e.target.closest("[data-id]");
    if (r) { select(r.dataset.id); if (state.phone) setDrawer(false); }
  });
  $("browse").onclick = e => { e.stopPropagation(); toggleDrawer(); };
  on("drawer", s => {
    drawer.classList.toggle("open", s.drawer);
    $("browse").classList.toggle("active", s.drawer);
    $("browse").setAttribute("aria-expanded", String(s.drawer));
    if (s.drawer) { drawer.querySelector(".row.sel")?.scrollIntoView({ block: "center" }); dtrap.on(); } else dtrap.off();
  });
  on(["selected", "level"], (s, keys) => {
    markRows(s);
    if (keys.has("selected") && s.selected) { pushRecent(s.selected.id); if (s.drawer) drawer.querySelector(".row.sel")?.scrollIntoView({ block: "nearest" }); }
  });
}
