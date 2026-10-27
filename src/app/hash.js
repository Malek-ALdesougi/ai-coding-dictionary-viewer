// Shareable links: #t=Term&v=timeline&m=list&l=beginner
import { state, on } from "../state.js";
import { byId } from "../data.js";
import { select } from "../selection.js";
import { setView, setTlMode } from "./views.js";
import { setLevel } from "../ui/levels.js";
import { fitAll } from "../graph/camera.js";

let ready = false, applying = false;   // never write the hash before the incoming one has been read

function write() {
  if (!ready || applying) return;
  const p = new URLSearchParams(), s = state;
  if (s.selected) p.set("t", s.selected.id);
  if (s.view !== "graph") p.set("v", s.view);
  if (s.view === "timeline" && s.tlMode === "list") p.set("m", "list");
  if (s.level !== "all") p.set("l", s.level);
  const h = p.toString();
  try { history.replaceState(null, "", h ? "#" + h : location.pathname + location.search); } catch { /* file:// in some browsers */ }
}
const read = () => new URLSearchParams(location.hash.slice(1));
export const hasIncomingTerm = () => byId.has(read().get("t") || "");

/** Everything except the term (that needs the layout to have settled; see applyTerm). */
export function applyLayout() {
  const p = read();
  applying = true;
  try { setLevel(p.get("l")); setView(p.get("v")); setTlMode(p.get("m")); } finally { applying = false; }
}
/** On start-up never clear a term someone already picked while the layout was settling. */
export function applyTerm({ initial = false } = {}) {
  const t = read().get("t");
  applying = true;
  try {
    if (t && byId.has(t)) select(t);
    else if (state.selected && !initial) select(null);
    else if (!state.selected && state.view === "graph") fitAll();
  } finally { applying = false; }
  ready = true; write();
}

export function init() {
  on(["selected", "view", "tlMode", "level"], write);
  addEventListener("hashchange", () => { applyLayout(); applyTerm(); });
}
