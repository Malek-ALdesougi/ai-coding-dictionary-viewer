// Desktop timeline: one lane per dictionary section, a piecewise time axis, lineage arcs.
import { select as d3select, zoom as d3zoom, zoomIdentity, scaleLinear, group, range, min, max, easeCubicInOut, easeCubicOut, easeBackOut, timer } from "d3";
import { byId, tlNodes, tlEdges, LANES, rr } from "../data.js";
import { state, on, levelOff } from "../state.js";
import { select, hover } from "../selection.js";
import { nodeFill } from "../lib/colours.js";
import { motion, mot, isPhone } from "../lib/env.js";
import { panelWidth } from "../layout.js";
import { showTip, moveTip, hideTip } from "../ui/tooltip.js";
import { esc } from "../lib/dom.js";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NOW = new Date(), TODAY = NOW.getFullYear() + (NOW.getMonth() + NOW.getDate() / 31) / 12;

/* ---- scene ---- */
export const tlSvg = d3select("#timeline");
const tlDefs = tlSvg.select("defs");
tlSvg.select(".pg0").attr("class", "pg0 s-acc2").attr("stop-opacity", 0);
tlSvg.select(".pg1").attr("class", "pg1 s-acc");
const tlRoot = tlSvg.append("g");
const clip = tlRoot.append("g").attr("clip-path", "url(#tlClip)");
const gBand = clip.append("g"), gGrid = clip.append("g").attr("class", "tl-grid"), gArc = clip.append("g"),
      gHalo = clip.append("g"), gCore = clip.append("g"), gSpark = clip.append("g");
export const gRip = clip.append("g");
const gDot = clip.append("g"), gPlay = clip.append("g"), gToday = clip.append("g").attr("class", "tl-today");
const gLane = tlRoot.append("g").attr("class", "tl-lane"), gAxis = tlRoot.append("g");

export const arcSel = gArc.selectAll("path").data(tlEdges).join("path").attr("class", "tl-arc");
export const dotSel = gDot.selectAll("g").data(tlNodes).join("g").attr("class", "tl-dot");
dotSel.append("circle").attr("r", rr);
dotSel.append("text").text(n => n.id).attr("dy", 3);
gLane.selectAll("g").data(LANES).join(enter => {
  const g = enter.append("g");
  g.append("line"); g.append("text").attr("class", "num"); g.append("text").attr("class", "name");
  return g;
});
const axisLine = gAxis.append("line").attr("class", "tl-axis");
export const playLine = gPlay.append("line").attr("class", "playhead").attr("stroke", "url(#playGrad)").style("display", "none");
// Playhead handle: drawn above the axis (outside the clip) and draggable to scrub through history.
export const playDot = tlRoot.append("g").attr("class", "playhandle").style("display", "none")
  .attr("aria-label", "Playhead: drag to move through time");
playDot.append("circle").attr("class", "ph-hit").attr("r", 18);
playDot.append("circle").attr("class", "ph-halo").attr("r", 13);
playDot.append("circle").attr("class", "ph-dot").attr("r", 7.5);

/* ---- scales: centuries of roots squeezed on the left, the LLM era stretched out on the right ---- */
const DOM = [1820, 1970, 2010, 2016, 2020, 2023, 2024, 2025, 2026, 2027];
const FR = [0, .04, .085, .13, .26, .41, .53, .70, .89, 1];
/** Margins and the zoomed x scale; live bindings, recomputed by dims(). */
export let M, xz;
let laneH, xBase, tlT = zoomIdentity, line = null, selAt = 0, dirty = false;
const tlZoom = d3zoom().scaleExtent([0.45, 16]).filter(e => (!e.ctrlKey || e.type === "wheel") && !e.button);

export function dims() {
  const narrow = isPhone();
  M = { l: narrow ? 86 : 178, r: 36, t: narrow ? 142 : 178, b: narrow ? 60 : 96 };
  laneH = Math.max(40, (innerHeight - M.t - M.b) / LANES.length);
  xBase = scaleLinear().domain(DOM).range(FR.map(f => M.l + f * (innerWidth - M.l - M.r)));
  xz = tlT.rescaleX(xBase);
  d3select("#tlClipRect").attr("x", M.l - 14).attr("y", 0).attr("width", innerWidth - M.l - M.r + 28).attr("height", innerHeight);
  tlZoom.extent([[M.l, 0], [innerWidth - M.r, innerHeight]]);
}
const laneY = i => M.t + laneH * (i + 0.5);
const visible = () => state.view === "timeline" && state.tlMode === "lanes";

function layoutY() {
  for (const [lane, arr] of group(tlNodes, n => n.lane)) {
    arr.sort((a, b) => a.t - b.t || b.deg - a.deg);
    const placed = [], cy = laneY(lane), maxOff = laneH / 2 - 8;
    for (const n of arr) {
      n.tx = xz(n.t);
      const r = rr(n);
      let best = cy;
      for (let k = 0; k < 24; k++) {
        const off = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 7;
        if (Math.abs(off) > maxOff) continue;
        const y = cy + off;
        if (!placed.some(p => Math.hypot(p.tx - n.tx, p.ty - y) < rr(p) + r + 2.5)) { best = y; break; }
      }
      n.ty = best; placed.push(n);
    }
  }
}
const arcD = (a, b) => {
  const lift = Math.min(150, 16 + Math.abs(b.tx - a.tx) * 0.26 + Math.abs(b.ty - a.ty) * 0.18);
  return `M${a.tx},${a.ty}Q${(a.tx + b.tx) / 2},${Math.min(a.ty, b.ty) - lift} ${b.tx},${b.ty}`;
};
function ticks() {
  const a = xz.invert(M.l), b = xz.invert(innerWidth - M.r), out = [];
  for (const y of [1825, 1900, 1950, 1975, 1990, 2000, 2010, 2015, ...range(2016, 2028)]) if (y >= a - 1 && y <= b + 1) out.push({ v: y, label: String(y), major: true });
  const ppy = xz(2026) - xz(2025), step = ppy > 1100 ? 1 : ppy > 420 ? 3 : 0;
  if (step) for (let y = Math.floor(a); y <= Math.ceil(b); y++) {
    if (y < 2016) continue;
    for (let m = step; m < 12; m += step) out.push({ v: y + m / 12, label: MONTHS[m], major: false });
  }
  out.sort((p, q) => p.v - q.v);
  let last = -1e9, first = true;
  for (const t of out) {
    t.x = xz(t.v); t.show = t.x >= M.l + (t.major ? 2 : 22) && t.x - last > (t.major ? 34 : 30);
    if (t.show) { if (first && !t.major) t.label += " " + Math.floor(t.v); first = false; last = t.x; }
  }
  return out;
}

/** Redraws the lanes. Skipped while hidden; marked dirty and redrawn when they next show. */
export function draw(force) {
  if (!force && !visible()) { dirty = true; return; }
  dirty = false;
  const W = innerWidth, H = innerHeight, top = M.t - 22, base = H - M.b + 8;
  const split = xz(2017.45);
  gBand.selectAll("rect").data([0]).join("rect").attr("class", "tl-band")
    .attr("x", Math.min(xz(1820), M.l - 14)).attr("y", top - 26).attr("width", Math.max(0, split - Math.min(xz(1820), M.l - 14))).attr("height", base - top + 26);
  gBand.selectAll("line").data([0]).join("line").attr("class", "tl-split").attr("x1", split).attr("x2", split).attr("y1", top - 26).attr("y2", base);
  gBand.selectAll("text").data([
    ...(split > M.l + 150 ? [{ x: Math.max(M.l, xz(1820)) + 8, t: "Roots · compressed", c: "tl-era" }] : []),
    { x: Math.max(split, M.l) + 8, t: split > M.l ? "The LLM era · Transformer, Jun 2017 →" : "The LLM era", c: "tl-era llm" },
  ], d => d.c).join("text").attr("class", d => d.c).attr("x", d => d.x).attr("y", top - 12).text(d => d.t);
  const tk = ticks();
  gGrid.selectAll("line").data(tk, d => d.v).join("line").attr("class", d => (d.major ? "major" : null))
    .attr("x1", d => d.x).attr("x2", d => d.x).attr("y1", top).attr("y2", base);
  gGrid.selectAll("text").data(tk.filter(d => d.show), d => d.v).join("text")
    .attr("x", d => d.x).attr("y", base + 18).attr("text-anchor", "middle").style("font-weight", d => (d.major ? 700 : 400)).text(d => d.label);
  axisLine.attr("x1", M.l - 14).attr("x2", W - M.r + 14).attr("y1", base).attr("y2", base);
  const tx = xz(TODAY);
  gToday.selectAll("line").data([0]).join("line").attr("x1", tx).attr("x2", tx).attr("y1", top - 4).attr("y2", base);
  gToday.selectAll("text").data([0]).join("text").attr("x", tx - 6).attr("y", top - 10).attr("text-anchor", "end").text(`Today · ${MONTHS[NOW.getMonth()]} ${NOW.getFullYear()}`);
  gToday.selectAll("circle").data(["pulse", "core"]).join("circle").attr("class", d => d).attr("cx", tx).attr("cy", base).attr("r", 4);
  gLane.selectAll("g").each(function (name, i) {
    const g = d3select(this), y = laneY(i);
    g.select("line").attr("x1", 16).attr("x2", W - M.r).attr("y1", y + laneH / 2).attr("y2", y + laneH / 2);
    g.select(".num").attr("x", 16).attr("y", y - 2).text(String(i + 1).padStart(2, "0"));
    g.select(".name").attr("x", 16).attr("y", y + 11).text(isPhone() ? name.split(/[ ,&]/)[0] : name)
      .each(function () {    // wrap long lane names onto two lines
        const el = d3select(this), words = el.text().split(" ");
        if (isPhone() || words.length < 3) return;
        el.text(null);
        el.append("tspan").attr("x", 16).text(words.slice(0, 2).join(" "));
        el.append("tspan").attr("x", 16).attr("dy", 12).text(words.slice(2).join(" "));
      });
  });
  layoutY();
  arcSel.attr("d", e => arcD(e.s, e.t));
  dotSel.attr("transform", n => `translate(${n.tx},${n.ty})`);
  dotSel.select("text").attr("x", n => rr(n) * (n === state.selected ? 1.35 : 1) + 5);
  if (line) {
    gHalo.selectAll("path").attr("d", e => arcD(e.s, e.t));
    gCore.selectAll("path").attr("d", e => arcD(e.s, e.t));
    tlDefs.selectAll("linearGradient.lg").attr("x1", e => e.s.tx).attr("y1", e => e.s.ty).attr("x2", e => e.t.tx).attr("y2", e => e.t.ty);
  }
  playLine.attr("y1", top - 26).attr("y2", base);
  labels();
}
export const redrawIfDirty = () => { if (dirty) draw(); };

function labels() {
  const s = state.selected, h = state.hovered;
  const prio = n => (n === s ? 1e4 : 0) + (n === h ? 5e3 : 0) + (line && (line.anc.has(n.id) || line.des.has(n.id)) ? 1e3 : 0) + n.deg;
  // while a term is selected, only its lineage competes for label space (everything else is faded out)
  const live = line && s ? n => n === s || line.anc.has(n.id) || line.des.has(n.id) : () => true;
  const pool = tlNodes.filter(live);
  const boxes = [], dots = pool.map(n => ({ x: n.tx - rr(n), y: n.ty - rr(n), w: rr(n) * 2, h: rr(n) * 2, n }));
  tlNodes.forEach(n => { n.lbl = false; });
  for (const n of pool.sort((a, b) => prio(b) - prio(a))) {
    const w = n.id.length * 5.95 + 8, x = n.tx + rr(n) + 4, y = n.ty - 6;
    const hit = b => x < b.x + b.w && x + w > b.x && y < b.y + (b.h || 12) && y + 12 > b.y;
    const ok = x > M.l - 20 && x < innerWidth - M.r && !boxes.some(hit) && !dots.some(d => d.n !== n && hit(d));
    if (ok) boxes.push({ x, y, w });
    n.lbl = ok;
  }
  dotSel.select("text").classed("hide", n => !n.lbl);
}

/* ---- classes: one function for hover / search / level / selection state ---- */
function paint() {
  const s = state.selected && state.selected.history ? state.selected : null;
  const h = state.hovered && state.hovered.kids ? state.hovered : null, q = state.matches;
  const inLine = n => !!s && (n === s || line.anc.has(n.id) || line.des.has(n.id));
  const nearH = d => d === h || h.kids.has(d.id) || h.history.from.includes(d.id);
  dotSel
    .classed("sel", n => n === s).classed("anc", n => !!s && line.anc.has(n.id)).classed("des", n => !!s && line.des.has(n.id))
    .classed("hover", d => (h ? d === h || (!s && nearH(d)) : !s && !!q && q.has(d.id)))
    .classed("dim", d => (s ? !inLine(d) : h ? !nearH(d) : !!q && !q.has(d.id)))
    .classed("lvl-off", levelOff);
  arcSel
    .classed("hover", e => !!h && (e.s === h || e.t === h))
    .classed("dim", e => (s ? true : h ? e.s !== h && e.t !== h : !!q))
    .classed("lvl-off", e => levelOff(e.s) && levelOff(e.t));
  if (visible()) labels();
}
export const recolour = () => dotSel.select("circle").style("fill", nodeFill);

/* ---- selection: the birth story (all ancestors) + what it led to (direct children) ---- */
function lineageOf(n) {
  const anc = new Set(), des = new Set(), edges = new Map();
  const up = x => x.history.from.forEach(f => {
    const p = byId.get(f); if (!p.history) return;
    edges.set(p.id + "→" + x.id, { s: p, t: x, kind: "anc" });
    if (!anc.has(p.id)) { anc.add(p.id); up(p); }
  });
  up(n);
  n.kids.forEach(k => { des.add(k); edges.set(n.id + "→" + k, { s: n, t: byId.get(k), kind: "des" }); });
  return { anc, des, edges: [...edges.values()].sort((a, b) => a.t.t - b.t.t || a.s.t - b.s.t) };
}
function applySelection() {
  const s = state.selected && state.selected.history ? state.selected : null;
  line = s ? lineageOf(s) : null;
  const inLine = n => !!s && (n === s || line.anc.has(n.id) || line.des.has(n.id));
  paint();
  dotSel.select("circle").interrupt().transition()
    .delay(n => (inLine(n) && n !== s && !motion.reduce ? 150 + Math.abs(n.t - s.t) * 18 : 0)).duration(mot(450)).ease(easeBackOut.overshoot(2.2))
    .attr("r", n => (!s ? rr(n) : n === s ? rr(n) * 1.5 : inLine(n) ? rr(n) * 1.2 : rr(n)));
  const edges = line ? line.edges : [];
  edges.forEach((e, i) => { e.i = i; e.grad = `url(#lg${i})`; });
  tlDefs.selectAll("linearGradient.lg").data(edges).join(enter => {
    const g = enter.append("linearGradient").attr("class", "lg").attr("gradientUnits", "userSpaceOnUse");
    g.append("stop").attr("offset", 0).attr("class", "s-acc2");
    g.append("stop").attr("offset", 1).attr("class", "s-acc");
    return g;
  }).attr("id", (e, i) => "lg" + i);
  gHalo.selectAll("path").data(edges).join("path").attr("class", "glow-line halo").attr("stroke", e => e.grad);
  gCore.selectAll("path").data(edges).join("path").attr("class", "glow-line core").attr("stroke", e => e.grad);
  draw();
  // the story draws itself in chronological order: oldest link first
  gHalo.selectAll("path").merge(gCore.selectAll("path")).each(function (e) {
    const len = this.getTotalLength();
    d3select(this).interrupt().attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
      .transition().delay(mot(120 + e.i * 85)).duration(mot(650)).ease(easeCubicInOut)
      .attr("stroke-dashoffset", 0).on("end", function () { d3select(this).attr("stroke-dasharray", null); });
  });
  gSpark.selectAll("circle").data(edges.map(e => ({ e, phase: Math.random() }))).join("circle").attr("class", "spark").attr("r", 2).attr("opacity", 0);
  gRip.selectAll("circle.sel-ripple").data(s ? [0, 1, 2] : []).join("circle").attr("class", "ripple sel-ripple");
  selAt = performance.now();
}
timer(() => {
  const s = state.selected;
  if (!visible() || !line || !s || motion.reduce) return;
  const t = performance.now() - selAt, cores = new Map();
  gCore.selectAll("path").each(function (e) { cores.set(e, this); });
  gSpark.selectAll("circle").each(function (d) {
    const path = cores.get(d.e); if (!path) return;
    const start = 120 + d.e.i * 85 + 650;
    if (t < start) { this.setAttribute("opacity", 0); return; }
    const len = path.getTotalLength();
    const p = (((t - start) * (0.12 + 9 / (len + 40))) / len + d.phase) % 1;
    const pt = path.getPointAtLength(p * len);
    this.setAttribute("cx", pt.x); this.setAttribute("cy", pt.y);
    this.setAttribute("opacity", Math.sin(p * Math.PI).toFixed(3));
    this.setAttribute("r", (1.3 + Math.sin(p * Math.PI) * 1.4).toFixed(2));
  });
  const base = rr(s) * 1.5;
  gRip.selectAll("circle.sel-ripple").each(function (i) {
    const p = (t / 2400 + i / 3) % 1;
    this.setAttribute("cx", s.tx); this.setAttribute("cy", s.ty);
    this.setAttribute("r", base + p * 34);
    this.setAttribute("opacity", ((1 - p) * 0.55).toFixed(3));
    this.setAttribute("stroke-width", (2 * (1 - p) + 0.3).toFixed(2));
  });
});

/* ---- camera ---- */
function zoomTo(v0, v1) {
  const pad = 90, left = M.l + pad, right = innerWidth - M.r - panelWidth() - pad;
  const x0 = xBase(v0), x1 = xBase(v1);
  const k = x1 - x0 < 1 ? 4 : Math.max(0.45, Math.min(16, (right - left) / (x1 - x0)));
  const tx = x1 - x0 < 1 ? (left + right) / 2 - x0 * k : left - x0 * k;
  tlSvg.transition().duration(mot(900)).ease(easeCubicInOut).call(tlZoom.transform, zoomIdentity.translate(tx, 0).scale(k));
}
export function focus(n) {
  if (!n || !n.history) return;
  const ts = [n.t, ...(line ? [...line.anc, ...line.des] : []).map(id => byId.get(id).t)];
  const modern = ts.filter(t => t >= 2015);       // ancient roots would flatten the view; frame the modern part and let the arcs reach back
  const pool = modern.length ? modern : ts;
  zoomTo(Math.min(min(pool), n.t), Math.max(max(pool), n.t));
}
export const fit = () => tlSvg.transition().duration(mot(800)).ease(easeCubicInOut).call(tlZoom.transform, zoomIdentity);

/* ---- entrance animation ---- */
export function intro() {
  if (motion.reduce) return;
  const len = innerWidth;
  axisLine.interrupt().attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len).transition().duration(900).ease(easeCubicOut).attr("stroke-dashoffset", 0);
  gGrid.style("opacity", 0).transition().delay(150).duration(700).style("opacity", 1);
  gBand.style("opacity", 0).transition().delay(100).duration(700).style("opacity", 1);
  gLane.selectAll("g").style("opacity", 0).attr("transform", "translate(-12,0)")
    .transition().delay((d, i) => 120 + i * 60).duration(500).ease(easeCubicOut).style("opacity", 1).attr("transform", null);
  dotSel.select("circle").interrupt().attr("r", 0).transition().delay(n => 250 + n.rank * 18).duration(520)
    .ease(easeBackOut.overshoot(2.6)).attr("r", n => (n === state.selected ? rr(n) * 1.5 : rr(n)));
  dotSel.select("text").style("opacity", 0).transition().delay(n => 380 + n.rank * 18).duration(400).style("opacity", null);
  arcSel.style("opacity", 0).transition().delay(e => 450 + e.t.rank * 18).duration(700).style("opacity", null);
}

export function init() {
  tlZoom.on("zoom", e => { tlT = e.transform; xz = tlT.rescaleX(xBase); draw(true); });
  tlSvg.call(tlZoom).on("dblclick.zoom", null);
  tlSvg.on("click", () => { if (state.play === "idle") select(null); });
  dotSel
    .on("mouseenter", (e, n) => {
      if (state.play !== "idle") return;
      hover(n);
      const h = n.history;
      showTip(`<b>${esc(n.id)}</b><span class="tl tl-ev">${esc(h.label)} · ${esc(h.event)}</span>${esc(h.headline)}`);
    })
    .on("mousemove", moveTip)
    .on("mouseleave", () => { hover(null); hideTip(); })
    .on("click", (e, n) => { e.stopPropagation(); if (state.play !== "idle") return; hideTip(); select(n.id); });
  dims(); recolour(); draw(true);

  on("selected", s => {
    applySelection();
    if (!visible()) return;
    if (s.selected) setTimeout(() => focus(s.selected), 60); else fit();
  });
  on(["hovered", "matches", "level"], paint);
  on(["colourBy", "theme"], recolour);
  on(["view", "tlMode"], (s, keys) => {
    if (!visible()) return;
    dims(); draw(true);
    if (keys.has("view")) intro();
    if (s.selected) setTimeout(() => focus(s.selected), keys.has("view") ? 350 : 200);
  });
}
