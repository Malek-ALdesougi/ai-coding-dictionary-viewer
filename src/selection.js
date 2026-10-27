// Selecting a term. Everything that reacts to a selection subscribes to state.selected.
import { state, set } from "./state.js";
import { byId } from "./data.js";

let navStack = [];   // ids visited since the panel was opened, for Back
export function select(id) {
  const n = id ? byId.get(id) || null : null;
  if (n === state.selected) return;
  if (n) navStack.push(n.id); else navStack = [];
  set({ selected: n, hovered: null });
}
export const canGoBack = () => navStack.length >= 2;
export function back() { navStack.pop(); const prev = navStack.pop(); select(prev || null); }
export const hover = n => { if (state.hovered !== n) set({ hovered: n || null }); };
