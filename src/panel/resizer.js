// Desktop: drag the panel's left edge to make it wider. 460px is the minimum; the user's choice is remembered.
import { $, store } from "../lib/dom.js";
import { toast } from "../ui/toast.js";

export const PW_MIN = 460;
const KEY = "dict-panel-w", rz = $("resizer"), badge = $("wbadge");
const pwMax = () => Math.max(PW_MIN, Math.min(980, Math.round(innerWidth * 0.7)));
let pw = PW_MIN, pref = +store.get(KEY) || PW_MIN;      // pref = what the user chose; pw = what fits right now
let reframe = () => {};
export const onPanelResize = fn => { reframe = fn; };

export function setPanelWidth(v = pref, save = false) {
  pref = Math.max(PW_MIN, Math.round(v)); pw = Math.min(pwMax(), pref);
  document.documentElement.style.setProperty("--panel-w", pw + "px");
  rz.setAttribute("aria-valuenow", pw); rz.setAttribute("aria-valuemax", pwMax());
  badge.textContent = pw <= PW_MIN ? `${pw}px · default` : `${pw}px`;
  if (save) store.set(KEY, pref === PW_MIN ? "" : String(pref));
}

export function init() {
  rz.setAttribute("aria-valuemin", PW_MIN);
  setPanelWidth(pref);
  rz.addEventListener("pointerdown", e => {
    e.preventDefault(); rz.setPointerCapture(e.pointerId); document.body.classList.add("resizing");
    const move = ev => setPanelWidth(innerWidth - ev.clientX);
    const up = () => {
      rz.removeEventListener("pointermove", move); rz.removeEventListener("pointerup", up); rz.removeEventListener("pointercancel", up);
      document.body.classList.remove("resizing"); setPanelWidth(pw, true); reframe();
    };
    rz.addEventListener("pointermove", move); rz.addEventListener("pointerup", up); rz.addEventListener("pointercancel", up);
  });
  rz.addEventListener("dblclick", () => { setPanelWidth(PW_MIN, true); reframe(); toast("Panel width reset"); });
  let t = 0;
  rz.addEventListener("keydown", e => {
    const step = e.shiftKey ? 80 : 24;
    if (e.key === "ArrowLeft") setPanelWidth(pw + step, true);
    else if (e.key === "ArrowRight") setPanelWidth(pw - step, true);
    else if (e.key === "Home") setPanelWidth(PW_MIN, true);
    else return;
    e.preventDefault(); clearTimeout(t); t = setTimeout(reframe, 250);
  });
  rz.addEventListener("focus", () => rz.classList.add("showw"));
  rz.addEventListener("blur", () => rz.classList.remove("showw"));
}
