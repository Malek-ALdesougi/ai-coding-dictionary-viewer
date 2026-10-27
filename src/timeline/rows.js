// Row markup shared by the dated List and the Eras view.
import { esc } from "../lib/dom.js";
import { LEVELS, lvBars, secVar, sectionName, byId } from "../data.js";
import { state, levelOff } from "../state.js";

export function rowHTML(n, { event = true, entered = false } = {}) {
  const h = n.history;
  const from = h.from.length ? `<div class="rfrom"><span>Built on</span>${h.from.map(f => `<span class="chip" role="button" tabindex="0" data-id="${esc(f)}">${esc(f)}</span>`).join("")}</div>` : "";
  return `<article class="trow${entered ? " in" : ""}" data-id="${esc(n.id)}" style="--c:${secVar(n.section)}" tabindex="0">`
    + `<div class="rt"><span>${esc(h.label)}</span><span class="rsec">${esc(sectionName(n.section))}</span>${event ? `<span class="ev">${esc(h.event)}</span>` : ""}<span title="${LEVELS[n.level].label}">${lvBars(n.level)}</span></div>`
    + `<div class="rname">${esc(n.id)}</div><p class="rhead">${esc(h.headline)}</p>${from}</article>`;
}

/** Selected + level-filter classes on every row in both lists. */
export function markRows() {
  const s = state.selected;
  document.querySelectorAll(".tl-list .trow").forEach(r => {
    r.classList.toggle("lvl-off", levelOff(byId.get(r.dataset.id)));
    r.classList.toggle("sel", !!s && r.dataset.id === s.id);
  });
}
