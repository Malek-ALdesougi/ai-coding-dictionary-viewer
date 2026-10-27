// The details panel (desktop side panel / phone bottom sheet): what a term means, where it came from, what it links to.
import { byId, LEVELS, lvBars } from "../data.js";
import { state, on } from "../state.js";
import { select, back, canGoBack, hover } from "../selection.js";
import { setView } from "../app/views.js";
import { $, esc } from "../lib/dom.js";
import { renderMarkdown } from "../lib/markdown.js";
import { attachTermTip } from "../ui/tooltip.js";
import { toast } from "../ui/toast.js";

const panel = $("panel"), content = $("content");

/** Clickable term chips. Pass `ordered` to keep the given order (e.g. chronological) instead of A–Z. */
function chips(el, ids, { ordered = false } = {}) {
  el.innerHTML = "";
  const list = ordered ? [...ids] : [...ids].sort();
  list.forEach((id, i) => {
    const s = document.createElement("span");
    s.textContent = id; s.style.animationDelay = i * 18 + "ms"; s.tabIndex = 0; s.setAttribute("role", "button");
    s.onclick = () => select(id);
    s.onmouseenter = () => hover(byId.get(id)); s.onmouseleave = () => hover(null);
    const m = byId.get(id); if (m && m.history) s.title = m.history.label;
    el.append(s);
  });
  if (!list.length) el.innerHTML = '<span class="none">none</span>';
}

function stripLead(body, desc) {          // the first paragraph usually restates the description
  const paras = body.split(/\n\s*\n/), first = paras[0].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const probe = desc.slice(0, 30).toLowerCase();
  return probe && first.toLowerCase().includes(probe) ? paras.slice(1).join("\n\n") : body;
}

function fillHistory(n) {
  const el = $("p-history"), h = n.history;
  if (!h) { el.innerHTML = ""; return; }
  const conf = { high: 3, medium: 2, low: 1 }[h.confidence] || 1;
  el.innerHTML = `<div class="h-top"><span class="h-badge">${esc(h.event)}</span><span class="h-date">${esc(h.label)}</span>
      <span class="h-conf" title="Research confidence: ${esc(h.confidence)}">${[1, 2, 3].map(i => `<i class="${i <= conf ? "on" : ""}"></i>`).join("")}</span></div>
    <div class="h-head">${esc(h.headline)}</div>
    <p class="h-story">${esc(h.story)}</p>
    ${h.roots ? `<p class="h-roots">Roots · ${esc(h.roots)}</p>` : ""}
    <div class="label">Built on</div><div class="chips" id="h-from"></div>
    <div class="label">Led to</div><div class="chips" id="h-kids"></div>
    <div class="label">Sources</div><div class="h-sources">${(h.sources || []).map(s =>
      `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a>${s.unverified ? '<span class="u">not checked</span>' : ""}`).join("")}</div>
    <button class="h-go" id="h-go">${state.view === "timeline" ? "See it in the graph →" : "See it on the timeline →"}</button>`;
  const chrono = ids => [...ids].sort((a, b) => (byId.get(a).t || 0) - (byId.get(b).t || 0));
  chips($("h-from"), chrono(h.from), { ordered: true });
  chips($("h-kids"), chrono(n.kids || []), { ordered: true });
  $("h-go").onclick = () => setView(state.view === "timeline" ? "graph" : "timeline");
}

function fillLineage(n) {           // phone: compact "Built on / Led to" strip under the plain-English line
  const lin = $("p-lineage"), from = n.history ? n.history.from : [], kids = n.kids ? [...n.kids] : [];
  const row = (label, ids) => (ids.length ? `<div class="lrow"><span class="lk">${label}</span>${ids.map(x => `<span class="lc" role="button" tabindex="0" data-t="${esc(x)}">${esc(x)}</span>`).join("")}</div>` : "");
  lin.innerHTML = row("Built on", from) + row("Led to", kids);
  lin.hidden = !lin.innerHTML;
}

function fill(n) {
  $("p-meta").textContent = `${n.out.size} links out · ${n.in.size} links in`;
  $("p-title").textContent = n.id;
  $("p-desc").textContent = n.description;
  $("p-plain").textContent = n.plain || n.description;
  $("p-plainbox").hidden = !n.plain;
  $("p-level").textContent = `${lvBars(n.level)} ${LEVELS[n.level].label}`;
  const body = $("p-body");
  body.innerHTML = renderMarkdown(stripLead(n.body, n.description));
  body.querySelectorAll("a").forEach(a => {
    const m = (a.getAttribute("href") || "").match(/^\.\/(.+?)\.md/);
    if (m) {                                   // links to other entries become in-app term links
      const t = decodeURIComponent(m[1]); a.removeAttribute("href");
      a.onclick = () => select(t);
      a.onmouseenter = () => hover(byId.get(t)); a.onmouseleave = () => hover(null);
      a.classList.add("tlink"); a.tabIndex = 0; a.setAttribute("role", "link"); attachTermTip(a, t);
    } else { a.target = "_blank"; a.rel = "noopener"; }
  });
  chips($("p-out"), n.out);
  chips($("p-in"), n.in);
  fillHistory(n);
  fillLineage(n);
  panel.scrollTop = 0;
}

let swapT = 0;
function onSelected(s) {
  const n = s.selected;
  document.body.classList.toggle("panel-open", !!n);
  $("back").disabled = !canGoBack();
  if (!n) { panel.classList.remove("open"); return; }
  if (panel.classList.contains("open")) {      // already open: cross-fade to the new term
    content.classList.add("swap"); clearTimeout(swapT);
    swapT = setTimeout(() => { if (state.selected === n) fill(n); content.classList.remove("swap"); }, 180);
  } else { fill(n); panel.classList.add("open"); }
}

async function copyLink() {
  let ok = false;
  try { await navigator.clipboard.writeText(location.href); ok = true; }
  catch {
    try { const ta = document.createElement("textarea"); ta.value = location.href; document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy"); ta.remove(); } catch { /* no clipboard */ }
  }
  toast(ok ? "Link to this term copied" : "Couldn't copy — the address bar has the link");
}

export function init() {
  panel.querySelector(".close").onclick = () => select(null);
  panel.addEventListener("scroll", () => panel.classList.toggle("scrolled", panel.scrollTop > 4), { passive: true });
  $("back").onclick = () => back();
  $("copy-link").onclick = copyLink;
  $("p-lineage").onclick = e => { const c = e.target.closest(".lc"); if (c) select(c.dataset.t); };
  on("selected", onSelected);
  on("view", s => { if (s.selected) fillHistory(s.selected); });
}
