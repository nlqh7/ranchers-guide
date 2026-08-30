const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'data', 'build-produce.json');
assert.ok(fs.existsSync(file), 'Spring and Summer produce definitions need one interpreted dataset');

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const search = require('../assets/js/search-core.js');
const ids = [
  'vegetable_red_luttuce_normal', 'vegetable_red_luttuce_giant',
  'vegetable_peppers_normal', 'vegetable_peppers_giant',
  'vegetable_garlic_normal', 'vegetable_garlic_giant',
  'vegetable_strawberry_normal', 'vegetable_strawberry_giant',
  'vegetable_aubergine_normal', 'vegetable_aubergine_giant',
  'vegetable_melon_normal', 'vegetable_melon_giant',
  'vegetable_corn_normal', 'vegetable_corn_giant',
  'vegetable_green_luttuce_normal', 'vegetable_green_luttuce_giant',
  'vegetable_chili_normal', 'vegetable_chili_giant',
  'vegetable_pumpkin_normal', 'vegetable_pumpkin_giant',
  'vegetable_carotte_normal', 'vegetable_carotte_giant',
  'vegetable_leek_normal', 'vegetable_leek_giant',
  'vegetable_onion_normal', 'vegetable_onion_giant',
  'vegetable_marrow_normal', 'vegetable_marrow_giant',
];
assert.deepEqual(data.items.map(item => item.id), ids);
assert.deepEqual(data.scope, ['spring', 'summer', 'autumn']);
assert.equal(data.evidenceLevel, 'build-observed');
assert.equal(data.validity, 'unknown');
assert.equal(data.items.filter(item => item.size === 'normal').length, 14);
assert.equal(data.items.filter(item => item.size === 'giant').length, 14);
assert.equal(data.items.filter(item => item.cropStatus === 'current-roster').length, 22);
assert.equal(data.items.filter(item => item.cropStatus === 'not-included').length, 6);
assert.equal(data.items.flatMap(item => item.shopOfferIds).length, 20);

for (const item of data.items) {
  assert.ok(item.name && item.zhName && data.sources[item.sourceId]);
  assert.equal(item.description, null);
  assert.equal(item.classification, 'FARMING');
  assert.equal(item.rarity, 'Bronze');
  assert.equal(item.bodySlot, 'TwoHandHolder');
  for (const flag of ['equippable', 'stackable', 'droppable', 'sellable']) assert.equal(item[flag], true);
  for (const stat of ['health', 'energy']) {
    assert.equal(item[stat].consumption, 0);
    assert.ok(Number.isFinite(item[stat].restore));
  }
  assert.ok(!('price' in item) && !('retailPrice' in item));
}
assert.equal(data.items.find(item => item.id === 'vegetable_red_luttuce_normal').name, 'Green Salad');
assert.equal(data.items.find(item => item.id === 'vegetable_peppers_normal').cropStatus, 'not-included');
assert.equal(data.items.find(item => item.id === 'vegetable_aubergine_normal').name, 'Aubergine');
assert.equal(data.items.find(item => item.id === 'vegetable_melon_normal').cropStatus, 'not-included');
assert.equal(data.items.find(item => item.id === 'vegetable_chili_normal').cropStatus, 'not-included');
assert.equal(data.items.find(item => item.id === 'vegetable_carotte_normal').cropId, 'carrot');

for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'database/crops.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const knowledge = JSON.parse(fs.readFileSync(path.join(root, prefix, 'knowledge-index.json'), 'utf8'));
  for (const item of data.items) {
    const anchor = item.cropStatus === 'current-roster' ? item.cropId : `seed-${item.cropId}`;
    const profile = html.split(`id="${anchor}"`)[1]?.split('</section>')[0];
    assert.ok(profile?.includes(`data-produce-id="${item.id}"`), `${prefix}: ${item.id} must be visible in its full profile`);
    assert.ok(profile.includes(prefix ? item.zhName : item.name));
    for (const offerId of item.shopOfferIds) assert.ok(profile.includes(`href="/${prefix}guides/resources-and-materials#offer-${offerId}"`));
    assert.equal(search.searchDocuments(index, prefix ? item.zhName : item.name, 12)[0]?.url, `/${prefix}database/crops#${anchor}`, `${prefix}: exact produce name must open the complete profile`);
    if (item.cropStatus === 'current-roster') {
      const entity = knowledge.entities.find(entry => entry.id === `crop:${item.cropId}`);
      assert.ok(entity.aliases.includes(item.name) && entity.aliases.includes(item.zhName));
      assert.ok(entity.facts.some(fact => fact.evidenceLevel === 'build-observed' && fact.sourceIds.includes(item.sourceId)));
    }
  }
}

console.log('PASS: twenty-eight seasonal produce definitions preserve item, crop and shop boundaries.');
