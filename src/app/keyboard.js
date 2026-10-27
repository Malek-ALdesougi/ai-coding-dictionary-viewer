// Keyboard shortcuts, and Esc closing things one layer at a time.
import { state, set } from "../state.js";
import { select, back, canGoBack } from "../selection.js";
import { setView } from "./views.js";
import { fitView, goHome } from "./actions.js";
import { togglePlay, stop as stopPlay } from "../timeline/play.js";
import { isHelpOpen, showHelp as showTlHelp } from "../timeline/controls.js";
import { isModalOpen, openModal, closeModal } from "../ui/modal.js";
import { resultsOpen, hideResults } from "../ui/search.js";
import { toggleDrawer, setDrawer } from "../ui/drawer.js";
import { exitTour, nextStep, prevStep } from "../ui/tours.js";
import { cycleTheme } from "../ui/theme.js";
import { $ } from "../lib/dom.js";

function escapeStep() {
  if (isModalOpen()) return closeModal();
  if (state.popover || resultsOpen() || isHelpOpen()) { set({ popover: null }); hideResults(); showTlHelp(false); return; }
  if (state.drawer) return setDrawer(false);
  if (state.play !== "idle") return stopPlay();
  if (state.tour) return exitTour();
  select(null);
}

export function init() {
  // header buttons that share an action with a shortcut (F, H)
  $("fit").onclick = () => fitView();
  $("brand").onclick = e => { e.preventDefault(); goHome(); };
  // chips and in-text term links behave like buttons
  addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches?.('[role="button"][tabindex], a.tlink[tabindex]')) { e.preventDefault(); e.target.click(); }
  });
  addEventListener("keydown", e => {
    if (e.target === $("search") || e.metaKey || e.ctrlKey || e.altKey) return;   // the search box has its own keys
    if (isModalOpen()) { if (e.key === "Escape") closeModal(); return; }
    const k = e.key, typing = e.target.matches?.("input, textarea, [contenteditable]");
    if (k === "Escape") return escapeStep();
    if (typing) return;
    if (k === "/") { e.preventDefault(); $("search").focus(); }
    else if (k === "?") openModal(false);
    else if (k === "b" || k === "B") toggleDrawer();
    else if (k === "h" || k === "H") goHome();
    else if (k === "f" || k === "F") fitView();
    else if (k === "t" || k === "T") setView("timeline");
    else if (k === "g" || k === "G") setView("graph");
    else if (k === "l" || k === "L") cycleTheme();
    else if (k === " " && state.view === "timeline" && state.tlMode === "lanes" && !e.target.closest?.("button, [role=button]")) { e.preventDefault(); togglePlay(); }
    else if (k === "ArrowRight" && state.tour) { e.preventDefault(); nextStep(); }
    else if (k === "ArrowLeft" && state.tour) { e.preventDefault(); prevStep(); }
    else if (k === "Backspace" && canGoBack()) back();
  });
}
