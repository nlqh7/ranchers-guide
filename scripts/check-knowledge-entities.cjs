const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function validateDataset(relative, recordsKey, minimumRecords) {
  const data = readJson(relative);
  const records = data[recordsKey];
  assert.ok(records.length >= minimumRecords, `${relative} needs at least ${minimumRecords} publishable records`);
  assert.ok(Object.keys(data.sources).length >= 2, `${relative} needs a source registry`);

  for (const [sourceId, source] of Object.entries(data.sources)) {
    assert.ok(source.kind && source.title && source.date, `${relative} source ${sourceId} lacks metadata`);
    assert.ok(source.url === null || /^https:\/\//.test(source.url), `${relative} source ${sourceId} has an invalid URL`);
  }

  for (const record of records) {
    assert.match(record.id, /^[a-z0-9-]+$/, `${relative} record id must be route-safe`);
    assert.ok(record.name && record.zhName && record.summary && record.zhSummary, `${record.id} lacks bilingual identity`);
    assert.ok(record.facts.length >= 3, `${record.id} does not clear the three-fact publication gate`);
    assert.ok(record.relatedRoutes.length >= 1, `${record.id} must connect to an existing guide, map or database route`);
    for (const fact of record.facts) {
      assert.ok(fact.text && fact.zhText, `${record.id} has an untranslated fact`);
      assert.ok(["official", "video-observed", "community-confirmed", "unverified-lead"].includes(fact.evidenceLevel));
      assert.ok(["current", "historical", "unknown"].includes(fact.validity));
      assert.ok(fact.sourceIds.length > 0, `${record.id} fact lacks sources`);
      for (const sourceId of fact.sourceIds) assert.ok(data.sources[sourceId], `${record.id} references missing source ${sourceId}`);
    }
  }
  return data;
}

const npcs = validateDataset("data/npcs.json", "npcs", 3);
const quests = validateDataset("data/quests.json", "quests", 6);
const locations = readJson("data/locations.json");
const entityTargets = new Set([
  ...npcs.npcs.map((record) => `npc:${record.id}`),
  ...locations.locations.map((record) => `location:${record.id}`),
]);

for (const quest of quests.quests) {
  assert.ok(Array.isArray(quest.relations), `${quest.id} must declare a relations array, even when evidence leaves it empty`);
  const seenRelations = new Set();
  for (const relation of quest.relations) {
    const relationKey = `${relation.predicate}:${relation.target.type}:${relation.target.id}`;
    assert.equal(seenRelations.has(relationKey), false, `${quest.id} duplicates relation ${relationKey}`);
    seenRelations.add(relationKey);
    assert.ok(["involves-npc", "takes-place-at", "uses-location"].includes(relation.predicate), `${quest.id} uses unsupported predicate ${relation.predicate}`);
    assert.ok(entityTargets.has(`${relation.target.type}:${relation.target.id}`), `${quest.id} points to missing entity ${relation.target.type}:${relation.target.id}`);
    assert.ok(["official", "video-observed", "community-confirmed", "unverified-lead"].includes(relation.evidenceLevel), `${quest.id} relation lacks an evidence level`);
    assert.ok(["current", "historical", "unknown"].includes(relation.validity), `${quest.id} relation lacks validity`);
    assert.ok(relation.build, `${quest.id} relation lacks a build`);
    assert.ok(relation.sourceIds.length > 0, `${quest.id} relation lacks sources`);
    for (const sourceId of relation.sourceIds) assert.ok(quests.sources[sourceId], `${quest.id} relation references missing source ${sourceId}`);
  }
  assert.equal(quest.relatedRoutes.some((route) => /^\/(?:zh\/)?(?:database\/npcs|map)(?:[?#]|$)/.test(route)), false, `${quest.id} duplicates an entity relation as a reading route`);
}

assert.equal(npcs.npcs.some((npc) => npc.id === "lina"), false, "Historical-only Lina must remain outside the current NPC database");
assert.ok(quests.quests.some((quest) => quest.id === "rust-to-rumbling" && quest.nameConfidence === "exact-observed"));
assert.ok(quests.quests.some((quest) => quest.id === "roof-building" && quest.nameConfidence === "descriptive"));

const powerQuest = quests.quests.find((quest) => quest.id === "power-to-the-bench");
assert.ok(powerQuest.relations.some((relation) => relation.predicate === "involves-npc" && relation.target.type === "npc" && relation.target.id === "victor"));
assert.ok(powerQuest.relations.some((relation) => relation.predicate === "takes-place-at" && relation.target.type === "location" && relation.target.id === "city-hall"));

const questHtml = read("database/quests.html");
assert.match(questHtml, /data-entity-ref="npc:victor"[^>]*>Victor<\/a>/);
assert.match(questHtml, /data-entity-ref="location:city-hall"[^>]*>City Hall<\/a>/);

const npcHtml = read("database/npcs.html");
assert.match(npcHtml, /data-derived-backlink="quest:rust-to-rumbling"[^>]*>Rust to Rumbling!<\/a>/);
assert.match(npcHtml, /data-derived-backlink="quest:power-to-the-bench"[^>]*>Power to the Bench<\/a>/);
assert.doesNotMatch(questHtml, /Open related answer \d/);
assert.match(questHtml, />Electricity contracts &amp; power<\/a>/);
assert.match(read("zh/database/quests.html"), />水电合同与供电<\/a>/);

for (const relative of ["database/npcs.html", "zh/database/npcs.html", "database/quests.html", "zh/database/quests.html"]) {
  const html = read(relative);
  assert.match(html, /GENERATED by scripts\/build-knowledge-entities\.cjs/);
  assert.match(html, /data-search-entry/);
  assert.match(html, /hreflang="en"/);
  assert.match(html, /hreflang="zh-CN"/);
}

console.log(`PASS: knowledge entities publish ${npcs.npcs.length} NPCs and ${quests.quests.length} quests behind evidence gates.`);
