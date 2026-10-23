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
const chineseHtml = fs.readFileSync(path.join(root, "zh", "database", "animals.html"), "utf8");
const chineseGuide = fs.readFileSync(path.join(root, "zh", "guides", "animal-guide.html"), "utf8");
const sharedStyles = fs.readFileSync(path.join(root, "assets", "css", "style.css"), "utf8");

const LEVELS = new Set(data.meta.evidenceLevels);
const VALIDITY = new Set(data.meta.validityValues);
const SOURCE_KINDS = new Set(["official-news", "steam-thread", "local-video", "wiki", "local-archive", "community-scan", "store-page", "first-hand-build-resource"]);
const SOURCE_IDS = new Set(Object.keys(data.sources));
const poultrySource=data.sources['thread-cant-sell-roosters'];
assert.equal(poultrySource.url,'https://steamcommunity.com/app/1501310/discussions/0/587307906419013076/','Selling advice needs its recovered exact moderator thread');
assert.equal(poultrySource.build,'not stated in reply','A dated thread is not a named runtime build');
const chickenSelling=data.species.find(x=>x.id==='chicken').fields.find(x=>x.key==='selling');
const liveSaleDenial=/selling live animals is not implemented|cannot sell live animals|live-animal selling is not in the game|当前不能出售活体|不能出售活体动物|不能活卖|没有活体出售/i;
assert.ok(!liveSaleDenial.test(chickenSelling.facts.map(x=>x.text).join(' ')),'A suggested meat route does not establish universal live-animal sale absence');
for(const prefix of ['', 'zh/']){
 const guide=fs.readFileSync(path.join(root,prefix,'guides/animal-guide.html'),'utf8');
 const fertility=guide.match(/<section\b[^>]*id="fertility"[^>]*>[\s\S]*?<\/section>/)?.[0];
 assert.ok(fertility,prefix+': Infertile eggs need a distinct searchable breeding check');
 assert.ok(fertility.includes('590686908802381288'),prefix+': cite the exact breeding prerequisite reply');
 assert.ok(fertility.includes(`/${prefix}guides/gigi-large-egg-quest#eggs`),prefix+': separate a missing large egg from a breeding problem');
 const gigi=fs.readFileSync(path.join(root,prefix,'guides/gigi-large-egg-quest.html'),'utf8');
 assert.ok(gigi.includes(`/${prefix}guides/animal-guide#fertility`),prefix+': large-egg readers need the reverse link to breeding checks');
 const chickenEntry=fs.readFileSync(path.join(root,prefix,'database/animals/chicken.html'),'utf8');
 assert.ok(chickenEntry.includes(`/${prefix}guides/animal-guide#fertility`),prefix+': the chicken profile must expose a distinct fertility action');
 const shopSection=guide.match(/<section\b[^>]*id="shop-locked"[^>]*>[\s\S]*?<\/section>/)?.[0];
 assert.ok(shopSection,prefix+': shop purchase failures need directly searchable steps');
 assert.ok((prefix?/紫[\s\S]*第一份/:/purple[\s\S]*first gift/i).test(shopSection),prefix+': distinguish negative hearts and the daily first-gift limit');
 assert.ok(shopSection.includes('590686595451166128'),prefix+': expose the actual shop-embargo reply');
 assert.ok(!liveSaleDenial.test(guide),prefix+': repeated quick answers must not preserve the unsupported live-sale denial');
 assert.ok(!/5,000\+|5,000\+C|普通成年鸡约\s*5,000/.test(guide),prefix+': the cited profit thread contains no ordinary5000 example');
 assert.ok(guide.includes('587307906419013076'),prefix+': give the exact meat-route source, not only a forum index');
 for(const file of ['database/animals.html','database/animals/chicken.html']){
   const generated=fs.readFileSync(path.join(root,prefix,file),'utf8');
   assert.ok(!liveSaleDenial.test(generated),prefix+file+': generated facts must not retain the unsupported live-sale denial');
   if(file==='database/animals.html' || prefix==='zh/') assert.ok(generated.includes('587307906419013076'),prefix+file+': displayed selling advice needs the recovered exact source');
 }
}
// Newly sourced care facts must retain the same version in both languages.
for (const animal of data.species) {
  for (const fact of animal.zh?.groups.flatMap(group => group.facts) || []) {
    if (fact.sourceIds?.includes('update-0-8-10-858')) {
      assert.equal(fact.build, data.sources['update-0-8-10-858'].build, `${animal.id}: Chinese sickness facts must retain the official source build`);
    }
  }
}
for (const locale of ['', 'zh/']) {
  const index = JSON.parse(fs.readFileSync(path.join(root, locale, 'search-index.json'), 'utf8'));
  const route = `/${locale}guides/animal-guide#sickness-alerts`;
  const answer = index.find(entry => entry.url === route);
  assert.ok(answer, `${locale || 'en'}: sickness answer must have its own searchable deep link`);
  assert.match(answer.description, /^(Official|官方)/, `${route}: official care advice must not inherit a community label`);
}
assert.ok(LEVELS.size === 6 && LEVELS.has('build-observed') && VALIDITY.size === 4, "meta must enumerate evidence levels, including build observations, and validity values");
assert.ok(Array.isArray(data.species) && data.species.length >= 4, "expected at least 4 species");
assert.match(sharedStyles, /\.table-tools\s*\{[^}]*align-items:\s*center/s, "table controls must vertically center count badges");
assert.match(sharedStyles, /\.table-tools \[data-table-count\][^{]*\{[^}]*border-radius:\s*(?:4px|var\(--radius-sm\))/s, "table counts must stay compact, not stretch into pills");

for (const [id, src] of Object.entries(data.sources)) {
  assert.ok(SOURCE_KINDS.has(src.kind), `source ${id}: kind must be one of ${[...SOURCE_KINDS].join("/")}, got ${src.kind}`);
  assert.ok(src.title && src.date, `source ${id}: title and date are required`);
  assert.ok("url" in src && "build" in src, `source ${id}: url (may be null) and build fields are required`);
}
assert.equal(
  data.sources["thread-livestock-profit"].url,
  "https://steamcommunity.com/app/1501310/discussions/0/587308261888256098/",
  "specific livestock-profit figures must cite the exact Steam thread"
);
assert.match(chineseHtml, /https:\/\/steamcommunity\.com\/app\/1501310\/discussions\/0\/587307627624740721\//, "Chinese animal database must expose the official temperature-device source");
assert.doesNotMatch(chineseGuide, /任务(?:<strong>)?没有 bug/, "documented prompt misses must not rule out other mission bugs");
assert.match(chineseGuide, /不排除其他 bug/, "Chinese guide must preserve the qualified mission-bug wording");

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
      if (f.sourceIds) {
        assert.ok(Array.isArray(f.sourceIds) && f.sourceIds.length > 0, `${where}: zh sourceIds must be a non-empty array`);
        for (const id of f.sourceIds) assert.ok(SOURCE_IDS.has(id), `${where}: unknown zh source id ${id}`);
      }
    }
  }
}
for (const animal of data.species) {
  if (animal.zh) checkZh(animal.zh, animal.id);
  if (animal.whenNeeded || animal.zh?.whenNeeded) {
    assert.ok(animal.whenNeeded && animal.zh?.whenNeeded, `${animal.id}: when-needed guidance must be bilingual`);
  }
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
