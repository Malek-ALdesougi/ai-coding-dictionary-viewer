// The force-directed graph: layout, hover preview, the selected term's glowing beams, and how it reacts to state.
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, drag, select as d3select, easeCubicOut, timer } from "d3";
import { nodes, links, radius, withNeighbours } from "../data.js";
import { svg, defs, root, zoom, cam, linkSel, nodeSel, haloG, coreG, sparkG, rippleG } from "./scene.js";
import { frame, fitAll, onCameraLand } from "./camera.js";
import { scheduleLabels } from "./labels.js";
import { state, on, levelOff } from "../state.js";
import { select, hover } from "../selection.js";
import { nodeFill } from "../lib/colours.js";
import { motion, mot } from "../lib/env.js";
import { showTip, moveTip, hideTip, termTipHTML } from "../ui/tooltip.js";

/* ---- layout ---- */
const curve = (a, b, ref) => {        // quadratic curve a→b, bent the same way as ref.source→ref.target
  const s = ref.source, t = ref.target, dx = t.x - s.x, dy = t.y - s.y;
  return `M${a.x},${a.y}Q${(s.x + t.x) / 2 - dy * 0.12},${(s.y + t.y) / 2 + dx * 0.12} ${b.x},${b.y}`;
};
let beams = [], tickN = 0;
function tick() {
  linkSel.attr("d", l => curve(l.source, l.target, l));
  nodeSel.attr("transform", n => `translate(${n.x},${n.y})`);
  if (++tickN % 5 === 0) scheduleLabels();
  const s = state.selected;
  if (s) {
    const d = b => curve(s, b.other, b.link);
    haloG.selectAll("path").attr("d", d);
    coreG.selectAll("path").attr("d", d);
    defs.selectAll("linearGradient.beam").attr("x1", s.x).attr("y1", s.y).attr("x2", b => b.other.x).attr("y2", b => b.other.y);
  }
}
export const sim = forceSimulation(nodes)
  .force("link", forceLink(links).id(n => n.id).distance(110).strength(0.06))
  .force("charge", forceManyBody().strength(-260))
  .force("center", forceCenter(innerWidth / 2, innerHeight / 2))
  .force("collide", forceCollide(n => radius(n) + 14))
  .on("tick", tick);

/** Runs fn once the first layout has settled (or after 2.5 s at the latest). */
const settleQ = []; let settled = false;
export const whenSettled = fn => (settled ? fn() : settleQ.push(fn));
function markSettled() { if (settled) return; settled = true; settleQ.splice(0).forEach(f => f()); }
sim.on("end.settle", markSettled);
setTimeout(markSettled, 2500);

/* ---- classes: one function paints every state-driven class, so nothing can drift out of sync ---- */
function paint() {
  const s = state.selected, h = state.hovered, q = state.matches;
  nodeSel
    .classed("selected", n => n === s)
    .classed("related", n => !!s && s.near.has(n.id))
    .classed("hover", n => (h ? n === h || (!s && h.near.has(n.id)) : !s && !!q && q.has(n.id)))
    .classed("dim", n => (s ? n !== s && !s.near.has(n.id) : h ? n !== h && !h.near.has(n.id) : !!q && !q.has(n.id)))
    .classed("lvl-off", levelOff);
  linkSel
    .classed("hover", l => !!h && (l.source === h || l.target === h))
    .classed("dim", l => (s ? true : h ? l.source !== h && l.target !== h : !!q))
    .classed("lvl-off", l => levelOff(l.source) && levelOff(l.target));
}
export const recolour = () => nodeSel.select("circle.dot").style("fill", nodeFill);

/* ---- selection: related terms pop in, beams draw outward, sparks travel along them ---- */
let selectedAt = 0;
function animateSelection() {
  const s = state.selected;
  if (s) nodeSel.filter(n => n === s).raise();
  nodeSel.select("circle.dot").interrupt().transition()
    .delay(n => (s && s.near.has(n.id) && !motion.reduce ? 100 + Math.min(380, Math.hypot(n.x - s.x, n.y - s.y) * 0.35) : 0))
    .duration(mot(560)).ease(easeCubicOut)
    .attr("r", n => (!s ? radius(n) : n === s ? radius(n) * 1.3 : s.near.has(n.id) ? radius(n) * 1.1 : radius(n)));

  beams = s ? links.filter(l => l.source === s || l.target === s).map(l => ({ link: l, other: l.source === s ? l.target : l.source })) : [];
  defs.selectAll("linearGradient.beam").data(beams, b => b.other.id).join(enter => {
    const g = enter.append("linearGradient").attr("class", "beam").attr("gradientUnits", "userSpaceOnUse");
    g.append("stop").attr("offset", 0).attr("class", "s-acc");
    g.append("stop").attr("offset", 1).attr("class", "s-acc2");
    return g;
  }).attr("id", (b, i) => "beam" + i);
  beams.forEach((b, i) => { b.grad = `url(#beam${i})`; });
  for (const g of [haloG, coreG]) {
    g.selectAll("path").data(beams, b => b.other.id).join("path")
      .attr("class", g === haloG ? "glow-line halo" : "glow-line core").attr("stroke", b => b.grad);
  }
  tick();
  coreG.selectAll("path").merge(haloG.selectAll("path")).each(function () {
    const len = this.getTotalLength();
    d3select(this).interrupt().attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
      .transition().delay(mot(60)).duration(mot(500 + len * 1.2)).ease(easeCubicOut)
      .attr("stroke-dashoffset", 0)
      .on("end", function () { d3select(this).attr("stroke-dasharray", null); });
  });
  sparkG.selectAll("circle").data(s ? beams.flatMap(b => [{ b, phase: Math.random() }, { b, phase: Math.random() }]) : [])
    .join("circle").attr("class", "spark").attr("r", 2).attr("opacity", 0);
  rippleG.selectAll("circle").data(s ? [0, 1, 2] : []).join("circle").attr("class", "ripple");
  selectedAt = performance.now();
}
// one animation loop for sparks + ripples; idle unless the graph is showing a selection
timer(() => {
  const s = state.selected;
  if (!s || motion.reduce || state.view !== "graph") return;
  const t = performance.now() - selectedAt, cores = new Map();
  coreG.selectAll("path").each(function (b) { cores.set(b, this); });
  sparkG.selectAll("circle").each(function (d) {
    const path = cores.get(d.b); if (!path) return;
    const len = path.getTotalLength();
    if (t < (560 + len * 1.2) * 0.6) { this.setAttribute("opacity", 0); return; }
    const p = ((t * (0.11 + 9 / (len + 40))) / len + d.phase) % 1;
    const pt = path.getPointAtLength(p * len);
    this.setAttribute("cx", pt.x); this.setAttribute("cy", pt.y);
    this.setAttribute("opacity", Math.sin(p * Math.PI).toFixed(3));
    this.setAttribute("r", (1.4 + Math.sin(p * Math.PI) * 1.4).toFixed(2));
  });
  const base = radius(s) * 1.35;
  rippleG.selectAll("circle").each(function (i) {
    const p = (t / 2400 + i / 3) % 1;
    this.setAttribute("cx", s.x); this.setAttribute("cy", s.y);
    this.setAttribute("r", base + p * 46);
    this.setAttribute("opacity", ((1 - p) * 0.55).toFixed(3));
    this.setAttribute("stroke-width", (2 * (1 - p) + 0.3).toFixed(2));
  });
});

export const frameSelectedInGraph = () => { if (state.selected) frame(withNeighbours(state.selected)); };

export function init() {
  zoom.on("zoom", e => { root.attr("transform", e.transform); cam.t = e.transform; scheduleLabels(); });
  svg.call(zoom).on("dblclick.zoom", null);
  onCameraLand(scheduleLabels);
  nodeSel.call(drag()
    .on("start", (e, n) => { if (!e.active) sim.alphaTarget(0.15).restart(); n.fx = n.x; n.fy = n.y; })
    .on("drag", (e, n) => { n.fx = e.x; n.fy = e.y; })
    .on("end", (e, n) => { if (!e.active) sim.alphaTarget(0); n.fx = null; n.fy = null; }));
  nodeSel
    .on("mouseenter", (e, n) => { hover(n); showTip(termTipHTML(n)); })
    .on("mousemove", moveTip)
    .on("mouseleave", () => { hover(null); hideTip(); })
    .on("click", (e, n) => { e.stopPropagation(); hideTip(); select(n.id); });
  svg.on("click", () => select(null));
  recolour();
  paint();

  on("selected", s => {
    animateSelection(); paint(); scheduleLabels();
    if (s.view !== "graph") return;
    if (s.selected) frame(withNeighbours(s.selected)); else fitAll();
  });
  on(["hovered", "matches", "level"], () => { paint(); scheduleLabels(); });
  on(["colourBy", "theme"], recolour);
  on("view", s => { scheduleLabels(); if (s.view === "graph" && s.selected) frame(withNeighbours(s.selected)); });
}
