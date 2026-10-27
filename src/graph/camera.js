// One calm camera move: the world point under the screen centre travels in a straight line
// while zoom eases geometrically (no zoom-out swoop).
import { easeCubicInOut, zoomIdentity, min, max } from "d3";
import { svg, zoom, cam } from "./scene.js";
import { nodes } from "../data.js";
import { state } from "../state.js";
import { motion, isPhone } from "../lib/env.js";
import { panelWidth, sheetTop, tabH, barH, FOOT_H } from "../layout.js";

let onLand = () => {};
export const onCameraLand = fn => { onLand = fn; };
const stop = () => { cam.moving = false; document.body.classList.remove("cam"); };

export function camTo(target, dur) {
  svg.interrupt("cam");
  if (motion.reduce || !dur) { stop(); svg.call(zoom.transform, target); onLand(); return; }
  const A = [innerWidth / 2, innerHeight / 2], q0 = cam.t.invert(A), q1 = target.invert(A), k0 = cam.t.k, k1 = target.k;
  cam.moving = true; document.body.classList.add("cam");
  svg.transition("cam").duration(dur).ease(easeCubicInOut).tween("cam", () => t => {
    const k = k0 * Math.pow(k1 / k0, t), qx = q0[0] + (q1[0] - q0[0]) * t, qy = q0[1] + (q1[1] - q0[1]) * t;
    svg.call(zoom.transform, zoomIdentity.translate(A[0] - qx * k, A[1] - qy * k).scale(k));
  }).on("end interrupt", () => { stop(); onLand(); });
}
// a person grabbing the map always wins over an automatic glide
svg.on("wheel.cam pointerdown.cam", () => { svg.interrupt("cam"); stop(); });

/** Fit these terms into the part of the screen the graph can use (beside the panel / above the phone sheet). */
export function frame(list, maxK = 2.2) {
  const ph = isPhone(), sel = state.selected, pad = ph ? 34 : 70, w = innerWidth - panelWidth();
  const bottom = ph && sel ? sheetTop() : innerHeight, bar = barH(), foot = ph ? (sel ? 0 : tabH()) : FOOT_H;
  const xs = list.map(n => n.x), ys = list.map(n => n.y);
  const [x0, x1, y0, y1] = [min(xs), max(xs), min(ys), max(ys)];
  let k = Math.max(0.3, Math.min(maxK, (w - pad * 2) / Math.max(x1 - x0, 1), (bottom - bar - foot - pad * 2) / Math.max(y1 - y0, 1)));
  if (sel && list.length < nodes.length && cam.t.k > 0.5) k = cam.t.k * Math.pow(k / cam.t.k, 0.55);   // soften zoom changes between neighbouring terms
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  camTo(zoomIdentity.translate(w / 2 - cx * k, bar + (bottom - bar - foot) / 2 - cy * k).scale(k), 1250);
}
export const fitAll = () => frame(nodes, 1.4);
