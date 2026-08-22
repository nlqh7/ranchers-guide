const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const check = (html, pattern, message) => assert.match(html, pattern, message);

const toolPages = [
  "tools/update-impact-tracker.html",
  "zh/tools/update-impact-tracker.html",
  "tools/quest-tracker.html",
  "zh/tools/quest-tracker.html",
  "tools/ranch-checklist.html",
  "zh/tools/ranch-checklist.html",
];

for (const relative of toolPages) {
  const html = read(relative);
  check(html, /name="robots" content="noindex,follow"/i, `${relative}: local tools must remain noindex`);
  assert.doesNotMatch(html, /pagead2\.googlesyndication\.com/i, `${relative}: local tools must not load ads`);
}

const sitemap = read("sitemap.xml");
for (const route of [
  "/tools/update-impact-tracker",
  "/zh/tools/update-impact-tracker",
  "/tools/quest-tracker",
  "/zh/tools/quest-tracker",
  "/tools/ranch-checklist",
  "/zh/tools/ranch-checklist",
]) {
  assert.doesNotMatch(sitemap, new RegExp(`<loc>https://theranchersguide\\.com${route.replaceAll("/", "\\/")}<\\/loc>`), `${route}: private tool must stay out of sitemap`);
}

for (const relative of ["tools/update-impact-tracker.html", "zh/tools/update-impact-tracker.html"]) {
  const html = read(relative);
  check(html, /data-update-impact-tracker/);
  check(html, /data-update-select/);
  check(html, /data-update-list/);
}
const updateScript = read("assets/js/update-impact-tracker.js");
check(updateScript, /data\/updates\.json/);
check(updateScript, /localStorage/);
check(updateScript, /actions/);
check(updateScript, /routeZh/);
const updates = JSON.parse(read("data/updates.json"));
assert.equal(updates.meta.currentBuild, "0.8.10.842", "update tracker must use the current content baseline");
assert.ok(updates.updates.length >= 1 && updates.updates.every((item) => item.actions.length > 0));

for (const relative of ["tools/quest-tracker.html", "zh/tools/quest-tracker.html"]) {
  const html = read(relative);
  check(html, /data-quest-tracker/);
  check(html, /data-quest-list/);
  check(html, /data-quest-filter="category"/);
  check(html, /data-quest-filter="npc"/);
  check(html, /data-quest-filter="location"/);
  check(html, /data-quest-overview/);
}
const questScript = read("assets/js/quest-tracker.js");
for (const pattern of [/data\/quests\.json/, /localStorage/, /relatedRoutes/, /relations/, /recordMatches/, /progressFor/, /TBD|待验证/]) {
  check(questScript, pattern, `quest tracker missing contract ${pattern}`);
}
const questData = JSON.parse(read("data/quests.json"));
assert.ok(questData.quests.length > 0 && questData.quests.every((quest) => Array.isArray(quest.facts)));

for (const relative of ["tools/ranch-checklist.html", "zh/tools/ranch-checklist.html"]) {
  const html = read(relative);
  check(html, /data-ranch-checklist/);
  assert.equal((html.match(/data-checklist-panel=/g) || []).length, 7, `${relative}: checklist goal coverage drifted`);
  check(html, /data-material-checklist/);
  assert.equal((html.match(/data-material-requirement/g) || []).length, 2, `${relative}: confirmed material checklist drifted`);
}
const checklistScript = read("assets/js/ranch-checklist.js");
check(checklistScript, /localStorage/);
check(checklistScript, /data-check-item/);

for (const relative of ["map.html", "zh/map.html"]) {
  const html = read(relative);
  for (const pattern of [
    /data-map-marker-layer/,
    /data-map-pin-filter="all"/,
    /data-map-evidence-filter="supported"/,
    /data-map-evidence-filter="reported"/,
    /data-map-evidence-filter="planned"/,
    /data-map-relation-filter="all"/,
    /data-map-relation-filter="npc"/,
    /data-map-relation-filter="quest"/,
    /data-map-relation-filter="service"/,
    /data-map-progress-count/,
    /data-map-discovery-toggle/,
    /data-map-progress-reset/,
    /data-map-inspector/,
  ]) {
    check(html, pattern, `${relative}: map progress/relationship contract missing ${pattern}`);
  }
}
const mapScript = read("assets/js/map.js");
for (const pattern of [/ranchers-guide-map-progress-v1/, /localStorage/, /markerHasRelation/, /renderInspectorJourney/, /localTargetExists/]) {
  check(mapScript, pattern, `map script missing contract ${pattern}`);
}

for (const relative of ["search.html", "zh/search.html"]) {
  const html = read(relative);
  check(html, /data-knowledge-dossier/);
  check(html, /data-entity-filters/);
  for (const type of ["all", "animal", "crop", "material", "building", "npc", "quest", "location"]) {
    check(html, new RegExp(`data-entity-filter="${type}"`), `${relative}: missing ${type} entity filter`);
  }
}
const searchScript = read("assets/js/search.js");
for (const pattern of [/knowledge-index\.json/, /activeEntityFilter/, /entity\.type === activeEntityFilter/, /search-index\.json/]) {
  check(searchScript, pattern, `entity search missing contract ${pattern}`);
}

console.log("PASS: Phase 2 visitor tools retain bilingual contracts, local-only boundaries, relation filters and evidence-aware search.");
