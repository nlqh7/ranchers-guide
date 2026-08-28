const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const en = fs.readFileSync(path.join(root, "tools", "ranch-checklist.html"), "utf8");
const zh = fs.readFileSync(path.join(root, "zh", "tools", "ranch-checklist.html"), "utf8");
const buildingData = JSON.parse(fs.readFileSync(path.join(root, "data", "building-checklists.json"), "utf8"));

for (const file of ['guides/building-construction.html', 'zh/guides/building-construction.html', 'tools/ranch-checklist.html', 'zh/tools/ranch-checklist.html']) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const table = html.match(/<table class="building-requirements-table">[\s\S]*?<\/table>/)?.[0];
  assert.ok(table, `${file}: all building requirements must be in a static, visible table`);
  for (const target of buildingData.targets) {
    const row = table.match(new RegExp(`<tr id="building-${target.id}"[\\s\\S]*?<\\/tr>`))?.[0];
    assert.ok(row, `${file}: missing separate row for ${target.id}`);
    for (const material of target.materials) {
      assert.ok(row.includes(`data-ingredient="${material.id}" data-quantity="${material.required}"`), `${file}: ${target.id} must list ${material.required} ${material.id}`);
    }
  }
  assert.equal((table.match(/id="building-/g) || []).length, buildingData.targets.length);
  assert.doesNotMatch(table, /<details|<select|<input|hidden/, `${file}: lookup must not require interaction`);
  assert.match(table, /historical|历史/i);
  assert.match(html, /building-requirements\.css\?v=20260828-1/);
  const nativeTable = html.match(/<table class="recipe-table">[\s\S]*?<\/table>/)?.[0];
  assert.ok(nativeTable && html.indexOf(nativeTable) < html.indexOf('<details'), `${file}: native requirements precede optional historical records`);
  assert.match(html, /Wood \/ Rock/, `${file}: preserve the Alpha material naming boundary`);
}

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
  assert.match(html, /<details class="material-tracker"><summary>/, `${name}: quantity tracking is optional`);
  assert.match(html, /<details class="checklist-secondary"><summary>/, `${name}: other goal controls are secondary`);
  assert.match(html, /ranch-checklist\.js\?v=20260828-1/, `${name}: script cache is current`);
}

assert.equal((en.match(/data-check-item=/g) || []).length, (zh.match(/data-check-item=/g) || []).length, "bilingual checklist item counts must match");
assert.ok(Array.isArray(buildingData.targets) && buildingData.targets.length >= 1, "building checklist needs at least one documented target");
assert.ok(buildingData.targets.every((target) => target.id && target.name && target.zhName && target.build && target.validity && Array.isArray(target.materials) && target.materials.length > 0), "every building target needs bilingual labels, version boundary and materials");
assert.ok(buildingData.targets.every((target) => target.materials.every((material) => material.id && material.required > 0 && material.route && material.routeZh)), "every documented material needs a positive quantity and bilingual route");
const historicalWikiTargets = buildingData.targets.filter((target) => target.sourceIds?.some((sourceId) => sourceId.startsWith("official-wiki-")));
assert.equal(historicalWikiTargets.length, 10, "the retained Official Wiki material set must stay complete");
assert.ok(historicalWikiTargets.every((target) => target.validity === "historical" && target.source?.url?.startsWith("https://wiki.ranchers.game/")), "Official Wiki material records must remain historical and directly linked");
assert.ok(historicalWikiTargets.every((target) => /Historical Official Wiki|历史官方 Wiki/.test(`${target.caution} ${target.zhCaution}`)), "historical Wiki targets need an explicit current-build warning");
assert.match(fs.readFileSync(path.join(root, "assets/js/ranch-checklist.js"), "utf8"), /building-checklists\.json/);
assert.match(fs.readFileSync(path.join(root, "assets/js/ranch-checklist.js"), "utf8"), /materialsByTarget/);
console.log(`PASS: bilingual local ranch checklist has seven goal paths, ${buildingData.targets.length} data-driven documented build target(s), local storage wiring and noindex/no-ad boundaries.`);
