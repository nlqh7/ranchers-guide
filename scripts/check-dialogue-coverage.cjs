const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const coverage = require('../data/dialogue-coverage.json');
const npcs = require('../data/npcs.json').npcs;
const quests = require('../data/quests.json').quests;
const services = require('../data/dialogue-services.json').services;

assert.equal(coverage.inventory.actorIds && Object.keys(coverage.inventory.actorIds).length, 13);
assert.equal(coverage.inventory.conversationIds.length, 50);
assert.equal(coverage.conversationDisposition.length, coverage.inventory.conversations);
assert.equal(new Set(coverage.conversationDisposition.map(item => item.id)).size, 50);
assert.equal(coverage.actorDisposition.length, 13);
assert.equal(new Set(coverage.actorDisposition.map(item => item.id)).size, 13);
assert.equal(coverage.source.build, '24847725');
assert.deepEqual(coverage.source.sourceIds, ['owned-build-dialogue']);

const validRefs = new Set([
  ...npcs.map(item => `npc:${item.id}`),
  ...quests.map(item => `quest:${item.id}`),
  ...services.map(item => `service:${item.id}`),
]);
for (const row of [...coverage.conversationDisposition, ...coverage.actorDisposition]) {
  assert.ok(row.status && row.reason || row.status === 'applied' || row.status === 'reused', `${row.id}: disposition reason required`);
  for (const ref of row.publicRefs || []) assert.ok(validRefs.has(ref), `${row.id}: invalid public ref ${ref}`);
}
const referencedConversationIds = new Set();
for (const service of services) {
  for (const sourceNode of service.sourceNodes || []) {
    const match = String(sourceNode).match(/^(\d+)\//);
    if (match) referencedConversationIds.add(Number(match[1]));
  }
}
for (const quest of quests) {
  for (const match of JSON.stringify(quest).matchAll(/Conversation\s+(\d+)/g)) referencedConversationIds.add(Number(match[1]));
}
const dispositionById = new Map(coverage.conversationDisposition.map(row => [row.id, row]));
for (const id of referencedConversationIds) {
  const row = dispositionById.get(id);
  assert.ok(row, `referenced conversation ${id} needs a disposition`);
  assert.ok(['applied', 'reused'].includes(row.status), `referenced conversation ${id} cannot remain excluded or unknown`);
}
assert.equal(coverage.conversationDisposition.find(item => item.id === 29).status, 'reused');
assert.deepEqual(coverage.conversationDisposition.find(item => item.id === 29).publicRefs, ['quest:coal-delivery-dialogue']);
assert.equal(coverage.conversationDisposition.find(item => item.id === 10).publicRefs[0], 'service:seed-vendor-actions');
assert.equal(coverage.conversationDisposition.find(item => item.id === 34).publicRefs[0], 'service:clothing-catalogue-actions');
console.log('PASS: dialogue coverage has all 50 conversations, 13 actor dispositions and only real public targets.');
