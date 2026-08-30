const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const data = require('../data/build-misc-items.json');
const searchCore = require('../assets/js/search-core.js');

assert.deepEqual(data.items.map(item => item.id), ['misc_GPSTracker', 'misc_Guitar_01', 'weapon_Ammo_01']);
assert.equal(data.items.flatMap(item => item.shopOfferIds).length, 1);
assert.equal(data.items.find(item => item.id === 'misc_Guitar_01').stackable, false);
assert.equal(data.items.find(item => item.id === 'misc_Guitar_01').disableHoldingAnimation, true);
for (const item of data.items) {
  assert.ok(item.name && item.zhName && data.sources[item.sourceId]);
  assert.equal(item.description, null);
  assert.ok(!('price' in item));
  assert.deepEqual(item.energy, {consumption: 0, supply: 0});
  assert.deepEqual(item.health, {consumption: 0, supply: 0});
}
for (const prefix of ['', 'zh/']) {
  const crafting = fs.readFileSync(path.join(root, prefix, 'guides/crafting-guide.html'), 'utf8');
  const shops = fs.readFileSync(path.join(root, prefix, 'guides/resources-and-materials.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  for (const item of data.items) {
    const row = crafting.split(`id="tool-${item.id}"`)[1]?.split('</tr>')[0];
    assert.ok(row?.includes(`data-misc-item-id="${item.id}"`));
    assert.ok(row.includes(prefix ? item.zhName : item.name));
    assert.equal(searchCore.searchDocuments(index, prefix ? item.zhName : item.name, 12)[0]?.url, `/${prefix}guides/crafting-guide#tool-${item.id}`);
  }
  assert.ok(shops.split('id="offer-seed-store-allthetime-weapon_Ammo_01"')[1]?.split('</tr>')[0].includes(`${prefix ? '/zh' : ''}/guides/crafting-guide#tool-weapon_Ammo_01`));
}
console.log('PASS: 3 Equippable_Misc items reach bilingual equipment rows with one shop roundtrip.');
