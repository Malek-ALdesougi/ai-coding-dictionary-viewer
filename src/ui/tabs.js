// Header Graph / Timeline tabs (with the sliding ink) and the desktop footer's shortcut hints.
import { state, on } from "../state.js";
import { setView } from "../app/views.js";
import { $ } from "../lib/dom.js";

const tabs = $("tabs"), ink = tabs.querySelector(".ink");
const HINTS = {
  graph: [["Click", "focus a term"], ["Hover", "preview"], ["Scroll", "zoom"], ["Drag", "move"], ["T", "timeline"], ["Esc", "close"]],
  timeline: [["Click", "trace its story"], ["Scroll", "zoom time"], ["Drag", "pan"], ["Space", "play / pause"], ["G", "graph"], ["Esc", "close"]],
};
export function moveInk() {
  const b = tabs.querySelector(`button[data-view="${state.view}"]`);
  if (!b.offsetWidth) return;                  // hidden (phone layout); placed again when it shows
  ink.style.width = b.offsetWidth + "px"; ink.style.transform = `translateX(${b.offsetLeft}px)`;
}
function sync() {
  tabs.querySelectorAll("button").forEach(b => { const on = b.dataset.view === state.view; b.classList.toggle("active", on); b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
  moveInk();
  $("hint").innerHTML = HINTS[state.view].map(([k, t]) => `<span class="hi"><kbd>${k}</kbd>${t}</span>`).join("");
}
export function init() {
  tabs.addEventListener("click", e => { const b = e.target.closest("button[data-view]"); if (b) setView(b.dataset.view); });
  tabs.addEventListener("keydown", e => {        // arrow keys move between tabs (WAI-ARIA tabs pattern)
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault(); e.stopPropagation();
    setView(state.view === "graph" ? "timeline" : "graph");
    tabs.querySelector(`button[data-view="${state.view}"]`).focus();
  });
  sync();
  requestAnimationFrame(moveInk);
  document.fonts?.ready.then(moveInk);
  on("view", sync);
  on("phone", () => requestAnimationFrame(moveInk));
}
