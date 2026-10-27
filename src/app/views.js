// Graph / timeline switching and the timeline's three presentations.
import { state, set } from "../state.js";
import { $ } from "../lib/dom.js";

export const setView = v => set({ view: v === "timeline" ? "timeline" : "graph" });
/** Lanes are desktop-only and Eras phone-only; List works everywhere. */
export const normaliseMode = m => (m === "list" ? "list" : state.phone ? "eras" : "lanes");
export const setTlMode = m => set({ tlMode: normaliseMode(m) });

export function syncViews() {
  const { view, tlMode } = state;
  $("graph").classList.toggle("off", view !== "graph");
  $("timeline").classList.toggle("off", view !== "timeline" || tlMode !== "lanes");
  $("tl-list").classList.toggle("on", view === "timeline" && tlMode === "list");
  $("tl-eras").classList.toggle("on", view === "timeline" && tlMode === "eras");
  document.body.dataset.view = view;
  document.body.dataset.tlmode = tlMode;
  $("tlmode").querySelectorAll("button").forEach(b => { b.classList.toggle("on", b.dataset.m === tlMode); b.setAttribute("aria-pressed", String(b.dataset.m === tlMode)); });
  $("key-lbl").textContent = view === "graph" ? "Graph options" : "Timeline options";
}
