// Actions that span several parts of the app.
import { state, set } from "../state.js";
import { select } from "../selection.js";
import { setView, setTlMode } from "./views.js";
import { fitAll } from "../graph/camera.js";
import { frameSelectedInGraph } from "../graph/graph.js";
import * as lanes from "../timeline/lanes.js";
import { stop as stopPlay } from "../timeline/play.js";
import { showHelp as showTlHelp } from "../timeline/controls.js";
import { exitTour } from "../ui/tours.js";
import { clearSearch } from "../ui/search.js";
import { setLevel } from "../ui/levels.js";

/** Put the selected term back in view in whichever view is showing. */
export function frameSelected() {
  if (!state.selected) return;
  if (state.view === "graph") frameSelectedInGraph();
  else if (state.tlMode === "lanes") lanes.focus(state.selected);
}
/** "Fit" (F): show everything in the current view. */
export const fitView = () => (state.view === "timeline" ? lanes.fit() : fitAll());
/** After the window or the panel changes size. */
export function reframe() {
  if (state.view === "timeline") { if (state.tlMode === "lanes") { lanes.dims(); lanes.draw(); state.selected ? lanes.focus(state.selected) : lanes.fit(); } }
  else state.selected ? frameSelectedInGraph() : fitAll();
}
/** Logo / H: back to the starting state. */
export function goHome() {
  exitTour(); stopPlay(); clearSearch(); showTlHelp(false);
  set({ popover: null, drawer: false });
  setLevel("all"); setTlMode("lanes"); setView("graph");
  if (state.selected) select(null); else fitAll();
}
