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
const dialogueServices = readJson('data/dialogue-services.json');
assert.equal(dialogueServices.services.length, 15);
assert.equal(new Set(dialogueServices.services.map(service=>service.id)).size, 15);
for (const service of dialogueServices.services) {
  assert.ok(service.name && service.zhName && service.summary && service.zhSummary);
  assert.ok(service.sourceNodes.length > 0);
  assert.ok(service.relatedRoute.startsWith('/'));
  assert.equal(service.evidenceLevel, 'build-observed');
  assert.equal(service.validity, 'unknown');
}
assert.deepEqual(dialogueServices.services.find(service => service.id === 'bicycle-rental-actions').dialogueListedCosts, [{kind:'rental',currency:1},{kind:'damage-penalty',currency:100}]);
assert.deepEqual(dialogueServices.services.find(service => service.id === 'taxi-rental-actions').dialogueListedCosts, [{kind:'rental',currency:10},{kind:'damage-penalty',currency:100}]);
assert.deepEqual(dialogueServices.services.find(service => service.id === 'subway-travel-actions').dialogueListedCosts, [{kind:'local-ticket',currency:3}]);
assert.deepEqual(dialogueServices.services.find(service => service.id === 'additional-land-purchase').dialogueListedCosts, [{kind:'additional-plot',currency:300000}]);
assert.deepEqual(dialogueServices.services.find(service => service.id === 'vehicle-repair-actions').sourceNodes, ['31/12', '33/15', '33/16']);
assert.deepEqual(dialogueServices.services.find(service => service.id === 'animal-treatment-actions').sourceNodes, ['47/15', '47/16', '48/3']);
assert.equal(quests.quests.length, 18, 'Sixteen static quests and two dialogue-defined quest leads must reach the website');
const staticQuests = quests.quests.filter(q => q.buildGuide.sourceKind !== 'dialogue-defined');
assert.equal(staticQuests.length, 16);
assert.deepEqual(staticQuests.map(q => q.buildGuide.questId).sort(), Array.from({length:16}, (_, i) => `F_Quest_${String(i + 1).padStart(2, '0')}`));
for (const quest of quests.quests) {
  const flow = quest.buildGuide.flow;
  assert.ok(flow, `${quest.id}: missing reviewed failure/continuation flow`);
  assert.ok(Array.isArray(flow.failureTriggers));
  assert.ok(['restart-current','follow-up-call','none'].includes(flow.failureContinuation));
  assert.ok(flow.successContinuation === null || ['next-quest','follow-up-call','message'].includes(flow.successContinuation.type));
  assert.equal(flow.explicitRewardField, false, `${quest.id}: quest table must not invent a reward field`);
  assert.ok(flow.sourceFields.length > 0);
}
const introFlow = quests.quests.find(q => q.id === 'a-new-beginning').buildGuide.flow;
assert.deepEqual(introFlow.failureTriggers, ['player-death','player-imprisonment','quest-actor-death','quest-vehicle-destroyed','game-time-threshold']);
assert.equal(introFlow.gameTimeThreshold, 19);
assert.deepEqual(introFlow.successContinuation, {type:'next-quest',targetQuestId:'F_Quest_03'});
assert.equal(quests.quests.find(q => q.id === 'from-blueprint-to-bed').buildGuide.flow.failureContinuation, 'restart-current');
const coalLead = quests.quests.find(q => q.id === 'coal-delivery-dialogue');
const farmProductLead = quests.quests.find(q => q.id === 'farm-products-dialogue');
assert.equal(coalLead.buildGuide.sourceKind, 'dialogue-defined');
assert.deepEqual(coalLead.buildGuide.configuredRewards, [{choice:'completion',currency:300000}]);
assert.deepEqual(farmProductLead.buildGuide.configuredRewards, [{choice:'ask-for-money',currency:100000},{choice:'decline-money',currency:200000}]);
const staticRewardActions = Object.fromEntries(staticQuests.filter(q => q.buildGuide.configuredRewardActions).map(q => [q.buildGuide.questId, q.buildGuide.configuredRewardActions]));
assert.deepEqual(Object.keys(staticRewardActions).sort(), ['F_Quest_02', 'F_Quest_06', 'F_Quest_10', 'F_Quest_16']);
assert.deepEqual(staticRewardActions.F_Quest_02[0].grants.map(grant => [grant.itemId, grant.quantity, grant.rarity]), [
  ['tools_hammer_metal', 1, 'Bronze'], ['red_tent', 1, 'Bronze'], ['vegetable_strawberry_normal', 10, 'Bronze'],
]);
assert.equal(staticRewardActions.F_Quest_06.length, 2);
assert.deepEqual(staticRewardActions.F_Quest_06[0].grants.map(grant => [grant.itemId, grant.quantity, grant.rarity]), [
  ['tools_watercan_metal', 1, 'Bronze'], ['seed_garlic', 8, 'Bronze'], ['seed_garlic', 8, 'Silver'],
]);
assert.deepEqual(staticRewardActions.F_Quest_06[1].grants.map(grant => grant.itemId), ['tools_hoe_metal']);
assert.deepEqual(staticRewardActions.F_Quest_10[0].grants.map(grant => grant.itemId), ['tools_fireextinguisher']);
assert.deepEqual(staticRewardActions.F_Quest_16[0].grants, [{currency:20000}]);
assert.match(staticRewardActions.F_Quest_16[0].triggerText, /2 Chicken Egg - Large/);
assert.match(coalLead.buildGuide.notes[0].text, /runtime availability.*unknown/i);
assert.deepEqual(farmProductLead.buildGuide.steps.map(step=>step.entry), [1,2]);
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
for (const html of [npcHtml, zhNpcHtml]) {
  assert.equal((html.match(/data-dialogue-service=/g) || []).length, 15);
  assert.equal((html.match(/id="dialogue-service-[^"]+" data-dialogue-service=[^>]+data-search-entry/g) || []).length, 15);
  assert.doesNotMatch(html, /Marchant_|RepairMarchant_|SubWay_|State_SetMoney/);
}
assert.match(npcHtml, /Electricity contract actions/);
assert.match(npcHtml, /Bicycle rental terminal/);
assert.match(npcHtml, /Clothing and accessories catalogues/);
assert.match(npcHtml, /Additional land purchase/);
assert.match(npcHtml, /Meriam blueprint catalogue and selling/);
assert.match(npcHtml, /Animal infection treatment/);
assert.match(zhNpcHtml, /电力合同操作/);
assert.match(zhNpcHtml, /自行车租赁终端/);
assert.match(zhNpcHtml, /服装与配饰目录/);
assert.match(zhNpcHtml, /购买额外土地/);
assert.match(zhNpcHtml, /Meriam 蓝图目录与出售/);
assert.match(zhNpcHtml, /动物感染治疗/);
for (const html of [questHtml, zhQuestHtml]) {
  assert.equal((html.match(/data-quest-build-guide=/g) || []).length, 18, "static and dialogue-defined guides must reach the actual page");
  assert.equal((html.match(/data-quest-flow/g) || []).length, 18, "all published guides must render failure and continuation data");
  assert.equal((html.match(/data-dialogue-defined-quest/g) || []).length, 2, "dialogue-defined leads need a distinct visible boundary");
  assert.equal((html.match(/data-configured-reward-action=/g) || []).length, 5, "five source-matched static quest reward actions must render");
  assert.equal((html.match(/data-quest-objective=/g) || []).length, 74, "all 71 static and 3 dialogue-defined objectives must be rendered");
  assert.match(html, /quest-guide\.css\?v=20260830-1/);
  assert.doesNotMatch(html, /State_HasMoney|InventoryGetItemCount|Quest_Concrd|F_Quest_/);
}
assert.match(questHtml, /Hammer × 1 · Bronze/);
assert.match(questHtml, /Garlic Seed × 8 · Silver/);
assert.match(questHtml, /After handing over 2 Chicken Egg - Large/);
assert.match(zhQuestHtml, /锤子 × 1 · 铜级/);
assert.match(zhQuestHtml, /大蒜种子 × 8 · 银级/);
assert.match(zhQuestHtml, /交付 2 个大号鸡蛋后/);
assert.doesNotMatch(questHtml + zhQuestHtml, /Inventory_AddItem|State_SetMoney\(20000\)/);
assert.match(questHtml, /Quest-level failure configuration/);
assert.match(questHtml, /Player death/);
assert.match(questHtml, /Starts <a href="#from-blueprint-to-bed">From Blueprint to Bed<\/a>/);
assert.match(zhQuestHtml, /任务级失败配置/);
assert.match(zhQuestHtml, /玩家死亡/);
assert.match(zhQuestHtml, /接续 <a href="#from-blueprint-to-bed">从蓝图到床铺<\/a>/);
assert.match(questHtml, /Configured dialogue reward: 300,000 C/);
assert.match(questHtml, /Ask for money: 100,000 C/);
assert.match(questHtml, /Decline money: 200,000 C/);
assert.match(zhQuestHtml, /对话配置奖励：300,000 C/);
assert.match(zhQuestHtml, /选择要钱：100,000 C/);
assert.match(zhQuestHtml, /选择不要钱：200,000 C/);
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
