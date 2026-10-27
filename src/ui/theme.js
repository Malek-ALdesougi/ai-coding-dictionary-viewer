// Theme: "auto" follows the OS; "light"/"dark" pin it. Remembered per browser.
import { state, set, on } from "../state.js";
import { $, store, cssVar } from "../lib/dom.js";
import { refreshShade } from "../lib/colours.js";
import { recolour as recolourGraph } from "../graph/graph.js";
import { recolour as recolourLanes } from "../timeline/lanes.js";

const THEMES = ["auto", "light", "dark"];
const LABEL = { auto: `<svg class="i" aria-hidden="true"><use href="#i-auto"/></svg> Auto`, light: `<svg class="i" aria-hidden="true"><use href="#i-sun"/></svg> Light`, dark: `<svg class="i" aria-hidden="true"><use href="#i-moon"/></svg> Dark` };

/** Read before anything paints, so the first frame already has the right colours. */
export function initialTheme() {
  const t = store.get("dict-theme");
  return THEMES.includes(t) ? t : "auto";
}
function apply() {
  const t = state.theme, root = document.documentElement;
  if (t === "auto") delete root.dataset.theme; else root.dataset.theme = t;
  const btn = $("theme"); btn.innerHTML = LABEL[t]; btn.title = `Theme: ${t} (L to change)`;
  refreshShade();
  $("sparkColor").setAttribute("flood-color", cssVar("--accent"));
  recolourGraph(); recolourLanes();
}
export function cycleTheme() {
  const t = THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length];
  store.set("dict-theme", t); set({ theme: t });
}
export function init() {
  $("theme").onclick = e => { e.stopPropagation(); cycleTheme(); };
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (state.theme === "auto") apply(); });
  apply();
  on("theme", apply);
}
