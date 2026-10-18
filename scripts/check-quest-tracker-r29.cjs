const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const quests = require('../data/quests.json').quests;
const b2 = require('../data/b2-entry-pages.json');
const scenes = require('../data/dialogue-scenes.json');
const script = fs.readFileSync(path.join(root, 'assets/js/quest-tracker.js'), 'utf8');

const byId = id => quests.find(quest => quest.id === id);
const assertHintContract = (id, checks) => {
  const record = byId(id);
  assert.ok(record && record.buildGuide, `${id}: build guide is required`);
  assert.ok(Array.isArray(record.buildGuide.trackerHints) && record.buildGuide.trackerHints.length, `${id}: tracker hints are required`);
  for (const check of checks) {
    const hint = record.buildGuide.trackerHints.find(item => check.entries.every(entry => item.entries.includes(entry)));
    assert.ok(hint, `${id}: missing hint for entries ${check.entries.join(',')}`);
    assert.ok(hint.text && hint.zhText, `${id}: hint ${check.entries.join(',')} must be bilingual`);
    assert.ok(Array.isArray(hint.sourceFields) && hint.sourceFields.length, `${id}: hint ${check.entries.join(',')} needs source fields`);
    assert.match(hint.text, check.en, `${id}: English hint lost player-facing boundary`);
    assert.match(hint.zhText, check.zh, `${id}: Chinese hint lost player-facing boundary`);
  }
};

assertHintContract('from-blueprint-to-bed', [
  { entries: [1, 2, 3], en: /ordinary Red Tent|four-person tent/i, zh: /普通红色帐篷|四人款/ }
]);
assertHintContract('power-to-the-bench', [
  { entries: [2, 3], en: /electricity contract|workbench/i, zh: /合同|工作台/ },
  { entries: [4, 5], en: /workbench|energy-meter app/i, zh: /工作台|电表应用/ }
]);
assertHintContract('seeds-of-success', [
  { entries: [6], en: /ten plots|16|planted-plot target/i, zh: /10块|16块|播种地块/ }
]);
assertHintContract('feathered-foes', [
  { entries: [1, 2], en: /ordinary Scarecrow|Workbench|Bob/i, zh: /普通稻草人|工作台|鲍勃/ }
]);
assert.match(byId('seeds-of-success').searchTags, /10 plots.*16 plots/i, 'Seeds natural stuck query is missing');
assert.match(byId('seeds-of-success').zhSearchTags, /10块.*16块/, 'Chinese Seeds natural stuck query is missing');
assert.match(byId('feathered-foes').searchTags, /stuck.*ordinary recipe/i, 'Scarecrow natural stuck query is missing');
assert.match(byId('feathered-foes').zhSearchTags, /卡住.*选择普通配方/, 'Chinese Scarecrow natural stuck query is missing');

assert.ok(Array.isArray(b2.quests) && b2.quests.includes('from-blueprint-to-bed'), 'detail route contract must retain blueprint quest');
assert.ok(Array.isArray(scenes.scenes) && scenes.scenes.some(scene => scene.npcId === 'victor'), 'NPC route contract must retain Victor');
assert.match(script, /data\/b2-entry-pages\.json/, 'tracker must consume the existing quest detail contract');
assert.match(script, /data\/dialogue-scenes\.json/, 'tracker must consume the existing NPC detail contract');
assert.match(script, /trackerHints/, 'tracker must consume objective hints');
assert.match(script, /quest-tracker-hint/, 'tracker must render the focused hint affordance');
assert.match(script, /data-quest-hint-target/, 'non-exact tracker hints must use a manual local selector');
assert.match(script, /nameConfidence === ['"]exact-build['"]/, 'legacy facts must remain the only automatic build checklist');
assert.match(script, /function loadRouteContracts/, 'optional route contracts must load independently');
assert.match(script, /ranchers-guide-quest-tracker-v1/, 'R29 must preserve the existing progress key');

console.log('PASS: R29-R32 tracker contract covers bilingual hints, detail registrations, natural queries and preserved progress storage.');
