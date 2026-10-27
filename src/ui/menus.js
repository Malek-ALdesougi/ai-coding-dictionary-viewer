// Popovers (Guided tours, Term levels, Graph/Timeline options): one open at a time, focus kept inside,
// closed by clicking elsewhere or Esc. On phones the menus live in <body> because the header's
// backdrop-filter would trap fixed-position children inside it.
import { state, set, on } from "../state.js";
import { $ } from "../lib/dom.js";
import { trap } from "../lib/trap.js";

const POPOVERS = {
  tours: { el: () => $("paths-menu"), btn: () => $("paths-btn"), home: () => $("paths-wrap") },
  levels: { el: () => $("level-menu"), btn: () => $("level-btn"), home: () => $("level-wrap") },
  keycard: { el: () => $("keycard"), btn: () => $("key-btn") },
};
const traps = {};

export function togglePopover(name) {
  const open = state.popover === name ? null : name;
  // on phones only one sheet-like surface at a time: opening a popover closes the Browse drawer
  set(open && state.phone ? { popover: open, drawer: false } : { popover: open });
}
export const closePopover = () => set({ popover: null });

function placeMenus() {
  for (const k of ["tours", "levels"]) {
    const p = POPOVERS[k];
    if (state.phone) document.body.append(p.el()); else p.home().append(p.el());
  }
}

function sync(s) {
  for (const [name, p] of Object.entries(POPOVERS)) {
    const open = s.popover === name;
    p.el().classList.toggle("open", open);
    p.btn().setAttribute("aria-expanded", String(open));
    if (open) traps[name].on(); else traps[name].off();
  }
}

export function init() {
  for (const [name, p] of Object.entries(POPOVERS)) traps[name] = trap(p.el(), { initialFocus: () => p.el().querySelector(".item.on, .item, button") || p.el() });
  $("paths-btn").onclick = e => { e.stopPropagation(); togglePopover("tours"); };
  $("level-btn").onclick = e => { e.stopPropagation(); togglePopover("levels"); };
  $("key-btn").onclick = e => { e.stopPropagation(); togglePopover("keycard"); };
  document.addEventListener("click", e => {
    if (state.popover && !e.target.closest(".menuwrap, .menu, #keycard, #key-btn, #tabbar")) closePopover();
  });
  placeMenus();
  sync(state);
  on("popover", sync);
  on("phone", () => { placeMenus(); closePopover(); });
  on(["selected", "drawer"], s => { if (s.popover && (s.selected || s.drawer)) closePopover(); });
}
