const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

for (const script of ["build-locations.cjs", "check-locations-data.cjs"]) {
  const args = script === "build-locations.cjs" ? [path.join(root, "scripts", script), "--check"] : [path.join(root, "scripts", script)];
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `${script} failed:\n${result.stdout}${result.stderr}`);
}

const mapPage = read("map.html");
const chineseMapPage = read("zh/map.html");
const sharedStyles = read("assets/css/style.css");
assert.doesNotMatch(mapPage, /map-construction-badge/, "verification copy must not cover the map image");
assert.doesNotMatch(chineseMapPage, /map-construction-badge/, "Chinese verification copy must not cover the map image");
assert.doesNotMatch(sharedStyles, /\.map-construction-badge/, "removed map overlay must not leave dead styles");
assert.match(sharedStyles, /\[hidden\]\s*\{\s*display:\s*none\s*!important;/, "hidden UI must stay hidden when component display rules apply");
assert.match(sharedStyles, /\.map-pin-controls button\s*\{[\s\S]*?min-height:\s*44px;/, "map filters need touch-sized controls");
assert.match(mapPage, /<link rel="canonical" href="https:\/\/theranchersguide\.com\/map">/);
assert.match(mapPage, /data-location-search/);
assert.match(mapPage, /data-location-category/);
assert.match(mapPage, /data-location-entry/g);
assert.match(mapPage, /Leafy Market/);
assert.match(mapPage, /City Hall/);
assert.match(mapPage, /15 subway stations/);
assert.match(mapPage, /17 Overnight Parking locations/);
assert.match(mapPage, /href="\/contribute\?topic=map"/);
assert.match(mapPage, /data-current-map/);
assert.match(mapPage, /data-map-region="(?:overview|rural|city)"/);
assert.match(mapPage, /data-map-zoom="(?:in|out|reset)"/);
assert.match(mapPage, /data-map-pan="(?:left|right|up|down)"/);
assert.match(mapPage, /data-map-region="city-north"/);
assert.match(mapPage, /data-map-region="city-center"/);
assert.match(mapPage, /data-map-region="east-coast"/);
assert.match(mapPage, /data-map-inspector/);
assert.match(mapPage, /data-map-add-toggle/);
assert.match(mapPage, /data-map-pin-layer/);
assert.match(mapPage, /data-map-pin-form/);
assert.match(mapPage, /data-map-pin-close/);
assert.match(mapPage, /Games Station/);
assert.match(mapPage, /youtube\.com\/watch\?v=GrFiYqWcBK0(?:&amp;|&)t=1695s/);
assert.match(mapPage, /Player-captured August 2, 2026/i);
assert.match(mapPage, /data-map-marker-layer/);
assert.match(mapPage, /data-marker-category="(?:shopping|services|transport|landmarks)"/);
assert.match(mapPage, /data-map-pin-filter="all"/);
assert.match(mapPage, /data-map-evidence-filter="supported"/);
assert.match(mapPage, /data-map-evidence-filter="reported"/);
assert.match(mapPage, /data-map-evidence-filter="planned"/);
assert.match(mapPage, /class="active"[^>]*data-map-pin-filter="none"[^>]*aria-pressed="true"/, "guide pins should be off by default");
assert.match(mapPage, /data-map-marker-layer[^>]*hidden/, "guide pin layer should not cover the source map by default");
assert.match(mapPage, /data-marker-evidence-layer="supported"/);
assert.match(mapPage, /data-marker-evidence-layer="reported"/);
assert.match(mapPage, /data-marker-evidence-layer="planned"/);
assert.match(mapPage, /class="map-marker map-marker-[a-z]+ map-marker-area/, "approximate coordinates must render as search areas, not exact pins");
assert.match(mapPage, /map-legend/);
assert.match(mapPage, /class="map-confidence"/);
assert.doesNotMatch(mapPage, /map-legend-note/, "confidence copy must not be packed into the pin legend");
assert.match(mapPage, /Approximate area/);
assert.match(mapPage, /Lina's Tools/);
assert.match(mapPage, /Youssef's stand/);
assert.match(mapPage, /Train station/);
assert.match(mapPage, /Auction market/);
assert.match(mapPage, /Cash-In box/);
assert.match(mapPage, /Bykii terminal/);
assert.match(mapPage, /Wanglow's Garage/);
assert.match(mapPage, /dungeon entrances/i);
assert.match(mapPage, /wild islands/i);
assert.match(mapPage, /Transit posts/);
assert.match(mapPage, /reviewed August 7, 2026/);
assert.match(mapPage, /theranchers\.wiki\/wiki\/map\//);
assert.match(mapPage, /theranchers\.wiki\/wiki\/npcs\//);
assert.match(mapPage, /29 entries/);
assert.match(chineseMapPage, /data-location-search/, "Chinese map needs a core-location search");
assert.match(chineseMapPage, /data-location-category/, "Chinese map needs category filtering");
assert.equal((chineseMapPage.match(/data-location-entry/g) || []).length, 6, "Chinese map finder covers six translated core locations");

// Recognition photos: hover cards, lightbox hooks, locate-on-map button
assert.match(mapPage, /data-visual-atlas/, "English map keeps the recognition-photo section");
assert.equal((mapPage.match(/data-atlas-photo/g) || []).length, 4, "every English atlas photo opens the lightbox");
assert.equal((mapPage.match(/atlas-locate-btn/g) || []).length, 1, "only the airport photo links to a verified pin");
assert.match(mapPage, /class="location-map-button atlas-locate-btn" data-marker-focus="The Ranchers Airport"/, "locate button must target an existing guide pin");
assert.equal((chineseMapPage.match(/data-atlas-photo/g) || []).length, 4, "every Chinese map photo opens the lightbox");
assert.equal((chineseMapPage.match(/atlas-locate-btn/g) || []).length, 1, "Chinese map exposes exactly one locate-on-map button");
assert.match(chineseMapPage, /atlas-locate-btn" data-marker-focus="The Ranchers Airport">在地图上定位/, "Chinese locate button targets the airport pin");
assert.match(sharedStyles, /\.visual-atlas-card\s*\{[\s\S]*?transition:\s*transform/, "atlas cards share the site card hover transition");
assert.match(sharedStyles, /\.visual-atlas-card:hover\s*\{\s*transform:\s*translateY\(-4px\)/, "atlas cards lift on hover");
assert.match(sharedStyles, /\.visual-atlas-card:hover img\s*\{\s*transform:\s*scale\(1\.04\)/, "atlas photos zoom slightly on hover");
assert.match(sharedStyles, /\.atlas-lightbox\s*\{[\s\S]*?position:\s*fixed/, "lightbox overlay styles exist");
assert.match(sharedStyles, /@keyframes pin-flash/, "pin flash animation exists");
assert.match(sharedStyles, /\.map-marker\.pin-flash/, "pin flash class targets map markers");

for (const pattern of [
  /data-current-map/,
  /data-map-stage/,
  /data-map-region="overview"/,
  /data-map-zoom="in"/,
  /data-map-zoom="out"/,
  /data-map-zoom="reset"/,
  /data-map-pan="left"/,
  /data-map-inspector/,
  /data-map-add-toggle/,
  /data-map-pin-layer/,
  /data-map-pin-form/,
  /data-map-marker-layer/,
  /data-map-pin-filter="all"/,
  /data-map-pin-filter="none"/,
  /data-map-evidence-filter="supported"/,
  /data-map-evidence-filter="reported"/,
  /data-map-evidence-filter="planned"/,
  /class="map-confidence"/,
  /assets\/js\/map-core\.js/,
  /assets\/js\/map-viewer-core\.js/,
  /assets\/js\/map\.js/,
]) {
  assert.match(chineseMapPage, pattern, `Chinese map must match the interactive map contract: ${pattern}`);
}
const chineseMarkers = chineseMapPage.match(/class="map-marker map-marker-[a-z]+ map-marker-area/g) || [];

const approximateMarkers = mapPage.match(/class="map-marker map-marker-[a-z]+ map-marker-area/g) || [];
assert.ok(approximateMarkers.length >= 12, "map should carry at least 12 approximate area markers");
assert.equal(chineseMarkers.length, approximateMarkers.length, "English and Chinese maps must expose the same marker set");
for (const category of ["shopping", "services", "transport", "landmarks"]) {
  assert.ok(
    new RegExp(`map-marker-${category}`).test(mapPage),
    `expected at least one ${category} marker`
  );
}

const locationEntries = mapPage.match(/<article data-location-entry[\s\S]*?<\/article>/g) || [];
assert.ok(locationEntries.length >= 28, "map directory should contain at least 28 location entries");
for (const entry of locationEntries) {
  assert.ok(
    /data-location-map/.test(entry) || /pin-pending/.test(entry) || /evidence-badge/.test(entry),
    "every location entry needs a map link or an explicit status label"
  );
}

for (const image of [
  "map-current-overview.webp",
  "map-city-center.webp",
  "map-airport.webp",
  "map-city-hall.webp",
  "map-leafy-market.webp",
]) {
  assert.ok(fs.existsSync(path.join(root, "assets", "img", image)), `${image} must exist`);
  assert.match(mapPage, new RegExp(`/assets/img/${image.replace(".", "\\.")}`));
}
assert.ok(fs.statSync(path.join(root, "assets", "img", "map-current-overview.webp")).size >= 110000, "current map should retain enough source detail for readable roads and icons");

const mapScript = read("assets/js/map.js");
assert.match(mapScript, /data-map-region/);
assert.match(mapScript, /data-location-map/);
assert.match(mapScript, /data-map-zoom/);
assert.match(mapScript, /data-map-pan/);
assert.match(mapScript, /data-map-inspector/);
assert.match(mapScript, /data-map-add-toggle/);
assert.match(mapScript, /stageToImage/);
assert.match(mapScript, /map-pin/);
assert.match(mapScript, /zoomAt/);
assert.match(mapScript, /panBy/);
assert.match(mapScript, /addEventListener\("wheel"/);
assert.match(mapScript, /data-map-pin-close/);
assert.match(mapScript, /data-map-marker-layer/);
assert.match(mapScript, /data-map-pin-filter/);
assert.match(mapScript, /data-map-evidence-filter/);
assert.match(mapScript, /activeEvidenceFilter/);
assert.match(mapScript, /marker\.dataset\.markerEvidenceLayer/);
assert.match(mapScript, /applyMarkerFilter\("none"\)/, "map script should initialize the guide-pin layer as off");
assert.match(mapScript, /applyMarkerFilter\(marker\.dataset\.markerCategory\)/, "directory shortcuts should reveal the selected marker category");
assert.match(mapScript, /markerTarget/);
assert.match(mapScript, /data-atlas-photo/, "map script wires the photo lightbox");
assert.match(mapScript, /atlas-lightbox/, "map script builds the lightbox overlay");
assert.match(mapScript, /pin-flash/, "locate-on-map flashes the target pin");
assert.match(mapScript, /Escape/, "lightbox closes on Escape");
assert.match(mapScript, /URLSearchParams/, "map directory reads deep-link queries");
assert.match(mapScript, /history\.replaceState/, "map directory keeps the shareable URL in sync");
assert.match(mapScript, /findBestLocation/, "map directory highlights the best matching location");

const sitemapForMap = read("sitemap.xml");
assert.match(sitemapForMap, /<loc>https:\/\/theranchersguide\.com\/map<\/loc>[\s\S]*?<lastmod>2026-08-07<\/lastmod>/);

const viewerCore = require("../assets/js/map-viewer-core.js");
assert.deepEqual(viewerCore.getView("rural"), { scale: 1.6, x: 24, y: 2 });
assert.deepEqual(viewerCore.getView("city"), { scale: 1.55, x: -25, y: 1 });
assert.equal(viewerCore.clampZoom(9), 3);
assert.equal(viewerCore.clampZoom(0.2), 1);
assert.deepEqual(viewerCore.pan({ scale: 2, x: 0, y: 0 }, "left"), { scale: 2, x: 3.5, y: 0 });
assert.deepEqual(viewerCore.stageToImage({ sx: 0.5, sy: 0.5 }, { scale: 1, x: 0, y: 0 }), { x: 50, y: 50 });
assert.deepEqual(viewerCore.stageToImage({ sx: 0.5, sy: 0.5 }, { scale: 2, x: 0, y: 0 }), { x: 50, y: 50 });
assert.deepEqual(viewerCore.stageToImage({ sx: 0, sy: 0 }, { scale: 2, x: 0, y: 0 }), { x: 25, y: 25 });
assert.deepEqual(viewerCore.stageToImage({ sx: 0.5, sy: 0.5 }, { scale: 1.6, x: 24, y: 2 }), { x: 35, y: 48.75 });
assert.deepEqual(viewerCore.zoomAt({ scale: 1, x: 0, y: 0 }, 2, { sx: 0.25, sy: 0.25 }), { scale: 2, x: 25, y: 25 });
assert.deepEqual(viewerCore.zoomAt({ scale: 2, x: 25, y: 25 }, 0.5, { sx: 0.25, sy: 0.25 }), { scale: 1, x: 0, y: 0 });
assert.deepEqual(viewerCore.panBy({ scale: 1, x: 0, y: 0 }, 0.1, 0.05), { scale: 1, x: 10, y: 5 });
assert.deepEqual(viewerCore.panBy({ scale: 2, x: 0, y: 0 }, -0.1, 0), { scale: 2, x: -10, y: 0 });

const mapCore = require("../assets/js/map-core.js");
const locations = [
  { id: "leafy-market", title: "Leafy Market", category: "shopping", keywords: "seeds farming supplies" },
  { id: "city-hall", title: "City Hall 市政厅", category: "services", keywords: "land blueprints mayor zirconite 锆矿 合同" },
  { title: "Subway", category: "transport", keywords: "fast travel station" },
];

assert.deepEqual(mapCore.filterLocations(locations, "seed", "all").map((item) => item.title), ["Leafy Market"]);
assert.deepEqual(mapCore.filterLocations(locations, "", "transport").map((item) => item.title), ["Subway"]);
assert.deepEqual(mapCore.filterLocations(locations, "blueprint", "services").map((item) => item.id), ["city-hall"]);
assert.deepEqual(mapCore.filterLocations(locations, "casino", "all"), []);
assert.equal(mapCore.findBestLocation(locations, "zirconite").id, "city-hall");
assert.equal(mapCore.findBestLocation(locations, "市政厅").id, "city-hall");
assert.equal(mapCore.findBestLocation(locations, "leafy markte").id, "leafy-market");
assert.equal(mapCore.buildQueryString("city hall", "services"), "?q=city%20hall&category=services");
assert.equal(mapCore.buildQueryString("", "all"), "");

const search = read("assets/js/search.js");
assert.match(search, /"\/map"/);
assert.match(search, /ranchers-search-index-v22/);
assert.match(search, /ranchers-search-index-zh-v8/);
assert.match(search, /node\.querySelector\("h2, h3"\)/);

const sitemap = read("sitemap.xml");
assert.match(sitemap, /https:\/\/theranchersguide\.com\/map/);

const homepage = read("index.html");
assert.match(homepage, /href="\/map"/);
assert.match(homepage, /href="\/contribute\?topic=map"/);

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) return htmlFiles(target);
    return entry.isFile() && entry.name.endsWith(".html") ? [target] : [];
  });
}

for (const file of htmlFiles(root)) {
  const relative = path.relative(root, file);
  const expectedMapRoute = relative.startsWith(`zh${path.sep}`) ? /href="\/zh\/map"/ : /href="\/map"/;
  assert.match(fs.readFileSync(file, "utf8"), expectedMapRoute, `${relative} needs a locale-matched Map link`);
}

console.log("PASS: searchable map directory, contribution path, site search and discovery links are complete.");
