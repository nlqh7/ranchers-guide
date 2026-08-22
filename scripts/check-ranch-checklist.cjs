const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const en = fs.readFileSync(path.join(root, "tools", "ranch-checklist.html"), "utf8");
const zh = fs.readFileSync(path.join(root, "zh", "tools", "ranch-checklist.html"), "utf8");

for (const [name, html] of [["English", en], ["Chinese", zh]]) {
  assert.match(html, /noindex,follow/i, `${name} checklist must remain noindex`);
  assert.doesNotMatch(html, /pagead2\.googlesyndication\.com/i, `${name} checklist must not load ads`);
  assert.equal((html.match(/data-checklist-panel=/g) || []).length, 4, `${name} checklist needs four goal panels`);
  assert.match(html, /assets\/js\/ranch-checklist\.js/);
  assert.match(html, /data-material-checklist/);
  assert.equal((html.match(/data-material-requirement/g) || []).length, 2, `${name} checklist needs the two confirmed Red Tent materials`);
  assert.match(html, /data-required="8"/);
  assert.match(html, /data-required="10"/);
}

assert.equal((en.match(/data-check-item=/g) || []).length, (zh.match(/data-check-item=/g) || []).length, "bilingual checklist item counts must match");
console.log("PASS: bilingual local ranch checklist has four goal paths, a bounded material check, local storage wiring and noindex/no-ad boundaries.");
