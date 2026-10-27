// The single source of truth for UI state.
//   read:   state.x
//   change: set({ x })            -> subscribers whose keys changed run once, in registration order
//   react:  on(["x", "y"], fn)    -> fn(state, changedKeys)
// Changes made inside a subscriber are queued and delivered after the current round, so every
// subscriber always sees a consistent state. Register subscribers in the order they must run (see main.js).
import { isPhone } from "./lib/env.js";

export const state = {
  selected: null,       // node object or null
  hovered: null,        // node object being previewed (mouse over a dot, chip or link)
  view: "graph",        // "graph" | "timeline"
  tlMode: "lanes",      // "lanes" (desktop) | "eras" (phone) | "list"
  level: "all",         // "all" | "beginner" | "intermediate" | "advanced"
  matches: null,        // Set of term ids matching the search box, or null
  colourBy: "links",    // "links" | "section"
  theme: "auto",        // "auto" | "light" | "dark"
  drawer: false,        // Browse drawer open
  popover: null,        // "tours" | "levels" | "keycard" | null
  tour: null,           // { path, i } while a guided tour runs
  play: "idle",         // "idle" | "playing" | "paused" (timeline history playback)
  phone: isPhone(),     // below the 700px breakpoint
  sheetSnap: "half",    // phone details sheet: "peek" | "half" | "full"
};

const subs = [];
let pending = null, flushing = false;

export function set(patch) {
  for (const k in patch) {
    if (!(k in state)) throw new Error(`Unknown state key: ${k}`);
    if (state[k] !== patch[k]) { state[k] = patch[k]; (pending ||= new Set()).add(k); }
  }
  if (flushing || !pending) return;
  flushing = true;
  try {
    while (pending) {
      const keys = pending; pending = null;
      for (const s of subs) if (s.keys.some(k => keys.has(k))) s.fn(state, keys);
    }
  } finally { flushing = false; }
}

export function on(keys, fn) { subs.push({ keys: [].concat(keys), fn }); }

/** Terms faded by the level filter. */
export const levelOff = n => state.level !== "all" && n.level !== state.level;
