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
    if (recordsKey === "npcs") {
      assert.ok(record.whenNeeded && record.zhWhenNeeded, `${record.id} needs bilingual task-oriented lookup guidance`);
    }
    for (const fact of record.facts) {
      assert.ok(fact.text && fact.zhText, `${record.id} has an untranslated fact`);
      assert.ok(["official", "video-observed", "community-confirmed", "unverified-lead", "build-observed"].includes(fact.evidenceLevel));
      if (fact.evidenceLevel === 'build-observed') assert.equal(fact.validity, 'unknown');
      assert.ok(["current", "historical", "unknown"].includes(fact.validity));
      assert.ok(fact.sourceIds.length > 0, `${record.id} fact lacks sources`);
      for (const sourceId of fact.sourceIds) assert.ok(data.sources[sourceId], `${record.id} references missing source ${sourceId}`);
    }
  }
  return data;
}

const npcs = validateDataset("data/npcs.json", "npcs", 3);
const quests = validateDataset("data/quests.json", "quests", 6);
assert.equal(quests.quests.length, 16, 'All sixteen decoded static quests must reach the website');
assert.deepEqual(quests.quests.map(q => q.buildGuide.questId).sort(), Array.from({length:16}, (_, i) => `F_Quest_${String(i + 1).padStart(2, '0')}`));
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
    assert.ok(["official", "video-observed", "community-confirmed", "unverified-lead", "build-observed"].includes(relation.evidenceLevel), `${quest.id} relation lacks an evidence level`);
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
assert.equal(powerQuest.buildGuide?.questId, "F_Quest_10", "power guide must link to the decoded quest, not a guessed title");
assert.equal(powerQuest.buildGuide.steps.length, 5, "power guide must retain all five configured objectives");
assert.ok(powerQuest.buildGuide.steps.every((step) => step.text && step.zhText && step.sourceFields.length), "objectives need bilingual summaries and field provenance");
const configuredEntries = { "rust-to-rumbling": [9, 4], "power-to-the-bench": [10, 5], "roof-building": [11, 10], "chicken-coop-mission": [14, 9], "solar-panel-objective": [15, 4], "real-eggs-real-evidence": [16, 5] };
for (const [id, [number, count]] of Object.entries(configuredEntries)) {
  const guide = quests.quests.find((quest) => quest.id === id).buildGuide;
  assert.equal(guide?.questId, `F_Quest_${String(number).padStart(2, "0")}`, `${id}: wrong native quest mapping`);
  assert.equal(guide.evidenceLevel, "build-observed");
  assert.equal(guide.validity, "unknown", "serialized presence must not become runtime verification");
  assert.equal(guide.build, quests.meta.build);
  assert.deepEqual(guide.sourceIds, ["owned-build-dialogue"]);
  assert.equal(guide.steps.length, count);
  assert.deepEqual(guide.steps.map((step) => step.entry), Array.from({length: count}, (_, i) => i + 1));
  for (const row of [...guide.steps, ...guide.notes]) {
    assert.ok(row.text && row.zhText && row.sourceFields.length);
    assert.doesNotMatch(row.text + row.zhText, /State_SetMoney|InventoryGetItemCount|LUA_/);
  }
}
assert.match(quests.quests.find(q => q.id === "chicken-coop-mission").buildGuide.notes[0].text, /not.*price/i);
assert.match(quests.quests.find(q => q.id === "real-eggs-real-evidence").buildGuide.notes[0].text, /12.*2/);
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
const zhQuestHtml = read("zh/database/quests.html");
const zhNpcHtml = read("zh/database/npcs.html");
for (const html of [questHtml, zhQuestHtml]) {
  assert.equal((html.match(/data-quest-build-guide=/g) || []).length, 16, "all sixteen static guides must reach the actual page");
  assert.equal((html.match(/data-quest-objective=/g) || []).length, 71, "all 71 reviewed objectives must be rendered");
  assert.match(html, /quest-guide\.css\?v=20260827-1/);
  assert.doesNotMatch(html, /State_HasMoney|InventoryGetItemCount|Quest_Concrd|F_Quest_/);
}
assert.match(questHtml, /Coop Dreams/);
assert.match(zhQuestHtml, /鸡舍梦想计划/);
assert.match(zhQuestHtml, /站长收集/);
assert.match(zhQuestHtml, /证据版本: 0\.8\.10\.455/, "older gameplay observations must retain their own build");
assert.match(zhQuestHtml, /href="\/zh\/map#city-hall"/);
assert.match(zhQuestHtml, /href="\/zh\/map#bykii-terminal"/);
for (const relative of ["knowledge-index.json", "zh/knowledge-index.json"]) {
  const index = readJson(relative);
  for (const quest of quests.quests) {
    const entry = index.entities.find(row => row.id === `quest:${quest.id}`);
    assert.ok(entry.aliases.includes(quest.buildGuide.name) && entry.aliases.includes(quest.buildGuide.zhName), `${relative}: native names must be searchable`);
    assert.ok(entry.aliases.includes(quest.name), "old task names must stay searchable");
  }
}
assert.match(zhQuestHtml, />水电合同与供电<\/a>/);
assert.match(zhQuestHtml, /href="\/zh\/guides\/electricity-power#two-paths"/);
assert.match(zhNpcHtml, /href="\/zh\/guides\/electricity-power#two-paths"/);
assert.doesNotMatch(zhQuestHtml, /href="\/guides\/(?:electricity-power|building-construction)/);
assert.doesNotMatch(zhNpcHtml, /href="\/guides\/electricity-power/);

for (const relative of ["database/npcs.html", "zh/database/npcs.html", "database/quests.html", "zh/database/quests.html"]) {
  const html = read(relative);
  assert.match(html, /GENERATED by scripts\/build-knowledge-entities\.cjs/);
  assert.match(html, /data-search-entry/);
  assert.match(html, /hreflang="en"/);
  assert.match(html, /hreflang="zh-CN"/);
}

for (const [route, heading] of [['map.html', 'Task locations'], ['zh/map.html', '任务地点']]) {
  assert.match(read(route), new RegExp(`data-map-task-relations>\\s*<summary>${heading}</summary>\\s*<div class="map-task-relation-list">`), 'Task directory headings must not retain stale fixed counts');
}
console.log(`PASS: knowledge entities publish ${npcs.npcs.length} NPCs and ${quests.quests.length} quests behind evidence gates.`);
