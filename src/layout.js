// Screen geometry shared by the graph camera, the timeline camera and the phone sheet.
import { state } from "./state.js";
import { isPhone } from "./lib/env.js";

const el = id => document.getElementById(id);
export const FOOT_H = 44;   // desktop footer bar (keep in sync with --foot-h)
export const PEEK_H = 128;  // phone sheet height when peeking

export const barH = () => el("toolbar").offsetHeight;
/** Height of the graph's own toolbar row (desktop/tablet only; hidden on phones). */
export const viewBarH = () => (isPhone() ? 0 : el("gbar").offsetHeight);
export const tabH = () => (isPhone() ? el("tabbar").offsetHeight : 0);
export const panelWidth = () => { const p = el("panel"); return p.classList.contains("open") && !isPhone() ? p.offsetWidth : 0; };
export const sheetH = () => el("panel").offsetHeight;
export const snapY = sn => { const H = sheetH(); return sn === "full" ? 0 : sn === "peek" ? Math.max(0, H - PEEK_H) : Math.round(H * 0.5); };
/** Top edge of the phone sheet; when it is full, frame as if it were half so the graph still has room. */
export const sheetTop = () => innerHeight - tabH() - sheetH() + snapY(state.sheetSnap === "full" ? "half" : state.sheetSnap);
