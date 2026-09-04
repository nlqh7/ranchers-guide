const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const adPattern = /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const noAdSurfaces = [
  "community.html",
  "creator-notes.html",
  "database.html",
  "map.html",
  "methodology.html",
  "problems.html",
  "tools/chicken-troubleshooter.html",
  "zh/community.html",
  "zh/creator-notes.html",
  "zh/database.html",
  "zh/map.html",
  "zh/methodology.html",
  "zh/problems.html",
  "zh/tools/chicken-troubleshooter.html",
];

for (const relativePath of noAdSurfaces) {
  assert.doesNotMatch(read(relativePath), adPattern, `${relativePath}: navigation, methodology and interactive surfaces must not request ads`);
}

for (const relativePath of ["index.html", "zh/index.html", "guides/beginners-guide.html", "database/crops.html"]) {
  assert.match(read(relativePath), adPattern, `${relativePath}: substantial publisher-content remains eligible for ads`);
}

const taskRoutes = {
  "index.html": [
    "/guides/beginners-guide",
    "/guides/money-making",
    "/guides/building-construction",
    "/map",
    "/guides/animal-guide",
    "/problems",
  ],
  "zh/index.html": [
    "/zh/guides/beginners-guide",
    "/zh/guides/money-making",
    "/zh/guides/building-construction",
    "/zh/map",
    "/zh/guides/animal-guide",
    "/zh/problems",
  ],
};

for (const [relativePath, routes] of Object.entries(taskRoutes)) {
  const html = read(relativePath);
  const section = html.match(/<section[^>]+id="player-routes"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section, `${relativePath}: homepage needs a player-first route section`);
  assert.match(section, /<h2[\s>]/, `${relativePath}: the primary route section needs a visible task heading`);
  for (const route of routes) assert.ok(section.includes(`href="${route}"`), `${relativePath}: missing primary player route ${route}`);
  assert.doesNotMatch(section, /unverified|unknown|evidence tracker|still need testing|待验证|未知|证据状态|仍需测试/i, `${relativePath}: primary routes must describe outcomes, not editorial process`);
}

assert.doesNotMatch(read("index.html"), /hero-eyebrow|hero-promise/, "index.html: do not stack generic promotional lines above the task routes");
assert.match(read("index.html"), /<h2>What do you need to do\?<\/h2>/, "index.html: first-time visitors need a direct task heading");
assert.match(read("zh/index.html"), /<h2 id="zh-start-title">你现在想找什么？<\/h2>/, "zh/index.html: first-time visitors need a direct task heading");

console.log("PASS: ads stay on substantial content and both homepages lead with six player tasks.");
