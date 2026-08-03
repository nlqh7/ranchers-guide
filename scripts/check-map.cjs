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
assert.match(search, /ranchers-search-index-v6/);
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
