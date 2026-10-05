const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const npcs = require('../data/npcs.json').npcs;
const quests = require('../data/quests.json').quests;
const services = require('../data/dialogue-services.json').services;
const scenes = require('../data/dialogue-scenes.json').scenes;
const coverage = require('../data/dialogue-coverage.json');
const npcIds = new Set(npcs.map(item => item.id));
const questIds = new Set(quests.map(item => item.id));
const serviceIds = new Set(services.map(item => item.id));
const sceneNpcIds = new Set();
const expectedActorIds = { meriam: 7, victor: 4, angela: 6, gigi: 6 };
const expectedSceneIds = new Set(['meriam-introduction', 'victor-utility-contracts', 'angela-coop-route', 'gigi-egg-route']);

assert.deepEqual(new Set(scenes.map(scene => scene.id)), expectedSceneIds, 'reviewed scene IDs must remain stable');
assert.equal(new Set(scenes.map(scene => scene.id)).size, scenes.length, 'scene IDs must be unique');
assert.equal(coverage.inventory.actors, 13, 'dialogue inventory actor count');
assert.equal(coverage.inventory.staticQuests, 16, 'dialogue inventory quest count');
assert.equal(coverage.inventory.conversations, 50, 'dialogue inventory conversation count');
assert.ok(coverage.applied.length >= 4, 'applied public conversation coverage');
assert.ok(coverage.excluded.length && coverage.unknown.length, 'excluded and unknown coverage boundaries');
assert.equal(coverage.conversationDisposition.length, coverage.inventory.conversations, 'every conversation has a disposition');
assert.deepEqual(new Set(coverage.conversationDisposition.map(item => item.id)), new Set(coverage.inventory.conversationIds), 'conversation disposition IDs match inventory');
for (const scene of scenes) {
  assert.ok(npcIds.has(scene.npcId), `${scene.id}: NPC reference resolves`);
  sceneNpcIds.add(scene.npcId);
  for (const id of scene.questIds || []) assert.ok(questIds.has(id), `${scene.id}: quest ${id} resolves`);
  for (const id of scene.serviceIds || []) assert.ok(serviceIds.has(id), `${scene.id}: service ${id} resolves`);
  assert.ok(scene.summary && scene.zhSummary, `${scene.id}: bilingual summary`);
  assert.ok(Number.isInteger(scene.actorId), `${scene.id}: numeric actor ID`);
  assert.equal(scene.actorId, expectedActorIds[scene.npcId], `${scene.id}: actor ID matches reviewed NPC mapping`);
  assert.equal(scene.participantIds?.player, 1, `${scene.id}: player actor contract`);
  assert.ok(scene.npcTarget?.startsWith('npc:'), `${scene.id}: namespaced NPC target`);
  const nodeIds = new Set();
  for (const group of scene.groups || []) {
    assert.ok(group.nodes?.length, `${scene.id}/${group.id}: node contract`);
    for (const node of group.nodes) {
      assert.ok(node.id && node.sourceRef === node.id, `${scene.id}/${group.id}: source node ID retained`);
      nodeIds.add(node.id);
    }
    for (const edge of group.edges || []) {
      assert.ok(nodeIds.has(edge.from) && nodeIds.has(edge.to), `${scene.id}/${group.id}: edge resolves to nodes`);
    }
  }
  assert.ok(nodeIds.size, `${scene.id}: public nodes`);
  assert.ok(scene.evidence?.sourceIds?.length, `${scene.id}: source IDs`);
  assert.ok(!/D:\\|C:\\|raw\\|\\.lua|function\s*\(/i.test(JSON.stringify(scene)), `${scene.id}: no private path/raw script`);
}

for (const id of sceneNpcIds) {
  for (const locale of ['', 'zh/']) {
    const file = path.join(root, locale, 'database', 'npcs', `${id}.html`);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /data-search-entry/);
    assert.match(html, /story-reference/);
    assert.match(html, /data-dialogue-details/);
    assert.match(html, /data-dialogue-node|data-dialogue-branch|data-dialogue-edge/);
    assert.doesNotMatch(html, /data-dialogue-line[^>]*>[^<]*(arrival|airport|contract|鸡蛋|机场)/i, `${file}: scene summary must not be a speaker line`);
    assert.match(html, /story-reference\.css\?v=20261005-r21/);
    assert.match(html, /dialogue-explorer\.js\?v=20261005-r21/);
    assert.doesNotMatch(html, /D:\\尝试盈利产品|C:\\Users\\asus|raw\\b24847725|LUA_OnCondition/);
  }
}

const searchJs = fs.readFileSync(path.join(root, 'assets/js/search.js'), 'utf8');
for (const id of sceneNpcIds) {
  assert.match(searchJs, new RegExp(`/database/npcs/${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(searchJs, new RegExp(`/zh/database/npcs/${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
}
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const id of sceneNpcIds) {
  assert.match(sitemap, new RegExp(`<loc>https://theranchersguide\\.com/database/npcs/${id}</loc>`));
  assert.match(sitemap, new RegExp(`<loc>https://theranchersguide\\.com/zh/database/npcs/${id}</loc>`));
}

console.log(`PASS: ${sceneNpcIds.size} bilingual NPC profiles, ${scenes.length} scene contracts, search routes and sitemap entries.`);
