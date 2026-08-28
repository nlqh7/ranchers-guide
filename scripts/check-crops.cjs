/* Basic guards for the crops JSON data layer: schema sanity, per-crop anchors
 * in the generated page, source-registry integrity, and a drift check between
 * data/crops.json and database/crops.html. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "crops.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "database", "crops.html"), "utf8");
const zhHtml = fs.readFileSync(path.join(root, "zh", "database", "crops.html"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "style.css"), "utf8");
const searchIndex = JSON.parse(fs.readFileSync(path.join(root, "search-index.json"), "utf8"));
const zhSearchIndex = JSON.parse(fs.readFileSync(path.join(root, "zh", "search-index.json"), "utf8"));
const farmingGuide = fs.readFileSync(path.join(root, "guides", "farming-fields.html"), "utf8");
const research = fs.readFileSync(path.join(root, "research.html"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

const LEVELS = new Set(data.meta.evidenceLevels);
const VALIDITY = new Set(data.meta.validityValues);
const SOURCE_KINDS = new Set(["official-news", "steam-thread", "local-video", "wiki", "local-archive", "community-scan", "store-page", "first-hand-build-resource"]);
const SOURCE_IDS = new Set(Object.keys(data.sources));
assert.ok(LEVELS.size === 6 && VALIDITY.size === 4, "meta must enumerate evidence levels and validity values");

/* Current-build crop-resource tracer bullet: the public database must expose the
 * 11 seasonal profiles that survive the build-data availability gate, while
 * keeping the explicitly NotINCLUDED rows out of the active roster. */
const currentBuildCropIds = [
  "red-lettuce", "garlic", "strawberry",
  "aubergine", "corn", "green-lettuce",
  "pumpkin", "carrot", "onion", "marrow", "leek",
];
assert.ok(LEVELS.has("build-observed"), "crop evidence vocabulary must distinguish current-build resource data from gameplay observation");
assert.equal(data.buildRoster.entries.length, currentBuildCropIds.length, "public crop database must expose all 11 current-build seasonal profiles");
assert.deepEqual(data.buildRoster.entries.map((crop) => crop.id), currentBuildCropIds, "current-build crop profiles must keep seasonal source order");
assert.ok(data.sources["local-build-24847725"], "current-build crop facts need a named local build source");
assert.equal(data.sources["local-build-24847725"].kind, "first-hand-build-resource");
assert.equal(data.buildRoster.entries.filter((crop) => crop.townSeedVendor === "listed").length, 9, "Town SeedVendor must reference exactly nine active seasonal profiles");
assert.equal(data.buildRoster.entries.filter((crop) => crop.townSeedVendor === "not-referenced").length, 2, "Marrow and Leek must remain profiles without a Town SeedVendor reference");
for (const crop of data.buildRoster.entries) {
  assert.ok(crop.name && crop.zhName && crop.season && crop.zhSeason, `${crop.id}: bilingual crop and season labels required`);
  assert.ok(Number.isInteger(crop.daysToFirstHarvest) && crop.daysToFirstHarvest > 0, `${crop.id}: positive integer daysToFirstHarvest required`);
  assert.ok(Number.isInteger(crop.daysWithoutWater) && crop.daysWithoutWater > 0, `${crop.id}: positive integer dry tolerance required`);
  assert.ok(Number.isInteger(crop.regrowEveryDays) && crop.regrowEveryDays >= 0, `${crop.id}: regrowEveryDays must be a non-negative integer`);
  assert.equal(crop.evidenceLevel, "build-observed", `${crop.id}: build resource facts need build-observed evidence`);
  assert.equal(crop.validity, "current", `${crop.id}: current-build roster validity must be current`);
  assert.equal(crop.build, data.buildRoster.build, `${crop.id}: roster and row build must agree`);
  assert.deepEqual(crop.sourceIds, data.buildRoster.sourceIds, `${crop.id}: row must point to the audited build resource`);
  assert.match(html, new RegExp(`<tr id="build-${crop.id}">`), `${crop.id}: English legacy row anchor must remain without a duplicate search entry`);
  assert.match(zhHtml, new RegExp(`<tr id="build-${crop.id}">`), `${crop.id}: Chinese legacy row anchor must remain without a duplicate search entry`);
}
for (const excludedId of ["peppers", "melon", "chili"]) {
  assert.equal(data.buildRoster.entries.some((crop) => crop.id === excludedId), false, `${excludedId} must remain outside the active roster because its source table is NotINCLUDED`);
}
assert.match(html, /11 current-build crop profiles/);
const buildRosterHtml = html.match(/<section class="evidence-ledger build-data-roster"[\s\S]*?<\/section>/)?.[0] || "";
assert.equal((buildRosterHtml.match(/<th>/g) || []).length, 6, "crop comparison must not repeat the same evidence badge in every row");
assert.doesNotMatch(buildRosterHtml, />1 days</, "one-day crop values must use singular English units");
assert.match(buildRosterHtml, /tabindex="0"/, "overflowing crop comparison must be keyboard-scrollable");
assert.match(css, /\.build-data-roster\s*\{[^}]*scroll-margin-top:/s, "crop section deep links must clear the sticky header");
assert.match(html, /Current-build data/);
assert.match(html, /Marrow Seed is not referenced by the Town SeedVendor table/);
assert.match(html, /Leek Seed is not referenced by the Town SeedVendor table/);
assert.doesNotMatch(html, /serialized base price/i, "internal base prices must not be presented as player-facing values");
assert.match(css, /\.evidence-build\s*\{[^}]*color:[^}]*background:/s, "current-build evidence badge needs visible foreground and background styling");
for (const [index, title, url] of [
  [searchIndex, "Pumpkin", "/database/crops#pumpkin"],
  [searchIndex, "Marrow", "/database/crops#marrow"],
  [zhSearchIndex, "南瓜", "/zh/database/crops#pumpkin"],
  [zhSearchIndex, "西葫芦", "/zh/database/crops#marrow"],
]) {
  assert.ok(index.some((entry) => entry.title === title && entry.url === url), `${title}: search must open the labeled profile, not a headerless table row`);
  assert.equal(index.filter(entry => entry.title === title && entry.url.startsWith(url.split('#')[0])).length, 1, `${title}: avoid duplicate profile/row search results`);
}

for (const [id, src] of Object.entries(data.sources)) {
  assert.ok(SOURCE_KINDS.has(src.kind), `source ${id}: bad kind ${src.kind}`);
  assert.ok(src.title && src.date, `source ${id}: title and date are required`);
  assert.ok("url" in src && "build" in src, `source ${id}: url (may be null) and build fields are required`);
}

function checkFact(fact, where) {
  assert.ok(LEVELS.has(fact.evidenceLevel), `${where}: bad evidenceLevel ${fact.evidenceLevel}`);
  assert.ok(VALIDITY.has(fact.validity), `${where}: bad validity ${fact.validity}`);
  assert.ok("build" in fact, `${where}: build field required (may be null)`);
  assert.ok(fact.text, `${where}: fact needs text`);
  assert.ok(Array.isArray(fact.sourceIds) && fact.sourceIds.length > 0, `${where}: fact needs sourceIds`);
  for (const id of fact.sourceIds) assert.ok(SOURCE_IDS.has(id), `${where}: unknown source id ${id}`);
}

const entries = data.crops.concat(data.inputs);
for (const entry of entries) {
  assert.ok(entry.id && entry.name && entry.lastUpdated, `entry missing id/name/lastUpdated: ${entry.id}`);
  assert.match(html, new RegExp(`id="${entry.id}" data-search-entry`), `generated page must expose #${entry.id} anchor`);
  for (const field of entry.fields) {
    for (const fact of field.facts) checkFact(fact, `${entry.id}/${field.key}`);
  }
}
for (const fact of data.cashin) checkFact(fact, "cashin");

/* Fact-count sanity with tolerance — do not hardcode an exact number. */
const factCount = entries.reduce((n, e) => n + e.fields.reduce((m, f) => m + f.facts.length, 0), 0) + data.cashin.length;
assert.ok(factCount >= 20, `expected at least 20 facts, got ${factCount}`);

/* Sell-price discipline: no per-crop player sell price may be asserted while the settlement screen stays aggregated. */
const sellFacts = data.crops.flatMap((c) => c.fields.filter((f) => f.key === "sell").flatMap((f) => f.facts));
for (const fact of sellFacts) {
  assert.ok(!/sell price[^.]*\bis\s+\d/i.test(fact.text), `per-crop sell price asserted without evidence: ${fact.text.slice(0, 60)}`);
}

/* Garlic's 31C must stay labeled as retail, never as a seed or sell price. */
const garlic = data.crops.find((c) => c.id === "garlic");
assert.ok(garlic.fields.every((f) => f.key !== "seed" || !/31C/.test(f.facts.map((x) => x.text).join(" "))), "31C must not appear as garlic seed price");

/* zh (Chinese) block sanity: every zh entry needs the fields the zh renderer consumes. */
const ZH_BADGE_KINDS = new Set(["official", "official-warn", "community", "video", "lead", "model", "shot-pending", "unknown", "historical", "none"]);
function checkZh(zh, where) {
  assert.ok(zh.tocLabel && zh.name && zh.searchTitle && zh.searchTags, `${where}: zh block needs tocLabel/name/searchTitle/searchTags`);
  assert.ok(Array.isArray(zh.groups), `${where}: zh.groups must be an array`);
  assert.ok(zh.summary || zh.groups.length > 0, `${where}: zh block needs a summary or at least one group`);
  for (const g of zh.groups) {
    for (const f of g.facts) {
      assert.ok(f.text, `${where}: zh fact needs text`);
      assert.ok(ZH_BADGE_KINDS.has(f.badge), `${where}: bad zh badge ${f.badge}`);
    }
  }
}
for (const entry of entries) {
  if (entry.zh) checkZh(entry.zh, entry.id);
  if (entry.decision || entry.zh?.decision) {
    assert.ok(entry.decision && entry.zh?.decision, `${entry.id}: decision guidance must be bilingual`);
  }
}
assert.ok(data.zhExtra && Array.isArray(data.zhExtra.sections) && data.zhExtra.sections.length > 0, "zhExtra.sections required while zh page is generated");
for (const s of data.zhExtra.sections) {
  assert.ok(s.id && s.tocLabel && s.heading && s.searchTitle && s.searchTags, `zhExtra section ${s.id}: missing required fields`);
  if (s.badge) assert.ok(ZH_BADGE_KINDS.has(s.badge), `zhExtra section ${s.id}: bad badge ${s.badge}`);
}
assert.ok(Array.isArray(data.zhExtra.related) && data.zhExtra.related.length > 0, "zhExtra.related links required");

/* A public calendar stays blocked until current-build day counting and season boundaries are reproduced. */
assert.doesNotMatch(sitemap, /crop-calendar/, "crop calendar must stay out of the sitemap until its evidence gate passes");
assert.match(research, /Calendar publication gate/);
assert.match(research, /Repeat the full record for at least three crops/);
assert.doesNotMatch(farmingGuide, /season change on the 1st wipes seasonal crops/);
assert.doesNotMatch(farmingGuide, /still-active official fertilizer warning/);

/* The generated file must be byte-identical to a fresh render. */
assert.match(html, /GENERATED by scripts\/build-crops\.cjs/);
const drift = spawnSync(process.execPath, [path.join(root, "scripts", "build-crops.cjs"), "--check"], { cwd: root, encoding: "utf8" });
assert.equal(drift.status, 0, `database/crops.html drift detected — re-run node scripts/build-crops.cjs\n${drift.stdout}${drift.stderr}`);

console.log(`PASS: crops data layer — ${data.crops.length} crops, ${data.inputs.length} inputs, ${factCount} facts, generated page in sync.`);
