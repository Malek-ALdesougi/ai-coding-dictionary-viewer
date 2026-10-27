// Phone details sheet: three snap heights (peek / half / full), dragged by the handle or header,
// or anywhere on the sheet while it is not full. A hard drag down from peek closes it.
import { state, set, on } from "../state.js";
import { select } from "../selection.js";
import { isPhone } from "../lib/env.js";
import { $ } from "../lib/dom.js";
import { sheetH, snapY, PEEK_H } from "../layout.js";

const panel = $("panel"), docEl = document.documentElement;
let reframe = () => {}, byUser = false;   // only a drag/tap re-frames the graph; snaps caused by selecting don't
export const onSheetMove = fn => { reframe = fn; };

/** Position the sheet for the current snap (call after the viewport changes too). */
export function placeSheet() {
  if (!isPhone()) { panel.classList.remove("full"); panel.style.removeProperty("--sy"); docEl.style.removeProperty("--sheet-vis"); return; }
  const sn = state.sheetSnap;
  panel.classList.toggle("full", sn === "full");
  panel.style.setProperty("--sy", snapY(sn) + "px");
  docEl.style.setProperty("--sheet-vis", sheetH() - snapY(sn === "full" ? "half" : sn) + "px");
}

function attachDrag() {
  let d = null;
  const grabbing = t => t.closest("#grab, .p-head");
  const move = e => {
    if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dy) > 8) { d.moved = true; panel.classList.add("dragging"); }
    if (d.moved) panel.style.setProperty("--sy", Math.max(0, Math.min(sheetH() - 40, d.y0 + dy)) + "px");
  };
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    removeEventListener("pointermove", move); removeEventListener("pointerup", end); removeEventListener("pointercancel", end);
    const dd = d; d = null; panel.classList.remove("dragging");
    if (!dd.moved) {                                    // a tap on the handle/header steps through the heights
      if (dd.tap && e.type === "pointerup") { byUser = true; set({ sheetSnap: state.sheetSnap === "peek" ? "half" : state.sheetSnap === "half" ? "full" : "half" }); }
      return;
    }
    const y = Math.max(0, Math.min(sheetH(), dd.y0 + e.clientY - dd.y)), v = (e.clientY - dd.y) / Math.max(1, performance.now() - dd.t);
    if (y > sheetH() - PEEK_H + 70 || (v > 1.2 && state.sheetSnap === "peek")) { select(null); placeSheet(); return; }
    const cands = [["full", 0], ["half", snapY("half")], ["peek", snapY("peek")]];
    let best = cands.reduce((a, c) => (Math.abs(c[1] - y) < Math.abs(a[1] - y) ? c : a));
    if (Math.abs(v) > 0.6) { const i = cands.findIndex(c => c[0] === state.sheetSnap); best = cands[Math.max(0, Math.min(2, i + (v > 0 ? 1 : -1)))]; }
    if (best[0] === state.sheetSnap) placeSheet(); else { byUser = true; set({ sheetSnap: best[0] }); }
  };
  panel.addEventListener("pointerdown", e => {
    if (!isPhone() || e.target.closest(".close")) return;
    if (state.sheetSnap === "full" && !grabbing(e.target)) return;   // full sheet: content scrolls normally
    d = { y: e.clientY, y0: snapY(state.sheetSnap), t: performance.now(), moved: false, id: e.pointerId, tap: !!grabbing(e.target) };
    addEventListener("pointermove", move); addEventListener("pointerup", end); addEventListener("pointercancel", end);
  });
}

let wasOpen = false;
export function init() {
  attachDrag();
  // opening a term (or picking a new one from the full sheet) lands on half height so the graph stays visible
  on("selected", s => {
    const open = !!s.selected;
    if (open && isPhone() && (!wasOpen || s.sheetSnap === "full")) set({ sheetSnap: "half" });
    wasOpen = open;
    placeSheet();
  });
  on("sheetSnap", s => {
    placeSheet();
    if (byUser && s.selected && s.view === "graph" && s.sheetSnap !== "full") setTimeout(reframe, 120);
    byUser = false;
  });
  on("phone", () => { if (state.sheetSnap !== "half") set({ sheetSnap: "half" }); placeSheet(); });
}
