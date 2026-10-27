// Node fill colours. "links" = light-to-dark by connection count (theme aware), "section" = one colour per section.
import { scaleLinear } from "d3";
import { maxDeg, secVar } from "../data.js";
import { cssVar } from "./dom.js";
import { state } from "../state.js";

let shade = () => "";
export function refreshShade() { shade = scaleLinear().domain([0, Math.sqrt(maxDeg)]).range([cssVar("--node-lo"), cssVar("--node-hi")]); }
export const nodeFill = n => (state.colourBy === "section" ? secVar(n.section) : shade(Math.sqrt(n.deg)));
refreshShade();
