// The small floating definition card used by graph dots, timeline dots and in-text term links.
import { $, esc } from "../lib/dom.js";
import { byId, LEVELS, lvBars } from "../data.js";
import { state } from "../state.js";

const tip = $("tip");
export const termTipHTML = n => `<b>${esc(n.id)}</b><span class="tl">${lvBars(n.level)} ${LEVELS[n.level].label}</span>${esc(n.plain || n.description)}`;
export function showTip(html) { tip.innerHTML = html; tip.classList.add("show"); }
export function moveTip(e) { tip.style.left = Math.min(e.clientX + 14, innerWidth - 300) + "px"; tip.style.top = e.clientY + 16 + "px"; }
export function hideTip() { tip.classList.remove("show"); }

/** Hovering an element shows the term's definition just below it. */
export function attachTermTip(el, id) {
  const n = byId.get(id); if (!n) return;
  el.addEventListener("mouseenter", () => {
    if (state.play !== "idle") return;
    const r = el.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(r.left, innerWidth - 310)) + "px"; tip.style.top = r.bottom + 8 + "px";
    showTip(termTipHTML(n));
  });
  el.addEventListener("mouseleave", hideTip);
}
