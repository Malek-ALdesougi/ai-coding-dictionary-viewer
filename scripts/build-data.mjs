// Builds src/data/dictionary.json from the dictionary vault + content/*.json.
// Usage: node scripts/build-data.mjs [path-to-dictionary-folder]
// If the vault is not found, the existing dictionary.json is kept so `vite build` still works.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.resolve(process.argv[2] || process.env.DICTIONARY_DIR || path.join(root, "../dictionary-of-ai-coding/dictionary"));
const out = path.join(root, "src/data/dictionary.json");
const readJSON = (p, fallback) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback);

if (!fs.existsSync(dir)) {
  if (fs.existsSync(out)) { console.warn(`Dictionary folder not found (${dir}); keeping the existing ${path.relative(root, out)}.`); process.exit(0); }
  console.error(`Dictionary folder not found: ${dir}\nPass it as an argument: npm run data -- /path/to/dictionary`); process.exit(1);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith(".md"));
const ids = new Set(files.map(f => f.slice(0, -3)));
const nodes = [], links = [], seen = new Set();
for (const f of files) {
  const id = f.slice(0, -3);
  let raw = fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n");
  let description = "";
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    const d = fm[1].match(/^description:\s*(.*)$/m);
    if (d) description = d[1].replace(/^["']|["']$/g, "");
    raw = raw.slice(fm[0].length);
  }
  for (const m of raw.matchAll(/\]\(\.\/([^)#]+?)\.md(?:#[^)]*)?\)/g)) {
    const target = decodeURIComponent(m[1]);
    if (!ids.has(target) || target === id) continue;
    const key = id + "\u0000" + target;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ source: id, target });
  }
  nodes.push({ id, description, body: raw.trim() });
}

// curriculum sections (lanes on the timeline, colours, browse groups)
const sections = [];
const curPath = path.join(dir, "../internal/Curriculum.md");
if (fs.existsSync(curPath)) {
  for (const line of fs.readFileSync(curPath, "utf8").replace(/\r\n/g, "\n").split("\n")) {
    const h = line.match(/^## Section \d+ — (.+)$/);
    if (h) sections.push({ name: h[1].trim(), terms: [] });
    const t = line.match(/^- (.+)$/);
    if (t && sections.length) sections[sections.length - 1].terms.push(t[1].trim());
  }
}

// researched origin dates + lineage
const timeline = readJSON(path.join(root, "content/timeline.json"), {});
for (const n of nodes) n.history = timeline[n.id] || null;
const missing = nodes.filter(n => !n.history).map(n => n.id);
if (missing.length) console.warn("No timeline entry for:", missing.join(", "));
for (const n of nodes) for (const f of (n.history && n.history.from) || []) if (!ids.has(f)) console.warn(`Timeline: ${n.id} is built on unknown term: ${f}`);

// beginner-friendly layer: level, plain-English line, guided tours
const guide = readJSON(path.join(root, "content/guide.json"), {});
guide.terms = guide.terms || {}; guide.paths = guide.paths || [];
for (const n of nodes) {
  const g = guide.terms[n.id] || {};
  n.level = g.level || "intermediate";
  n.plain = g.plain || "";
  n.section = sections.findIndex(sec => sec.terms.includes(n.id));
}
for (const p of guide.paths) for (const st of p.steps) if (!ids.has(st.term)) console.warn(`Tour ${p.id} has unknown term: ${st.term}`);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ nodes, links, sections, paths: guide.paths }));
console.log(`Wrote ${path.relative(root, out)}: ${nodes.length} terms, ${links.length} links, ${sections.length} sections, ${guide.paths.length} tours`);
