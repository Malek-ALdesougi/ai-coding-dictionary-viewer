// Viewport + motion preferences. The 700px breakpoint must match the CSS @media (max-width: 700px) rules.
export const PHONE_QUERY = "(max-width: 700px)";
export const PHONE_MQ = matchMedia(PHONE_QUERY);
export const isPhone = () => PHONE_MQ.matches;

const RM = matchMedia("(prefers-reduced-motion: reduce)");
export const motion = { reduce: RM.matches };
RM.addEventListener("change", e => { motion.reduce = e.matches; });
/** d3 durations honour prefers-reduced-motion. */
export const mot = ms => (motion.reduce ? 0 : ms);
export const scrollBehavior = () => (motion.reduce ? "auto" : "smooth");
