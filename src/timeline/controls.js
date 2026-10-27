// The bar above the timeline: Lanes / Eras / List switch and the "How to read" card.
import { state, on } from "../state.js";
import { setTlMode } from "../app/views.js";
import { $, store } from "../lib/dom.js";

const help = $("tlhelp");
export function showHelp(open) { help.classList.toggle("open", open); if (!open) store.set("dict-tlhelp", "1"); }
const helpOpen = () => help.classList.contains("open");

export function init() {
  $("tlmode").onclick = e => { const b = e.target.closest("button"); if (b) setTlMode(b.dataset.m); };
  $("tlhelp-btn").onclick = e => { e.stopPropagation(); showHelp(!helpOpen()); };
  $("tlhelp-x").onclick = () => showHelp(false);
  // first visit to the lanes: show the card once
  on(["view", "tlMode"], s => {
    if (s.view !== "timeline" || s.tlMode !== "lanes") { if (helpOpen()) showHelp(false); return; }
    if (store.get("dict-tlhelp") !== "1") setTimeout(() => { if (state.view === "timeline" && state.tlMode === "lanes" && !state.selected) help.classList.add("open"); }, 900);
  });
  on("selected", s => { if (s.selected && helpOpen()) showHelp(false); });
}
export const isHelpOpen = helpOpen;
