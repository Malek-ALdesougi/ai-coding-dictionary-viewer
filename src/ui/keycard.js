// "Graph options" / "Timeline options": what the shapes mean, and colour by section or by connections.
import { SECTIONS } from "../data.js";
import { state, set, on } from "../state.js";
import { $, esc, store } from "../lib/dom.js";

const card = $("keycard");
export const initialColour = () => (store.get("dict-colour") === "section" ? "section" : "links");

function render(s) {
  const by = s.colourBy, opt = (c, title, sub) => `<button data-c="${c}" role="radio" aria-checked="${by === c}" class="kopt${by === c ? " on" : ""}"><i class="rd"></i><span><b>${title}</b><em>${sub}</em></span></button>`;
  const colour = `<div class="kh">Colour by</div><div class="kopts" id="kcolour" role="radiogroup" aria-label="Colour by">${opt("section", "Section", "One colour per dictionary section")}${opt("links", "Connections", "Darker means linked to more terms")}</div>`
    + (by === "section"
      ? `<div class="ksecs">${SECTIONS.map((x, i) => `<div class="krow"><span class="ksw" style="background:var(--sec${i + 1})"></span><span>${esc(x.name)}</span></div>`).join("")}</div>`
      : `<div class="krow ksp"><span class="kgrad"></span>Light to dark: fewer to more links</div>`);
  const body = s.view === "graph"
    ? `<div class="kh">The graph</div><div class="krow"><span class="ksize"><i></i><i></i><i></i></span>Bigger dot: linked to more terms</div><div class="krow"><span class="kline"></span>Line: one term mentions the other</div><div class="krow"><span class="kring"></span>Outlined: the selected term and its neighbours</div><div class="krow"><span class="kline glow"></span>Glowing line: a connection, with sparks moving along it</div>`
    : `<div class="kh">The timeline</div><div class="krow"><span class="ksize"><i></i><i></i><i></i></span>Dot: a term, placed at its date</div><div class="krow"><span class="kring dash"></span>Dashed ring: built on (older idea)</div><div class="krow"><span class="kring"></span>Solid ring: led to (newer idea)</div><div class="krow"><span class="kline arc"></span>Line: older idea → newer idea</div><div class="krow"><span class="ktoday"></span>Dotted line: today</div>`;
  card.innerHTML = `<div class="kh">${s.view === "graph" ? "Graph options" : "Timeline options"}</div>${body}${colour}`;
}

export function init() {
  card.addEventListener("click", e => {
    e.stopPropagation();                 // re-rendering detaches the target; don't let the outside-click handler close the card
    const b = e.target.closest("#kcolour button"); if (!b) return;
    store.set("dict-colour", b.dataset.c); set({ colourBy: b.dataset.c });
  });
  render(state);
  on(["view", "colourBy"], render);
  on("colourBy", s => { document.body.dataset.colour = s.colourBy; });
  document.body.dataset.colour = state.colourBy;
}
