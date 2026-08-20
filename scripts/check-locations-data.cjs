const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "locations.json");

assert.ok(fs.existsSync(dataPath), "data/locations.json must exist");

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
assert.equal(data.meta.schemaVersion, 1);
assert.match(data.meta.build, /^0\.8\.10/);
assert.equal(data.meta.markerOrder.length, 13);
assert.ok(data.sources && typeof data.sources === "object");
assert.equal(data.locations.length, 29, "the current directory must keep all 29 locations");

const ids = new Set();
const markerIds = [];
for (const location of data.locations) {
  assert.match(location.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(!ids.has(location.id), `duplicate location id: ${location.id}`);
  ids.add(location.id);
  assert.ok(["shopping", "services", "transport", "landmarks"].includes(location.category));
  assert.ok(Array.isArray(location.sourceIds));
  for (const sourceId of location.sourceIds) {
    assert.ok(data.sources[sourceId], `${location.id} references missing source ${sourceId}`);
  }
  for (const locale of ["en", "zh"]) {
    assert.ok(location.locale[locale].title, `${location.id} needs a ${locale} title`);
    assert.ok(location.locale[locale].keywords, `${location.id} needs ${locale} search keywords`);
  }
  assert.ok(location.locale.en.entryHtml, `${location.id} needs English directory content`);
  if (location.marker) {
    markerIds.push(location.id);
    assert.ok(Number.isFinite(location.marker.x) && location.marker.x >= 0 && location.marker.x <= 100);
    assert.ok(Number.isFinite(location.marker.y) && location.marker.y >= 0 && location.marker.y <= 100);
    assert.ok(["approximate", "region-only", "unverified", "planned"].includes(location.marker.precision));
    assert.ok(["supported", "reported", "planned"].includes(location.marker.evidenceLayer), `${location.id} needs a map evidence layer`);
    assert.ok(location.marker.locale.en.label && location.marker.locale.zh.label);
    assert.ok(location.marker.locale.en.description && location.marker.locale.zh.description);
    assert.ok(location.marker.locale.en.target && location.marker.locale.zh.target);
  }
}

assert.equal(markerIds.length, 13, "the current map must keep all 13 visible markers");
assert.equal(data.locations.filter((location) => location.marker?.evidenceLayer === "supported").length, 3, "only three areas currently have official/video-backed placement context");
assert.deepEqual(new Set(data.meta.markerOrder), new Set(markerIds), "markerOrder must list every marker once");

for (const relativePath of ["map.html", "zh/map.html"]) {
  const html = fs.readFileSync(path.join(root, relativePath), "utf8");
  assert.match(html, /MAP_MARKERS:START[\s\S]*MAP_MARKERS:END/);
  assert.equal((html.match(/class="map-marker map-marker-/g) || []).length, markerIds.length);
}

const englishMap = fs.readFileSync(path.join(root, "map.html"), "utf8");
assert.match(englishMap, /LOCATION_DIRECTORY:START[\s\S]*LOCATION_DIRECTORY:END/);
assert.equal((englishMap.match(/<article data-location-entry/g) || []).length, data.locations.length);

console.log(`PASS: ${data.locations.length} locations and ${markerIds.length} markers share one bilingual data source.`);
