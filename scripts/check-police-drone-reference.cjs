const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-police-drone.json');
const searchCore = require('../assets/js/search-core.js');

assert.equal(data.items.length, 1);
assert.deepEqual(data.items[0], {
  id: 'Police_Drone_LVL_1',
  name: 'Police Drone',
  zhName: '警用无人机',
  nameKey: 'Items_DB/Police_Drone_LVL_1/Name',
  description: null,
  sourceId: 'Police_Drones-efe896e301',
  classification: 'OTHER',
  rarity: 'Bronze',
  bodySlot: 'NONE',
  equippable: false,
  stackable: false,
  droppable: false,
  sellable: false,
});
assert.ok(data.sources[data.items[0].sourceId]);
assert.ok(!('price' in data.items[0]));

for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'guides/police-wanted-levels.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const anchor = 'police-drone-Police_Drone_LVL_1';
  const title = prefix ? data.items[0].zhName : data.items[0].name;
  const block = html.split('data-police-drone-reference')[1]?.split('</aside>')[0];
  assert.ok(block?.includes(`id="${anchor}"`));
  assert.ok(block.includes(title));
  assert.match(block, prefix ? /不证明出现条件、攻击行为、危险度、掉落或警星变化/ : /do not establish appearance conditions, attacks, danger, drops or wanted-level changes/);
  assert.ok(block.includes(`/${prefix}guides/gigi-large-egg-quest#police`));
  assert.equal(searchCore.searchDocuments(index, title, 12)[0]?.url, `/${prefix}guides/police-wanted-levels#${anchor}`);
}

console.log('PASS: the source-backed Police Drone definition reaches bilingual police guidance and exact search without behavior or price claims.');
