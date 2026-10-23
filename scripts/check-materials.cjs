const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "materials.json");
const enPath = path.join(root, "database", "materials.html");
const zhPath = path.join(root, "zh", "database", "materials.html");

assert.ok(fs.existsSync(dataPath), "data/materials.json must exist");
assert.ok(fs.existsSync(enPath), "English materials database must exist");
assert.ok(fs.existsSync(zhPath), "Chinese materials database must exist");

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const en = fs.readFileSync(enPath, "utf8");
const zh = fs.readFileSync(zhPath, "utf8");
const building = fs.readFileSync(path.join(root, "guides", "building-construction.html"), "utf8");
const knowledgeBase = fs.readFileSync(path.join(root, "database.html"), "utf8");
const chineseKnowledgeBase = fs.readFileSync(path.join(root, "zh", "database.html"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sourceIds = new Set(Object.keys(data.sources));
for (const [prefix, page] of [['', en], ['zh/', zh]]) {
  for (const id of ['charcoal', 'zirconite']) {
    const section = page.match(new RegExp(`<section\\b[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/section>`))?.[0];
    assert.ok(section, `${prefix}${id}: retained material answer must exist`);
    const actions = section.indexOf('class="database-guide-links"');
    const evidence = section.indexOf('class="evidence-list"');
    const uses = section.indexOf('data-material-uses=');
    assert.ok(actions >= 0 && actions < evidence && actions < uses,
      `${prefix}${id}: player next steps must appear before long source and recipe references`);
  }
}
const required = ["stone", "wood-log", "hay", "charcoal", "zirconite"];

assert.deepEqual(data.materials.map((item) => item.id), required, "materials must use the approved high-demand order");
assert.equal(data.meta.build, "0.8.10.842", "page baseline must remain the current official build");

for (const [id, source] of Object.entries(data.sources)) {
  assert.ok(source.kind && source.title && source.date, `source ${id} needs kind, title and date`);
  assert.ok("url" in source && "build" in source, `source ${id} needs url and build fields`);
}

for (const material of data.materials) {
  assert.ok(material.name && material.zhName && material.searchTitle && material.zhSearchTitle && material.summary && material.zhSummary, `${material.id}: bilingual identity required`);
  assert.ok(material.whenNeeded && material.zhWhenNeeded, `${material.id}: bilingual decision guidance required`);
  assert.ok(Array.isArray(material.relatedRoutes) && material.relatedRoutes.length > 0, `${material.id}: related routes required`);
  assert.match(en, new RegExp(`id="${material.id}" data-search-entry`), `English page must expose #${material.id}`);
  assert.match(zh, new RegExp(`id="${material.id}" data-search-entry`), `Chinese page must expose #${material.id}`);
  for (const fact of material.facts) {
    assert.ok(fact.text && fact.zhText, `${material.id}: every fact needs bilingual copy`);
    assert.ok(["official", "video-observed", "community-confirmed", "unverified-lead"].includes(fact.evidenceLevel), `${material.id}: invalid evidence level`);
    assert.ok(["current", "historical", "obsolete", "unknown"].includes(fact.validity), `${material.id}: invalid validity`);
    assert.ok("build" in fact, `${material.id}: build is required, even when null`);
    assert.ok(Array.isArray(fact.sourceIds) && fact.sourceIds.length, `${material.id}: fact needs sources`);
    for (const sourceId of fact.sourceIds) assert.ok(sourceIds.has(sourceId), `${material.id}: unknown source ${sourceId}`);
  }
}

const publicCopy = data.materials.flatMap((material) => material.facts.flatMap((fact) => [fact.text, fact.zhText])).join("\n");
for (const id of ['stone', 'wood-log']) {
  const material = data.materials.find(item => item.id === id);
  const gathering = material.facts.find(fact => fact.evidenceLevel === 'official' && fact.sourceIds.includes('official-stone-wood-gathering-868'));
  assert.ok(gathering && !gathering.sourceIds.includes('official-stone-wood-gathering-871'), 'Gathering must cite the .868 Trees & Rocks statement, not the .871 camera announcement');
  assert.ok(!/0\.8\.10\.871/.test(gathering.text + gathering.zhText + gathering.build), 'Do not attribute the gathering statement to an unrelated camera update');
}
for (const file of ['database/materials.html','zh/database/materials.html','database/materials/stone.html','zh/database/materials/stone.html','database/materials/wood-log.html','zh/database/materials/wood-log.html','database/buildings/coop.html','zh/database/buildings/coop.html','guides/resources-and-materials.html','zh/guides/resources-and-materials.html']) {
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.ok(!/Official 0\.8\.10\.871 notes say|official 0\.8\.10\.871 gathering rule|官方 0\.8\.10\.871 (?:公告说明|采集规则)/.test(html),file+': repeated gathering answer still cites the unrelated camera update');
  if (/database\/materials\/|guides\//.test(file)) {
    assert.ok(html.includes('1843481262701719'),file+': missing applicable .868 gathering source');
  } else {
    assert.ok(html.includes('/database/materials/stone'),file+': summary must retain the full sourced Stone entry');
  }
}
assert.doesNotMatch(publicCopy, /press Q|按 Q|1[–-]2 minutes|1[–-]2 分钟|watering can.*extinguish|浇水壶.*灭火/i, "charcoal controls, timing and watering-can behavior are not retained current facts");
assert.doesNotMatch(publicCopy, /mine is open|mines are open|矿洞已开放|矿场已开放/i, "mines must not be presented as currently available");
assert.doesNotMatch(publicCopy, /stone (?:costs|is sold for) 29C|石头.*29C/i, "single-source stone price must not be published as confirmed");

const hay = data.materials.find((material) => material.id === "hay");
const charcoal = data.materials.find((material) => material.id === "charcoal");
const charcoalReply = charcoal.facts.find((fact) => fact.evidenceLevel === "official" && fact.sourceIds.includes("general-store-charcoal-reply"));
assert.ok(charcoalReply, "Charcoal must distinguish the September staff answer from the unverified detailed burn sequence");
assert.match(charcoalReply.text, /burning wood/i);
assert.match(charcoalReply.zhText, /燃烧木材/);
assert.match(charcoal.summary, /controls[\s\S]*time[\s\S]*yield[\s\S]*unverified/i);
assert.match(data.sources["general-store-charcoal-reply"].url, /592942202593765840/);
assert.ok(hay.facts.some((fact) => fact.evidenceLevel === "official" && fact.validity === "historical" && fact.build === "alpha-2023" && fact.sourceIds.includes("ranching-v2-notes")), "Hay entry must preserve the official pre-EA wild-grass route with its historical boundary");
assert.ok(hay.facts.some((fact) => fact.evidenceLevel === "unverified-lead" && fact.sourceIds.includes("current-hay-thread")), "Current-build bush/container route must remain a lead, not be promoted to fact");

assert.match(en, /GENERATED by scripts\/build-materials\.cjs/);
assert.match(zh, /GENERATED by scripts\/build-materials\.cjs/);
assert.match(en, /Reliable repeatable Stone supply is still being verified/);
assert.match(zh, /可靠的可重复石头来源仍待验证/);
assert.match(en, /Mines are not available in the reviewed Early Access build/);
assert.match(zh, /当前审查的抢先体验版本尚未开放矿洞/);
const hayEntryEn = fs.readFileSync(path.join(root, "database", "materials", "hay.html"), "utf8");
const hayEntryZh = fs.readFileSync(path.join(root, "zh", "database", "materials", "hay.html"), "utf8");
assert.match(hayEntryEn, /wild grass produces Hay regardless of growth stage[\s\S]*pre-Early Access documentation[\s\S]*alpha-2023/);
assert.match(hayEntryZh, /野草在任何生长阶段都能产出干草[\s\S]*抢先体验前[\s\S]*alpha-2023/);
assert.doesNotMatch(building, /press Q|1[–-]2 minutes|watering can, then pick/i, "building guide must not retain unsupported charcoal precision");
assert.match(building, /href="\/database\/materials"/);
assert.match(knowledgeBase, /href="\/database\/materials"/);
assert.match(chineseKnowledgeBase, /href="\/zh\/database\/materials"/);
assert.match(sitemap, /<loc>https:\/\/theranchersguide\.com\/database\/materials<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/theranchersguide\.com\/zh\/database\/materials<\/loc>/);

const drift = spawnSync(process.execPath, [path.join(root, "scripts", "build-materials.cjs"), "--check"], { cwd: root, encoding: "utf8" });
assert.equal(drift.status, 0, `generated materials pages drifted\n${drift.stdout}${drift.stderr}`);

console.log(`PASS: bilingual materials database — ${data.materials.length} materials with evidence-linked current-build boundaries.`);
