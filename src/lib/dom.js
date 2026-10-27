export const $ = id => document.getElementById(id);

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** Escape text for interpolation into HTML. */
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);

/** localStorage that never throws (private mode, blocked storage, file:// quirks). */
export const store = {
  get(key, fallback = null) { try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
};

export const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
