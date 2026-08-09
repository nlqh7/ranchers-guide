/* Basic guards for the animals JSON data layer: schema sanity, per-animal
 * anchors in the generated page, and a drift check between data/animals.json
 * and database/animals.html. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "animals.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "database", "animals.html"), "utf8");

const LEVELS = new Set(data.meta.evidenceLevels);
const VALIDITY = new Set(data.meta.validityValues);
const SOURCE_KINDS = new Set(["official-news", "steam-thread", "local-video", "wiki", "local-archive", "community-scan", "store-page"]);
const SOURCE_IDS = new Set(Object.keys(data.sources));
assert.ok(LEVELS.size === 5 && VALIDITY.size === 4, "meta must enumerate evidence levels and validity values");
assert.ok(Array.isArray(data.species) && data.species.length >= 4, "expected at least 4 species");

for (const [id, src] of Object.entries(data.sources)) {
  assert.ok(SOURCE_KINDS.has(src.kind), `source ${id}: kind must be one of ${[...SOURCE_KINDS].join("/")}, got ${src.kind}`);
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

for (const animal of data.species) {
  assert.ok(animal.id && animal.name && animal.lastUpdated, `species missing id/name/lastUpdated: ${animal.id}`);
  assert.match(html, new RegExp(`id="${animal.id}" data-search-entry`), `generated page must expose #${animal.id} anchor`);
  for (const field of animal.fields) {
    for (const fact of field.facts) checkFact(fact, `${animal.id}/${field.key}`);
  }
}
for (const s of data.sharedSystems) checkFact(s, "sharedSystems");

/* Fact-count sanity with tolerance — do not hardcode an exact number. */
const factCount = data.species.reduce((n, a) => n + a.fields.reduce((m, f) => m + f.facts.length, 0), 0) + data.sharedSystems.length;
assert.ok(factCount >= 50, `expected at least 50 facts, got ${factCount}`);

/* Chicken is the reference species: every core field must be populated. */
const chicken = data.species.find((a) => a.id === "chicken");
const chickenFields = new Set(chicken.fields.map((f) => f.key));
for (const key of ["acquisition", "housing", "feed", "water", "products", "breeding", "sickness", "automation", "quests", "bugs", "selling"]) {
  assert.ok(chickenFields.has(key), `chicken profile must cover ${key}`);
}

/* Non-chicken species must mark unverified fields with labeled facts, not invented values. */
for (const animal of data.species.filter((a) => a.id !== "chicken")) {
  const markers = new Set(animal.fields.flatMap((f) => f.facts.map((fact) => `${fact.evidenceLevel}:${fact.validity}`)));
  const labeled = [...markers].some((m) => m.endsWith(":unknown") || m.endsWith(":historical") || m.startsWith("unverified-lead"));
  assert.ok(labeled, `${animal.id} must label unverified data`);
}

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
for (const animal of data.species) {
  if (animal.zh) checkZh(animal.zh, animal.id);
}
assert.ok(data.zhExtra && Array.isArray(data.zhExtra.sections) && data.zhExtra.sections.length > 0, "zhExtra.sections required while zh page is generated");
for (const s of data.zhExtra.sections) {
  assert.ok(s.id && s.tocLabel && s.heading && s.searchTitle && s.searchTags, `zhExtra section ${s.id}: missing required fields`);
  if (s.badge) assert.ok(ZH_BADGE_KINDS.has(s.badge), `zhExtra section ${s.id}: bad badge ${s.badge}`);
}
assert.ok(Array.isArray(data.zhExtra.related) && data.zhExtra.related.length > 0, "zhExtra.related links required");

/* The generated file must be byte-identical to a fresh render. */
assert.match(html, /GENERATED by scripts\/build-animals\.cjs/);
const drift = spawnSync(process.execPath, [path.join(root, "scripts", "build-animals.cjs"), "--check"], { cwd: root, encoding: "utf8" });
assert.equal(drift.status, 0, `database/animals.html drift detected — re-run node scripts/build-animals.cjs\n${drift.stdout}${drift.stderr}`);

console.log(`PASS: animals data layer — ${data.species.length} species, ${data.species.reduce((n, a) => n + a.fields.length, 0)} field groups, generated page in sync.`);
