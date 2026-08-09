const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pairs = [
  ["index.html", "zh/index.html", "/", "/zh/"],
  ["database.html", "zh/database.html", "/database", "/zh/database"],
  ["guides/beginners-guide.html", "zh/guides/beginners-guide.html", "/guides/beginners-guide", "/zh/guides/beginners-guide"],
  ["database/animals.html", "zh/database/animals.html", "/database/animals", "/zh/database/animals"],
  ["database/crops.html", "zh/database/crops.html", "/database/crops", "/zh/database/crops"],
  ["map.html", "zh/map.html", "/map", "/zh/map"],
  ["problems.html", "zh/problems.html", "/problems", "/zh/problems"],
  ["search.html", "zh/search.html", "/search", "/zh/search"],
];

function read(relative) {
  const file = path.join(root, relative);
  assert.ok(fs.existsSync(file), `${relative} must exist`);
  return fs.readFileSync(file, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

for (const [englishFile, chineseFile, englishRoute, chineseRoute] of pairs) {
  const english = read(englishFile);
  const chinese = read(chineseFile);
  const englishUrl = `https://theranchersguide.com${englishRoute}`;
  const chineseUrl = `https://theranchersguide.com${chineseRoute}`;

  assert.match(english, /<html lang="en">/, `${englishFile} must declare English`);
  assert.match(chinese, /<html lang="zh-CN">/, `${chineseFile} must declare Simplified Chinese`);
  assert.match(chinese, new RegExp(`<link rel="canonical" href="${escaped(chineseUrl)}">`));

  for (const html of [english, chinese]) {
    assert.match(html, new RegExp(`hreflang="en" href="${escaped(englishUrl)}"`));
    assert.match(html, new RegExp(`hreflang="zh-CN" href="${escaped(chineseUrl)}"`));
    assert.match(html, new RegExp(`hreflang="x-default" href="${escaped(englishUrl)}"`));
  }

  assert.match(chinese, /href="\/zh\/search"/, `${chineseFile} must link to Chinese search`);
}

const sitemap = read("sitemap.xml");
assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
for (const [, , , chineseRoute] of pairs.filter((pair) => pair[2] !== "/search")) {
  assert.match(sitemap, new RegExp(`<loc>https://theranchersguide.com${escaped(chineseRoute)}</loc>`));
}

const chineseIndex = JSON.parse(read("zh/search-index.json"));
assert.ok(chineseIndex.length >= pairs.length - 1, "Chinese search index must cover every indexable Chinese page");
assert.ok(chineseIndex.every((entry) => entry.url.startsWith("/zh/")), "Chinese index must not mix English URLs");

const sharedNavigation = read("assets/js/main.js");
assert.doesNotMatch(sharedNavigation, /language-switch/, "language switch UI is intentionally hidden until localization expands");

const sharedStyles = read("assets/css/style.css");
assert.doesNotMatch(sharedStyles, /\.language-switch/, "hidden language switch must not leave dead component styles");

console.log(`PASS: ${pairs.length} English/Chinese page pairs expose reciprocal language metadata and isolated search.`);
