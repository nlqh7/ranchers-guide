const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const publicOnly = process.argv.includes("--public-only");
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
  assert(!/fs25|farming simulator/i.test(html), `${file} exposes the unpublished FS25 pilot`);
  assert(!html.includes("game-tools.css"), `${file} loads pilot-only game tool CSS`);
}

const searchJs = read("assets/js/search.js");
assert(!searchJs.includes('"/games/fs25/"') && !searchJs.includes('"/zh/games/fs25/"'), "FS25 route remains in public search page paths");
assert(searchJs.includes("ranchers-search-index-v45") && searchJs.includes("ranchers-search-index-zh-v31"), "search cache version was not advanced");
for (const file of ["search-index.json", "zh/search-index.json"]) {
  const entries = JSON.parse(read(file));
  assert(!entries.some((entry) => entry.url.includes("games/fs25")), `${file} contains unpublished FS25 URLs`);
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
    assert(read(file).includes('<meta name="robots" content="noindex,follow">'), `${file} is not noindex`);
  }
  console.log("PASS: local FS25 preview files are present and noindex.");
} else {
  console.log("PASS: no local FS25 preview files present; public Ranchers scope remains valid without them.");
}
assert(!read("sitemap.xml").includes("/games/fs25/"), "FS25 pilot route entered sitemap");

console.log("PASS: AdSense sprint date alignment and unpublished FS25 public isolation are consistent.");
