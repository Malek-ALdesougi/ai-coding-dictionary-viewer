// The one place that reacts to resize / rotation (debounced). Crossing the 700px line flips state.phone,
// and every module that cares re-homes itself through its own subscriber.
import { state, set, on } from "../state.js";
import { isPhone, PHONE_MQ } from "../lib/env.js";
import { forceCenter } from "d3";
import { sim } from "../graph/graph.js";
import { scheduleLabels } from "../graph/labels.js";
import * as lanes from "../timeline/lanes.js";
import { moveInk } from "../ui/tabs.js";
import { setPanelWidth } from "../panel/resizer.js";
import { placeSheet } from "../panel/sheet.js";
import { reframe } from "./actions.js";
import { setTlMode } from "./views.js";

let w = innerWidth, h = innerHeight, timer = 0;
function onViewport() {
  const widthChanged = innerWidth !== w, dh = Math.abs(innerHeight - h);
  w = innerWidth; h = innerHeight;
  if (!widthChanged && (document.activeElement?.id === "search" || dh < 120)) return;   // on-screen keyboard / URL-bar wobble
  set({ phone: isPhone() });
  setPanelWidth();
  lanes.dims(); lanes.draw();
  moveInk(); scheduleLabels();
  sim.force("center", forceCenter(w / 2, h / 2));
  placeSheet();
  reframe();
}
const soon = ms => () => { clearTimeout(timer); timer = setTimeout(onViewport, ms); };

export function init() {
  addEventListener("resize", soon(120));
  addEventListener("orientationchange", soon(300));
  PHONE_MQ.addEventListener("change", soon(0));
  on("phone", s => { setTlMode(s.tlMode); setPanelWidth(); });   // lanes <-> eras; panel width limits differ
}
