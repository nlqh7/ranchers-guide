const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const en = fs.readFileSync(path.join(root, "tools", "ranch-checklist.html"), "utf8");
const zh = fs.readFileSync(path.join(root, "zh", "tools", "ranch-checklist.html"), "utf8");

for (const [name, html] of [["English", en], ["Chinese", zh]]) {
  assert.match(html, /noindex,follow/i, `${name} checklist must remain noindex`);
  assert.doesNotMatch(html, /pagead2\.googlesyndication\.com/i, `${name} checklist must not load ads`);
  assert.equal((html.match(/data-checklist-panel=/g) || []).length, 3, `${name} checklist needs three goal panels`);
  assert.match(html, /assets\/js\/ranch-checklist\.js/);
}

assert.equal((en.match(/data-check-item=/g) || []).length, (zh.match(/data-check-item=/g) || []).length, "bilingual checklist item counts must match");
console.log("PASS: bilingual local ranch checklist has three goal paths, local storage wiring and noindex/no-ad boundaries.");
