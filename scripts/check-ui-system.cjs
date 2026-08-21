const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "assets", "css", "style.css"), "utf8");
const docs = fs.readFileSync(path.join(root, "docs", "ui-system.md"), "utf8");

const semanticTokens = [
  "--color-canvas",
  "--color-surface",
  "--color-text",
  "--color-text-muted",
  "--color-border",
  "--color-action",
  "--color-action-hover",
  "--color-accent",
  "--focus-ring",
  "--duration-fast",
  "--duration-base",
];

const componentSelectors = [
  ".btn",
  ".card",
  ".notice",
  ".evidence-badge",
  ".site-search-control",
  ".nav-search-form",
  ".data-table",
  ".toc",
  ".article-next",
  ".knowledge-dossier",
];

for (const token of semanticTokens) {
  assert(css.includes(`${token}:`), `Missing semantic UI token ${token}`);
}

for (const selector of componentSelectors) {
  assert(css.includes(selector), `Missing canonical UI component ${selector}`);
  assert(docs.includes(`\`${selector}\``), `UI catalog does not document ${selector}`);
}

assert(css.includes(":focus-visible"), "Shared CSS must provide visible keyboard focus");
assert(css.includes("@media (prefers-reduced-motion: reduce)"), "Shared CSS must respect reduced motion");
assert(docs.includes("without adding React"), "UI architecture must keep the static-stack decision explicit");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

const htmlFiles = walk(root).filter((file) => !file.includes(`${path.sep}.git${path.sep}`));
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  assert(
    /<link[^>]+href=["'][^"']*assets\/css\/style\.css(?:\?[^"']*)?["']/i.test(html),
    `${path.relative(root, file)} does not load the shared UI system`,
  );
}

console.log(`PASS: UI system contract covers ${htmlFiles.length} HTML pages and ${componentSelectors.length} canonical components.`);
