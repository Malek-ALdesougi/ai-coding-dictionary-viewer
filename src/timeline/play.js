// "Play history": a playhead sweeps through time and each term is born as it passes.
// state.play: idle -> playing <-> paused -> idle (Stop, leaving the lanes, or reaching the end).
import { select as d3select, timer, easeBackOut, easeCubicOut } from "d3";
import { rr } from "../data.js";
import { state, set, on } from "../state.js";
import { select } from "../selection.js";
import { setView } from "../app/views.js";
import { motion, mot } from "../lib/env.js";
import { $ } from "../lib/dom.js";
import * as lanes from "./lanes.js";

const SPEEDS = [0.75, 1, 1.5, 2];
const playMs = () => (motion.reduce ? 10 : 26000);
let tmr = null, endT = 0, p = 0, born = new Set(), token = 0, speed = 1;
const playBtn = $("play"), stopBtn = $("stop"), wm = $("watermark");
const yearLabel = v => { const y = Math.floor(v); return v < 2016 ? String(y) : `${lanes.MONTHS[Math.min(11, Math.floor((v - y) * 12))]} ${y}`; };

function buttons() {
  const st = state.play;
  const [ico, label] = st === "playing" ? ["pause", "Pause"] : st === "paused" ? ["play", "Resume"] : ["play", "Play history"];
  playBtn.innerHTML = `<svg class="i" aria-hidden="true"><use href="#i-${ico}"/></svg><span class="lbl">${label}</span>`;
  playBtn.setAttribute("aria-label", label);
  playBtn.title = st === "playing" ? "Pause (Space)" : st === "paused" ? "Resume (Space)" : "Play history (Space)";
  playBtn.classList.toggle("on", st === "playing");
  stopBtn.classList.toggle("show", st !== "idle");
}
export const togglePlay = () => (state.play === "idle" ? start() : state.play === "playing" ? pause() : resume());

function start() {
  if (state.view !== "timeline") setView("timeline");
  if (state.selected) select(null);
  clearTimeout(endT);
  const tk = ++token;
  p = 0; born = new Set(); set({ play: "playing" });
  lanes.fit();
  setTimeout(() => {
    if (tk !== token || state.play === "idle") return;        // stopped during the intro zoom
    wm.classList.add("show");
    lanes.dotSel.classed("unborn", true); lanes.arcSel.classed("unborn", true);
    lanes.playLine.style("display", null); lanes.playDot.style("display", null);
    if (state.play === "playing") run();
  }, mot(850));
}
function run() {
  let last = null;
  tmr = timer(el => {
    if (last === null) last = el;
    p = Math.min(1, p + ((el - last) * speed) / playMs()); last = el;
    const { M, xz } = lanes, X0 = M.l - 10, X1 = innerWidth - M.r + 4, X = X0 + (X1 - X0) * p;   // read live so a resize mid-play stays correct
    lanes.playLine.attr("x1", X).attr("x2", X);
    lanes.playDot.attr("cx", X).attr("cy", innerHeight - M.b + 8);
    wm.textContent = yearLabel(Math.min(2026.99, xz.invert(Math.max(X, M.l))));
    lanes.dotSel.each(function (n) { if (!born.has(n.id) && n.tx <= X) { born.add(n.id); birth(this, n); } });
    if (p >= 1) stop(true);
  });
}
function pause() { if (state.play !== "playing") return; tmr?.stop(); tmr = null; set({ play: "paused" }); }
function resume() { if (state.play !== "paused") return; set({ play: "playing" }); run(); }
function birth(el, n) {
  const g = d3select(el).classed("unborn", false).classed("born", true);
  g.select("circle").interrupt().attr("r", 0).transition().duration(mot(700)).ease(easeBackOut.overshoot(3)).attr("r", rr(n));
  lanes.gRip.append("circle").attr("class", "ripple").attr("cx", n.tx).attr("cy", n.ty).attr("r", rr(n)).attr("opacity", 0.8).attr("stroke-width", 2)
    .transition().duration(mot(1000)).ease(easeCubicOut).attr("r", rr(n) + 28).attr("opacity", 0).remove();
  lanes.arcSel.filter(e => e.t === n).classed("unborn", false).each(function () {
    const len = this.getTotalLength();
    d3select(this).interrupt().style("stroke", "var(--accent)").attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
      .transition().duration(mot(800)).ease(easeCubicOut).attr("stroke-dashoffset", 0)
      .transition().duration(mot(900)).style("stroke", null).on("end", function () { d3select(this).attr("stroke-dasharray", null); });
  });
  setTimeout(() => g.classed("born", false), 1800);
}
export function stop(finished) {
  if (state.play === "idle" && !tmr) return;
  token++;
  tmr?.stop(); tmr = null; p = 0;
  set({ play: "idle" });
  lanes.dotSel.classed("unborn", false); lanes.arcSel.classed("unborn", false);
  if (!finished) {
    lanes.dotSel.classed("born", false);
    lanes.dotSel.select("circle").interrupt().attr("r", rr);
    lanes.arcSel.interrupt().style("stroke", null).attr("stroke-dasharray", null);
  }
  lanes.playLine.style("display", "none"); lanes.playDot.style("display", "none");
  endT = setTimeout(() => wm.classList.remove("show"), finished ? 1600 : 0);
}

export function init() {
  playBtn.onclick = e => { e.stopPropagation(); togglePlay(); };
  stopBtn.onclick = e => { e.stopPropagation(); stop(); };
  $("speed").onclick = e => { e.stopPropagation(); speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; $("speed").textContent = speed + "×"; };
  buttons();
  on("play", buttons);
  on(["view", "tlMode"], s => { if (s.play !== "idle" && (s.view !== "timeline" || s.tlMode !== "lanes")) stop(); });
}
