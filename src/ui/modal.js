// Welcome (first visit) / Help card. While open, the rest of the page is inert and focus stays inside.
import { PATHS, nodes } from "../data.js";
import { set } from "../state.js";
import { $, esc, store } from "../lib/dom.js";
import { trap } from "../lib/trap.js";
import { startTour } from "./tours.js";

const modal = $("modal");
let mtrap;
export const isModalOpen = () => !modal.hidden;

export function openModal(first) {
  set({ popover: null });
  $("m-title").textContent = first ? "Welcome" : "How this works";
  [...document.body.children].forEach(c => { if (c !== modal && c.tagName !== "SCRIPT") c.inert = true; });
  modal.hidden = false;
  mtrap.on();
  modal.scrollTop = 0; modal.querySelector(".mcard").scrollTop = 0;
}
export function closeModal() {
  if (modal.hidden) return;
  modal.hidden = true;
  [...document.body.children].forEach(c => { c.inert = false; });
  mtrap.off();
  store.set("dict-seen", "1");
}
export const seenWelcome = () => store.get("dict-seen") === "1";

export function init() {
  mtrap = trap(modal, { initialFocus: () => $("m-close"), clickOutsideDeactivates: false, allowOutsideClick: true });
  $("m-count").textContent = nodes.length;
  $("m-roles").innerHTML = PATHS.map(p => `<button class="btn rolebtn" data-p="${esc(p.id)}"><b>${esc(p.name)}</b><span>${esc(p.audience)}</span></button>`).join("");
  $("m-roles").onclick = e => { const b = e.target.closest("[data-p]"); if (b) { closeModal(); startTour(b.dataset.p); } };
  $("help").onclick = e => { e.stopPropagation(); openModal(false); };
  $("m-close").onclick = closeModal; $("m-x").onclick = closeModal;
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
}
