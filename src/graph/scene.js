// The graph's SVG layers. Built once; graph.js animates them.
import { select, zoom as d3zoom, zoomIdentity } from "d3";
import { nodes, links, radius } from "../data.js";

export const svg = select("#graph");
export const defs = svg.select("defs");
export const root = svg.append("g");
export const linkSel = root.append("g").selectAll("path").data(links).join("path").attr("class", "link");
const fx = root.append("g");                      // glow lines, sparks and ripples around the selected term
export const haloG = fx.append("g"), coreG = fx.append("g"), sparkG = fx.append("g"), rippleG = fx.append("g");
export const nodeSel = root.append("g").selectAll("g").data(nodes).join("g").attr("class", "node");
nodeSel.append("circle").attr("class", "dot").attr("r", radius);
nodeSel.append("text").text(n => n.id).attr("text-anchor", "middle").attr("dy", n => -radius(n) - 5);

export const zoom = d3zoom().scaleExtent([0.2, 5]);
/** Current camera transform and whether a glide is running (labels freeze while it moves). */
export const cam = { t: zoomIdentity, moving: false };
