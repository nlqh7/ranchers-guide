const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'data', 'build-seeds.json');
assert.ok(fs.existsSync(file), 'All 14 source seed definitions need an interpreted dataset');

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const search = require('../assets/js/search-core.js');
const ids = [
  'seed_red_luttuce', 'seed_garlic', 'seed_strawberry', 'seed_aubergine',
  'seed_corn', 'seed_green_luttuce', 'seed_pumpkin', 'seed_carotte',
  'seed_onion', 'seed_marrow', 'seed_leek', 'seed_peppers', 'seed_melon',
  'seed_chili',
];
assert.deepEqual(data.items.map(item => item.id), ids);
assert.equal(data.evidenceLevel, 'build-observed');
assert.equal(data.validity, 'unknown');
assert.equal(data.steamBuild, '24847725');
assert.equal(data.items.filter(item => item.rosterStatus === 'current-roster').length, 11);
assert.equal(data.items.filter(item => item.rosterStatus === 'not-included').length, 3);
assert.deepEqual(data.items.filter(item => item.shopOfferId).map(item => item.id), ids.slice(0, 9));

for (const item of data.items) {
  assert.ok(item.name && item.zhName && data.sources[item.sourceId]);
  assert.equal(item.description, null, 'Empty I2 descriptions are not generated descriptions');
  assert.equal(item.classification, 'FARMING');
  assert.equal(item.rarity, 'Bronze');
  assert.equal(item.bodySlot, 'Right_Hand_Weapon');
  assert.equal(item.energy.consumption, 1);
  assert.equal(item.energy.restore, 0);
  for (const flag of ['equippable', 'stackable', 'droppable', 'sellable']) assert.equal(item[flag], true);
  assert.ok(!('price' in item) && !('retailPrice' in item), 'Internal prices stay private');
}

for (const item of data.items.filter(item => item.rosterStatus === 'not-included')) {
  assert.equal(item.seasonSourceId, 'Seed_fruits_NotINCLUDED-041aede3af');
  assert.equal(item.shopOfferId, null);
  assert.equal(item.minConfiguredFruit, null, 'Missing minimum fruit values remain null');
  assert.ok(!('currentAvailability' in item) && !('yield' in item), 'Excluded configuration is not promoted into gameplay claims');
}

for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'database/crops.html'), 'utf8');
  for (const item of data.items.filter(item => item.rosterStatus === 'current-roster')) {
    assert.ok(html.includes(`data-seed-id="${item.id}"`), `${prefix}: current crop profile must expose ${item.id}`);
    assert.ok(html.includes(prefix ? item.zhName : item.name), `${prefix}: exact localized seed name must be visible`);
    if (item.shopOfferId) {
      assert.ok(html.includes(`href="/${prefix}guides/resources-and-materials#offer-${item.shopOfferId}"`), `${prefix}: matched seed offer must be reachable`);
    }
  }
  for (const item of data.items.filter(item => item.rosterStatus === 'not-included')) {
    assert.ok(html.includes(`id="seed-${item.cropId}"`), `${prefix}: excluded configuration needs a direct entry`);
    assert.ok(html.includes(`data-seed-id="${item.id}"`));
    assert.ok(html.includes(prefix ? item.zhName : item.name));
    const profile = html.split(`id="seed-${item.cropId}"`)[1]?.split('</section>')[0];
    assert.ok(profile?.includes(prefix ? '种子物品配置' : 'Seed item settings'), `${prefix}: excluded entry keeps its inventory settings available without promoting gameplay availability`);
  }
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const knowledge = JSON.parse(fs.readFileSync(path.join(root, prefix, 'knowledge-index.json'), 'utf8'));
  for (const item of data.items) {
    const expected = `/${prefix}database/crops#${item.rosterStatus === 'current-roster' ? item.cropId : `seed-${item.cropId}`}`;
    const query = item.id === 'seed_chili' ? item.id : (prefix ? item.zhName : item.name);
    assert.equal(search.searchDocuments(index, query, 12)[0]?.url, expected, `${prefix}: exact seed query must open its complete crop/seed profile`);
    if (item.id === 'seed_chili') assert.ok(search.searchDocuments(index, prefix ? item.zhName : item.name, 3).some(result => result.url === expected), `${prefix}: ambiguous native Chili name must keep the seed profile near the top`);
    if (item.rosterStatus === 'current-roster') {
      const entity = knowledge.entities.find(entry => entry.id === `crop:${item.cropId}`);
      assert.ok(entity.aliases.includes(item.name) && entity.aliases.includes(item.zhName), `${prefix}: crop dossier needs native seed aliases`);
      assert.ok(entity.facts.some(fact => fact.evidenceLevel === 'build-observed' && fact.sourceIds.includes(item.sourceId)), `${prefix}: crop dossier needs the seed configuration with its own evidence`);
    }
  }
}

console.log('PASS: 14 seed definitions preserve current-roster, shop and NotINCLUDED boundaries.');
