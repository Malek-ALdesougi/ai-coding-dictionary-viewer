# AI Dictionary Viewer (v2)

Graph + timeline viewer for mattpocock/dictionary-of-ai-coding. Builds to ONE self-contained `dist/index.html` that opens from disk (no server).

## Commands
- `npm install` — once
- `npm run data` — rebuild `src/data/dictionary.json` from the vault (`scripts/build-data.mjs`; needs the vault path set inside it; keeps the existing JSON if the vault is missing). Content lives in `content/guide.json` (tours, levels, plain-English text) and `content/timeline.json`.
- `npm run dev` — live-reload dev server
- `npm run build` — writes `dist/index.html` (share this file)
- `npm test` — Playwright behaviour + visual + size tests (build first). `npm run test:update-visuals` re-records baselines after an intended design change.

## Structure
- `src/state.js` — the one state store: `set(patch)`, `on(keys, fn)`. Everything reacts to state; nothing reads another module's DOM.
- `src/main.js` — start-up. **Subscriber order matters** (views first, hash last).
- `src/data.js`, `layout.js`, `selection.js` — derived data, sizes, selection/back stack.
- `src/graph/`, `src/timeline/`, `src/panel/`, `src/ui/`, `src/app/`, `src/lib/` — by feature.
- `src/styles/` — CSS by component; `index.css` lists them. Order matters (later files override earlier ones at equal specificity).

## Rules
1. One breakpoint: 700px. `isPhone()` in `src/lib/env.js` must match the CSS `@media (max-width:700px)`.
2. Change UI state through `set()`, never by toggling classes from another module.
3. Escape interpolated text with `esc()`; markdown goes through DOMPurify (`lib/markdown.js`).
4. Heights come from `--bar-h`, `--tab-h`, `--foot-h`.
