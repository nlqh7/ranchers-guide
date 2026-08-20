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
const farmingGuide = fs.readFileSync(path.join(root, "guides", "farming-fields.html"), "utf8");
const research = fs.readFileSync(path.join(root, "research.html"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

const LEVELS = new Set(data.meta.evidenceLevels);
const VALIDITY = new Set(data.meta.validityValues);
const SOURCE_KINDS = new Set(["official-news", "steam-thread", "local-video", "wiki", "local-archive", "community-scan", "store-page"]);
const SOURCE_IDS = new Set(Object.keys(data.sources));
assert.ok(LEVELS.size === 5 && VALIDITY.size === 4, "meta must enumerate evidence levels and validity values");

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
