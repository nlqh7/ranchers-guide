const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const publicOnly = process.argv.includes("--public-only");
const catalogPath = path.join(root, 'data/game-catalog.json');
const breadCandidate = !publicOnly && fs.existsSync(catalogPath) && ['fs25-bread-v1', 'fs25-production-v2', 'fs25-production-v3'].includes(JSON.parse(fs.readFileSync(catalogPath, 'utf8')).releaseProfile);
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const fail = (message) => { throw new Error(`FAIL: ${message}`); };
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const offline = read("problems/offline-mode-loading.html");
assert(offline.includes("Reviewed September 19, 2026"), "offline evidence date changed unexpectedly");
assert(offline.includes("Last reviewed: September 19, 2026."), "offline author review date is not aligned");
assert(!offline.includes("Last reviewed: August 2026"), "offline page still contains the stale August author date");

for (const file of ["index.html", "zh/index.html"]) {
  const html = read(file);
  if (breadCandidate) assert(html.includes(file.startsWith('zh/') ? 'href="/zh/games/fs25/"' : 'href="/games/fs25/"'), `${file} lacks the explicitly declared FS25 entry`);
  else assert(!/fs25|farming simulator/i.test(html), `${file} exposes the unpublished FS25 pilot`);
  assert(!html.includes("game-tools.css"), `${file} loads pilot-only game tool CSS`);
}

const searchJs = read("assets/js/search.js");
assert((searchJs.includes('"/games/fs25/"') && searchJs.includes('"/zh/games/fs25/"')) === breadCandidate, "FS25 search paths must match the explicit release scope");
require('./search-cache-contract.cjs')(searchJs);
for (const file of ["search-index.json", "zh/search-index.json"]) {
  const entries = JSON.parse(read(file));
  assert(entries.some((entry) => entry.url.includes("games/fs25")) === breadCandidate, `${file} FS25 URLs must match its release scope`);
}

const fs25PreviewFiles = [
  "games/fs25/index.html",
  "games/fs25/tools/production-planner/index.html",
  "zh/games/fs25/index.html",
  "zh/games/fs25/tools/production-planner/index.html",
];
const presentFs25Files = publicOnly ? [] : fs25PreviewFiles.filter((file) => fs.existsSync(path.join(root, file)));
if (presentFs25Files.length > 0 && presentFs25Files.length !== fs25PreviewFiles.length) {
  fail(`FS25 preview scope is incomplete (${presentFs25Files.length}/${fs25PreviewFiles.length} files present)`);
}
if (presentFs25Files.length === fs25PreviewFiles.length) {
  for (const file of fs25PreviewFiles) {
    assert(read(file).includes(`<meta name="robots" content="${breadCandidate ? 'index' : 'noindex'},follow">`), `${file} indexability is inconsistent with its explicit profile`);
  }
  console.log(`PASS: FS25 files match the ${breadCandidate ? 'explicit production candidate' : 'private noindex'} scope.`);
} else {
  console.log("PASS: no local FS25 preview files present; public Ranchers scope remains valid without them.");
}
assert(read("sitemap.xml").includes("/games/fs25/") === breadCandidate, "FS25 sitemap membership must match the declared release scope");

console.log("PASS: sprint dates and explicitly declared publication scope are consistent; this is not AdSense approval evidence.");
