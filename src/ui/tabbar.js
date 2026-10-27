// Phone bottom tab bar (Graph · Timeline · Browse · Tours · Levels) and the floating "Show all" button.
import { state, set, on } from "../state.js";
import { setView } from "../app/views.js";
import { togglePopover } from "./menus.js";
import { fitAll } from "../graph/camera.js";
import { $ } from "../lib/dom.js";

const bar = $("tabbar");
function sync(s) {
  const active = { graph: s.view === "graph", timeline: s.view === "timeline", browse: s.drawer, tours: s.popover === "tours" || !!s.tour, levels: s.popover === "levels" };
  bar.querySelectorAll("button").forEach(b => {
    const t = b.dataset.t;
    b.classList.toggle("on", !!active[t]);
    if (t === "graph" || t === "timeline") { if (active[t]) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); }
    else b.setAttribute("aria-expanded", String(!!active[t]));
    if (t === "levels") b.classList.toggle("flag", s.level !== "all");
  });
}
export function init() {
  bar.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    e.stopPropagation();
    const t = b.dataset.t;
    if (t === "graph" || t === "timeline") { set({ popover: null, drawer: false }); setView(t); }
    else if (t === "browse") set(state.drawer ? { drawer: false } : { drawer: true, popover: null });
    else togglePopover(t === "tours" ? "tours" : "levels");   // also closes the drawer on phones
  });
  $("fab-fit").onclick = () => fitAll();
  sync(state);
  on(["view", "drawer", "popover", "tour", "level"], sync);
}
