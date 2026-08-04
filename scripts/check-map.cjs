const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const mapPage = read("map.html");
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

const locationEntries = mapPage.match(/<article data-location-entry[\s\S]*?<\/article>/g) || [];
assert.ok(locationEntries.length >= 18, "map directory should contain at least 18 location entries");
for (const entry of locationEntries) {
  assert.ok(
    /data-location-map/.test(entry) || /pin-pending/.test(entry) || /evidence-badge/.test(entry),
    "every location entry needs a map link or an explicit status label"
  );
}

for (const image of [
  "map-current-overview.jpg",
  "map-city-center.jpg",
  "map-airport.jpg",
  "map-city-hall.jpg",
  "map-leafy-market.jpg",
]) {
  assert.ok(fs.existsSync(path.join(root, "assets", "img", image)), `${image} must exist`);
  assert.match(mapPage, new RegExp(`/assets/img/${image.replace(".", "\\.")}`));
}

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
  { title: "Leafy Market", category: "shopping", keywords: "seeds farming supplies" },
  { title: "City Hall", category: "services", keywords: "land blueprints mayor" },
  { title: "Subway", category: "transport", keywords: "fast travel station" },
];

assert.deepEqual(mapCore.filterLocations(locations, "seed", "all").map((item) => item.title), ["Leafy Market"]);
assert.deepEqual(mapCore.filterLocations(locations, "", "transport").map((item) => item.title), ["Subway"]);
assert.deepEqual(mapCore.filterLocations(locations, "blueprint", "services").map((item) => item.title), ["City Hall"]);
assert.deepEqual(mapCore.filterLocations(locations, "casino", "all"), []);

const search = read("assets/js/search.js");
assert.match(search, /"\/map"/);
assert.match(search, /ranchers-search-index-v8/);
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
  assert.match(fs.readFileSync(file, "utf8"), /href="\/map"/, `${path.relative(root, file)} needs a Map link`);
}

console.log("PASS: searchable map directory, contribution path, site search and discovery links are complete.");
