const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const en = fs.readFileSync(path.join(root, "tools", "ranch-checklist.html"), "utf8");
const zh = fs.readFileSync(path.join(root, "zh", "tools", "ranch-checklist.html"), "utf8");
const buildingData = JSON.parse(fs.readFileSync(path.join(root, "data", "building-checklists.json"), "utf8"));

for (const [name, html] of [["English", en], ["Chinese", zh]]) {
  assert.match(html, /noindex,follow/i, `${name} checklist must remain noindex`);
  assert.doesNotMatch(html, /pagead2\.googlesyndication\.com/i, `${name} checklist must not load ads`);
  assert.equal((html.match(/data-checklist-panel=/g) || []).length, 7, `${name} checklist needs seven goal panels`);
  for (const goal of ["beginner", "farming", "animals", "power", "money", "exploration", "build"]) {
    assert.match(html, new RegExp(`data-checklist-goal="${goal}"`), `${name} checklist is missing the ${goal} goal`);
    assert.match(html, new RegExp(`data-checklist-panel="${goal}"`), `${name} checklist is missing the ${goal} panel`);
  }
  assert.match(html, /assets\/js\/ranch-checklist\.js/);
  assert.match(html, /data-material-checklist/);
  assert.equal((html.match(/data-material-requirement/g) || []).length, 2, `${name} checklist needs the two confirmed Red Tent materials`);
  assert.match(html, /data-required="8"/);
  assert.match(html, /data-required="10"/);
}

assert.equal((en.match(/data-check-item=/g) || []).length, (zh.match(/data-check-item=/g) || []).length, "bilingual checklist item counts must match");
assert.ok(Array.isArray(buildingData.targets) && buildingData.targets.length >= 1, "building checklist needs at least one documented target");
assert.ok(buildingData.targets.every((target) => target.id && target.name && target.zhName && target.build && target.validity && Array.isArray(target.materials) && target.materials.length > 0), "every building target needs bilingual labels, version boundary and materials");
assert.ok(buildingData.targets.every((target) => target.materials.every((material) => material.id && material.required > 0 && material.route && material.routeZh)), "every documented material needs a positive quantity and bilingual route");
assert.match(fs.readFileSync(path.join(root, "assets/js/ranch-checklist.js"), "utf8"), /building-checklists\.json/);
assert.match(fs.readFileSync(path.join(root, "assets/js/ranch-checklist.js"), "utf8"), /materialsByTarget/);
console.log(`PASS: bilingual local ranch checklist has seven goal paths, ${buildingData.targets.length} data-driven documented build target(s), local storage wiring and noindex/no-ad boundaries.`);
