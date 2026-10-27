// Graph labels: only as many as fit without overlapping, always the important ones first.
import { nodes, radius } from "../data.js";
import { nodeSel, cam } from "./scene.js";
import { state, levelOff } from "../state.js";

const fsOf = n => Math.min(14, 10.5 + n.deg / 14);
let raf = 0;
export function scheduleLabels() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; graphLabels(); }); }

function graphLabels() {
  if (state.view !== "graph") return;
  const k = cam.t.k, sel = state.selected, hov = state.hovered, matches = state.matches;
  const forced = n => n === sel || n === hov;
  const prio = n => (forced(n) ? 1e6 : 0) + (n === sel ? 1e6 : 0) + (sel && sel.near.has(n.id) ? 1e5 : 0) + (matches && matches.has(n.id) ? 1e5 : 0) + (levelOff(n) ? -500 : 0) + n.deg;
  const boxes = [];
  const gliding = cam.moving && sel;
  nodes.forEach(n => { n.glbl = gliding ? n === sel || sel.near.has(n.id) : false; });   // fixed set while gliding; collisions resolve once it lands
  if (!gliding) {
    for (const n of nodes.slice().sort((a, b) => prio(b) - prio(a))) {
      const f = forced(n);
      if (sel && !f && !sel.near.has(n.id)) continue;
      const fs = fsOf(n) * (n === sel ? 1.15 : 1), w = n.id.length * fs * 0.98 + 14, h = fs + 8;
      const sx = cam.t.applyX(n.x), sy = cam.t.applyY(n.y) - radius(n) * 1.2 * k - 4 - h / 2;
      if (sx < -40 || sx > innerWidth + 40 || sy < -10 || sy > innerHeight + 40) continue;
      const b = { x: sx - w / 2, y: sy - h / 2, w, h };
      if (f || !boxes.some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y)) { n.glbl = true; boxes.push(b); }
    }
  }
  nodeSel.select("text").classed("lbl-hide", n => !n.glbl)
    .style("font-size", n => fsOf(n) * (n === sel ? 1.15 : 1) / k + "px")
    .attr("dy", n => -(radius(n) * 1.2 + 5 / k))
    .style("stroke-width", 3 / k + "px");
}
