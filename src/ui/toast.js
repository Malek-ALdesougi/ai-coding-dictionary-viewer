import { $ } from "../lib/dom.js";

let timer = 0;
export function toast(msg) {
  const t = $("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(timer); timer = setTimeout(() => t.classList.remove("show"), 2400);
}
