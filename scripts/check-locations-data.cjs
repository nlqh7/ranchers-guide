const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "locations.json");

assert.ok(fs.existsSync(dataPath), "data/locations.json must exist");

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
assert.equal(data.meta.schemaVersion, 1);
assert.match(data.meta.build, /^0\.8\.10/);
assert.equal(data.meta.coordinateSystem, "percentage-of-full-4000x4000-map", "map markers must share the complete native-map coordinate system");
assert.equal(data.meta.markerOrder.length, 16, "every current-build exact POI group belongs in the full-map marker order");
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
    assert.ok(["exact", "approximate", "region-only", "unverified", "planned"].includes(location.marker.precision));
    assert.ok(["supported", "reported", "planned"].includes(location.marker.evidenceLayer), `${location.id} needs a map evidence layer`);
    assert.ok(location.marker.locale.en.label && location.marker.locale.zh.label);
    assert.ok(location.marker.locale.en.description && location.marker.locale.zh.description);
    assert.ok(location.marker.locale.en.target && location.marker.locale.zh.target);
    assert.equal(location.marker.precision, "exact", `${location.id} must not reuse a cropped-map estimate on the full map`);
    for (const point of location.marker.points || []) {
      assert.ok(Number.isFinite(point.x) && point.x >= 0 && point.x <= 100, `${location.id}/${point.id} needs a valid x anchor`);
      assert.ok(Number.isFinite(point.y) && point.y >= 0 && point.y <= 100, `${location.id}/${point.id} needs a valid y anchor`);
    }
  }
}

const byId = new Map(data.locations.map((location) => [location.id, location]));
assert.equal(byId.get("city-hall").marker.precision, "exact", "City Hall must use its current-build native POI anchor");
assert.deepEqual(
  { x: byId.get("city-hall").marker.x, y: byId.get("city-hall").marker.y },
  { x: 71.3265, y: 79.67375 },
  "City Hall must map world coordinates to the full 4000px texture"
);
assert.equal(byId.get("airport").marker.precision, "exact", "Airport must use its current-build native POI anchor");
assert.deepEqual(
  { x: byId.get("airport").marker.x, y: byId.get("airport").marker.y },
  { x: 84.24, y: 48.71625 },
  "Airport must map world coordinates to the full 4000px texture"
);
assert.equal(byId.get("leafy-market").marker.precision, "exact", "Leafy Market branches must use native POI anchors");
assert.equal(byId.get("leafy-market").marker.points.length, 7, "Leafy Market must expose all seven current-build branches");
assert.deepEqual(
  byId.get("leafy-market").marker.points.map((point) => point.id),
  ["bb", "da-01", "ea-01", "ea-02", "fa-01", "ma-01", "na-01"],
  "Leafy Market branch identities must stay stable"
);
assert.equal(byId.get("subway").marker.precision, "exact", "Subway entrances must use current-build POI anchors");
assert.equal(byId.get("subway").marker.evidenceLayer, "reported", "the 16-vs-15 count conflict must keep Subway outside the supported default layer");
assert.equal(byId.get("subway").marker.points.length, 16, "the current build must expose all 16 independently cross-checked entrance anchors");
assert.deepEqual(
  byId.get("subway").marker.points.map((point) => point.id),
  ["country-center", "country-cow", "country-vito", ...Array.from({ length: 13 }, (_, index) => `city-${String(index + 1).padStart(2, "0")}`)],
  "Subway entrance identities must stay stable"
);
assert.ok(byId.get("subway").sourceIds.includes("official-steam-material"), "Subway must retain the official 15-station announcement boundary");
assert.ok(byId.get("subway").sourceIds.includes("local-build-24847725"), "Subway coordinates must cite the named local build collection");
assert.equal(byId.get("overnight-parking").marker.precision, "exact", "current-build SAFE_PARKING trackers must use exact native-map anchors");
assert.equal(byId.get("overnight-parking").marker.evidenceLayer, "reported", "the 13-vs-17 count conflict must keep Overnight Parking outside the supported default layer");
assert.equal(byId.get("overnight-parking").marker.points.length, 13, "the current build must expose all 13 enumerated SAFE_PARKING trackers without inventing the four missing official locations");
assert.deepEqual(
  byId.get("overnight-parking").marker.points.map((point) => point.id),
  ["tracker", ...Array.from({ length: 12 }, (_, index) => `tracker-${String(index + 2).padStart(2, "0")}`)],
  "Overnight Parking tracker identities must preserve the real missing (1) suffix"
);
assert.ok(byId.get("overnight-parking").sourceIds.includes("official-steam-material"), "Overnight Parking must retain the official 17-location announcement boundary");
assert.ok(byId.get("overnight-parking").sourceIds.includes("local-build-24847725"), "Overnight Parking coordinates must cite the named local build collection");

assert.deepEqual(
  new Set(markerIds),
  new Set(["city-hall", "leafy-market", "subway", "overnight-parking", "auto-hue", "vehicle-dealers", "airport", "sunvale-port", "museum", "ferris-wheel", "police-station", "sunset-casino", "novagen", "vitalis", "fuel-stations", "cash-in-box"]),
  "the full map must expose only current-build exact POI groups"
);
assert.equal(data.locations.filter((location) => location.marker?.evidenceLayer === "supported").length, 3, "only three areas currently have official/video-backed placement context");
assert.deepEqual(new Set(data.meta.markerOrder), new Set(markerIds), "markerOrder must list every marker once");

for (const locationId of ["linas-tools", "youssefs-stand", "train-station", "bykii-terminal", "wanglows-garage", "mines-dungeons", "coastal-islands"]) {
  assert.equal(byId.get(locationId).marker, null, `${locationId} must remain searchable without displaying an unverified full-map pin`);
}

const markerInstanceCount = data.locations.reduce((count, location) => {
  if (!location.marker) return count;
  return count + Math.max(1, location.marker.points?.length || 0);
}, 0);
assert.equal(markerInstanceCount, 58, "the native layer must render all 58 exact marker instances across 16 POI groups");

for (const relativePath of ["map.html", "zh/map.html"]) {
  const html = fs.readFileSync(path.join(root, relativePath), "utf8");
  assert.match(html, /MAP_MARKERS:START[\s\S]*MAP_MARKERS:END/);
  assert.equal((html.match(/class="map-marker map-marker-/g) || []).length, markerInstanceCount);
  const directory = html.match(/LOCATION_DIRECTORY:START[\s\S]*LOCATION_DIRECTORY:END/);
  assert.ok(directory, `${relativePath} must keep its generated directory`);
  assert.equal((directory[0].match(/Site-owner build collection|站长本地构建采集/g) || []).length, markerIds.length, `${relativePath} must identify the provenance of every exact POI group`);
}

const englishMap = fs.readFileSync(path.join(root, "map.html"), "utf8");
assert.match(englishMap, /LOCATION_DIRECTORY:START[\s\S]*LOCATION_DIRECTORY:END/);
assert.equal((englishMap.match(/<article data-location-entry/g) || []).length, data.locations.length);
for (const locationId of ["linas-tools", "youssefs-stand", "train-station", "bykii-terminal", "wanglows-garage", "mines-dungeons", "coastal-islands"]) {
  const article = englishMap.match(new RegExp(`<article data-location-entry[^>]*id="${locationId}"[\\s\\S]*?<\\/article>`));
  assert.ok(article, `${locationId} must stay in the English directory`);
  assert.doesNotMatch(article[0], /data-marker-focus=/, `${locationId} must not offer a map-focus action without a verified coordinate`);
  assert.match(article[0], /No verified coordinate/, `${locationId} must explain why it has no map pin`);
}

console.log(`PASS: ${data.locations.length} locations and ${markerInstanceCount} exact marker instances share one bilingual data source.`);
