// Keyboard focus stays inside an open menu / drawer / dialog and returns to where it was on close.
import { createFocusTrap } from "focus-trap";

export function trap(el, options = {}) {
  const t = createFocusTrap(el, {
    escapeDeactivates: false,          // Esc is handled centrally (app/keyboard.js) so it closes things in the right order
    clickOutsideDeactivates: true,     // mouse/touch users can always click elsewhere
    returnFocusOnDeactivate: true,
    preventScroll: true,
    fallbackFocus: el,
    ...options,
  });
  return {
    on() { try { t.activate(); } catch { /* nothing focusable yet */ } },
    off() { try { t.deactivate(); } catch { /* already inactive */ } },
  };
}
