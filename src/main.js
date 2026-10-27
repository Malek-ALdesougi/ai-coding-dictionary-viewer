// Start-up. Modules register their state subscribers in the order below, which is the order they run in
// when something changes (e.g. on a new selection: sheet height -> panel -> graph camera -> timeline -> lists -> URL).
import "./styles/index.css";
import { state, set, on } from "./state.js";
import { syncViews, setTlMode } from "./app/views.js";
import { initialTheme } from "./ui/theme.js";
import { initialColour } from "./ui/keycard.js";

import * as sheet from "./panel/sheet.js";
import * as panel from "./panel/panel.js";
import * as resizer from "./panel/resizer.js";
import * as graph from "./graph/graph.js";
import * as lanes from "./timeline/lanes.js";
import * as play from "./timeline/play.js";
import * as controls from "./timeline/controls.js";
import * as list from "./timeline/list.js";
import * as eras from "./timeline/eras.js";
import * as tabs from "./ui/tabs.js";
import * as theme from "./ui/theme.js";
import * as menus from "./ui/menus.js";
import * as levels from "./ui/levels.js";
import * as tours from "./ui/tours.js";
import * as drawer from "./ui/drawer.js";
import * as search from "./ui/search.js";
import * as keycard from "./ui/keycard.js";
import * as modal from "./ui/modal.js";
import * as tabbar from "./ui/tabbar.js";
import * as hash from "./app/hash.js";
import * as keyboard from "./app/keyboard.js";
import * as viewport from "./app/viewport.js";
import { frameSelected, reframe } from "./app/actions.js";

set({ theme: initialTheme(), colourBy: initialColour() });
on(["view", "tlMode"], syncViews);          // visibility first, so everything after measures the right layout

sheet.init(); panel.init(); resizer.init();
graph.init(); lanes.init(); play.init(); controls.init(); list.init(); eras.init();
tabs.init(); theme.init(); menus.init(); levels.init(); tours.init(); drawer.init();
search.init(); keycard.init(); modal.init(); tabbar.init();
keyboard.init(); viewport.init();
hash.init();                                 // last: the URL reflects the state after everyone has reacted

sheet.onSheetMove(frameSelected);
resizer.onPanelResize(reframe);
tours.onTourReframe(frameSelected);

setTlMode(state.tlMode);                     // phones start on Eras
syncViews();
const linked = location.hash.length > 1;
if (linked) hash.applyLayout();
graph.whenSettled(() => hash.applyTerm({ initial: true }));
if (!linked && !modal.seenWelcome()) modal.openModal(true);
