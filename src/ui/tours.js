// Guided tours: short ordered walks through the terms, with a step bar.
import { PATHS, LEVELS } from "../data.js";
import { state, set, on } from "../state.js";
import { select } from "../selection.js";
import { closePopover } from "./menus.js";
import { toast } from "./toast.js";
import { $, esc } from "../lib/dom.js";

let frameSelected = () => {};
export const onTourReframe = fn => { frameSelected = fn; };
const dots = l => ({ beginner: "●○○", intermediate: "●●○", advanced: "●●●" }[l] || "●●○");
const minutes = p => "~" + Math.max(3, Math.round(p.steps.length * 0.7)) + " min";

export function startTour(id) {
  const path = PATHS.find(x => x.id === id); if (!path) return;
  set({ tour: { path, i: 0 }, drawer: false, popover: null });
  goStep(0);
}
export function goStep(i) {
  const t = state.tour; if (!t) return;
  const k = Math.max(0, Math.min(t.path.steps.length - 1, i));
  if (k !== t.i) set({ tour: { ...t, i: k } });
  const id = t.path.steps[k].term;
  if (state.selected && state.selected.id === id) frameSelected(); else select(id);
}
export const nextStep = () => { const t = state.tour; if (!t) return; if (t.i >= t.path.steps.length - 1) exitTour(true); else goStep(t.i + 1); };
export const prevStep = () => { if (state.tour) goStep(state.tour.i - 1); };
export function exitTour(done) {
  const t = state.tour; if (!t) return;
  set({ tour: null });
  if (done) toast(`You finished “${t.path.name}”. Pick another from Guided tours.`);
}

function render(s) {
  const bar = $("tour"), t = s.tour;
  bar.classList.toggle("open", !!t);
  if (!t) return;
  const { path: p, i } = t, step = p.steps[i];
  $("tour-p").textContent = `// ${p.name} · step ${i + 1} of ${p.steps.length}`;
  $("tour-n").textContent = step.term; $("tour-w").textContent = step.why;
  $("tour-d").innerHTML = p.steps.map((_, k) => `<i class="${k < i ? "done" : k === i ? "now" : ""}"></i>`).join("");
  $("tour-prev").disabled = i === 0;
  $("tour-next").textContent = i === p.steps.length - 1 ? "Finish ✓" : "Next →";
}

export function init() {
  const menu = $("paths-menu");
  menu.setAttribute("role", "menu");
  menu.innerHTML = `<div class="dr-label">Guided tours</div><p class="lvintro">Short, ordered walks through the terms. The more dots, the deeper the tour.</p>` + PATHS.map(p =>
    `<button class="item" role="menuitem" data-p="${esc(p.id)}"><div class="it-t"><span><span class="tdots" title="${esc((LEVELS[p.level] || {}).label || "")}">${dots(p.level)}</span> ${esc(p.name)}</span><span class="cnt">${p.steps.length} terms</span></div><div class="it-s">${esc(p.audience)} · ${minutes(p)}</div></button>`).join("");
  menu.onclick = e => { const b = e.target.closest(".item"); if (b) { closePopover(); startTour(b.dataset.p); } };
  $("tour-next").onclick = nextStep;
  $("tour-prev").onclick = prevStep;
  $("tour-x").onclick = () => exitTour();
  on("tour", render);
  // clicking around during a tour keeps the step bar in step with the term on screen
  on("selected", s => {
    const t = s.tour; if (!t || !s.selected) return;
    const k = t.path.steps.findIndex(st => st.term === s.selected.id);
    if (k >= 0 && k !== t.i) set({ tour: { ...t, i: k } });
  });
}
