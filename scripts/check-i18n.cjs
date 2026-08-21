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
  ["database/materials.html", "zh/database/materials.html", "/database/materials", "/zh/database/materials"],
  ["database/npcs.html", "zh/database/npcs.html", "/database/npcs", "/zh/database/npcs"],
  ["database/quests.html", "zh/database/quests.html", "/database/quests", "/zh/database/quests"],
  ["map.html", "zh/map.html", "/map", "/zh/map"],
  ["problems.html", "zh/problems.html", "/problems", "/zh/problems"],
  ["community.html", "zh/community.html", "/community", "/zh/community"],
  ["search.html", "zh/search.html", "/search", "/zh/search"],
  ["guides/animal-guide.html", "zh/guides/animal-guide.html", "/guides/animal-guide", "/zh/guides/animal-guide"],
  ["guides/gigi-large-egg-quest.html", "zh/guides/gigi-large-egg-quest.html", "/guides/gigi-large-egg-quest", "/zh/guides/gigi-large-egg-quest"],
  ["guides/roof-quest-stuck.html", "zh/guides/roof-quest-stuck.html", "/guides/roof-quest-stuck", "/zh/guides/roof-quest-stuck"],
  ["guides/money-making.html", "zh/guides/money-making.html", "/guides/money-making", "/zh/guides/money-making"],
  ["guides/police-wanted-levels.html", "zh/guides/police-wanted-levels.html", "/guides/police-wanted-levels", "/zh/guides/police-wanted-levels"],
  ["problems/vehicle-recovery.html", "zh/problems/vehicle-recovery.html", "/problems/vehicle-recovery", "/zh/problems/vehicle-recovery"],
  ["guides/farming-fields.html", "zh/guides/farming-fields.html", "/guides/farming-fields", "/zh/guides/farming-fields"],
  ["guides/electricity-power.html", "zh/guides/electricity-power.html", "/guides/electricity-power", "/zh/guides/electricity-power"],
  ["guides/resources-and-materials.html", "zh/guides/resources-and-materials.html", "/guides/resources-and-materials", "/zh/guides/resources-and-materials"],
  ["updates.html", "zh/updates.html", "/updates", "/zh/updates"],
  ["updates/launch-hotfix-0-8-10-455.html", "zh/updates/launch-hotfix-0-8-10-455.html", "/updates/launch-hotfix-0-8-10-455", "/zh/updates/launch-hotfix-0-8-10-455"],
  ["updates/transport-update.html", "zh/updates/transport-update.html", "/updates/transport-update", "/zh/updates/transport-update"],
  ["tools/chicken-troubleshooter.html", "zh/tools/chicken-troubleshooter.html", "/tools/chicken-troubleshooter", "/zh/tools/chicken-troubleshooter"],
];
const utilityPairs = [
  ["tools/player-report.html", "zh/tools/player-report.html", "/tools/player-report", "/zh/tools/player-report"],
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
  assert.match(english, new RegExp(`<link rel="canonical" href="${escaped(englishUrl)}">`));
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
for (const [, , englishRoute, chineseRoute] of pairs.filter((pair) => pair[2] !== "/search")) {
  const englishUrl = `https://theranchersguide.com${englishRoute}`;
  const chineseUrl = `https://theranchersguide.com${chineseRoute}`;
  const englishNode = sitemap.match(new RegExp(`<url>\\s*<loc>${escaped(englishUrl)}</loc>([\\s\\S]*?)</url>`));
  const chineseNode = sitemap.match(new RegExp(`<url>\\s*<loc>${escaped(chineseUrl)}</loc>([\\s\\S]*?)</url>`));
  assert.ok(englishNode, `sitemap must include English URL ${englishRoute}`);
  assert.ok(chineseNode, `sitemap must include Chinese URL ${chineseRoute}`);
  for (const node of [englishNode[1], chineseNode[1]]) {
    assert.match(node, new RegExp(`hreflang="en" href="${escaped(englishUrl)}"`));
    assert.match(node, new RegExp(`hreflang="zh-CN" href="${escaped(chineseUrl)}"`));
    assert.match(node, new RegExp(`hreflang="x-default" href="${escaped(englishUrl)}"`));
  }
}

for (const [englishFile, chineseFile, englishRoute, chineseRoute] of utilityPairs) {
  const english = read(englishFile);
  const chinese = read(chineseFile);
  assert.match(english, /<html lang="en">/);
  assert.match(chinese, /<html lang="zh-CN">/);
  assert.match(english, new RegExp(`canonical" href="https://theranchersguide.com${escaped(englishRoute)}"`));
  assert.match(chinese, new RegExp(`canonical" href="https://theranchersguide.com${escaped(chineseRoute)}"`));
  for (const html of [english, chinese]) {
    assert.match(html, new RegExp(`hreflang="en" href="https://theranchersguide.com${escaped(englishRoute)}"`));
    assert.match(html, new RegExp(`hreflang="zh-CN" href="https://theranchersguide.com${escaped(chineseRoute)}"`));
    assert.match(html, /noindex,follow/);
  }
}

const chineseIndex = JSON.parse(read("zh/search-index.json"));
assert.ok(chineseIndex.length >= pairs.length - 1, "Chinese search index must cover every indexable Chinese page");
assert.ok(chineseIndex.every((entry) => entry.url.startsWith("/zh/")), "Chinese index must not mix English URLs");
for (const [, , , chineseRoute] of pairs.filter((pair) => pair[2] !== "/search")) {
  assert.ok(chineseIndex.some((entry) => entry.url === chineseRoute), `Chinese search index must include ${chineseRoute}`);
}

const sharedNavigation = read("assets/js/main.js");
assert.match(sharedNavigation, /nav-language-item/, "shared navigation must expose a paired-language switch");
assert.match(sharedNavigation, /hreflang/, "language switch must follow the page's declared alternate locale");

const sharedStyles = read("assets/css/style.css");
assert.match(sharedStyles, /\.nav-language-link/, "shared styles must include the language switch treatment");

const chineseKnowledgeBase = read("zh/database.html");
for (const route of [
  "/zh/guides/animal-guide",
  "/zh/guides/gigi-large-egg-quest",
  "/zh/guides/money-making",
  "/zh/guides/farming-fields",
]) {
  assert.match(chineseKnowledgeBase, new RegExp(`href="${escaped(route)}`), `Chinese knowledge base must expose ${route}`);
}

const chineseProblems = read("zh/problems.html");
for (const route of [
  "/zh/guides/roof-quest-stuck",
  "/zh/guides/police-wanted-levels",
  "/zh/problems/vehicle-recovery",
]) {
  assert.match(chineseProblems, new RegExp(`href="${escaped(route)}`), `Chinese problem center must expose ${route}`);
}

const chineseHome = read("zh/index.html");
for (const route of [
  "/zh/guides/animal-guide",
  "/zh/guides/gigi-large-egg-quest",
  "/zh/guides/roof-quest-stuck",
  "/zh/guides/money-making",
  "/zh/guides/police-wanted-levels",
  "/zh/problems/vehicle-recovery",
]) {
  assert.match(chineseHome, new RegExp(`href="${escaped(route)}`), `Chinese home must expose ${route}`);
}

console.log(`PASS: ${pairs.length} English/Chinese page pairs expose reciprocal language metadata and isolated search.`);
