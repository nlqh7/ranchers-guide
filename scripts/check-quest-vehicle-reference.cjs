const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-misc-items.json');
const searchCore = require('../assets/js/search-core.js');

assert.equal(data.questItems?.length, 1);
const item = data.questItems[0];
assert.deepEqual(item, {
  id: 'CarToRepair_Cimka',
  name: "Victor's Old Car",
  zhName: '维克多老爷车',
  nameKey: 'Items_DB/CarToRepair_Cimka/Name',
  description: null,
  sourceId: 'Misc-b472fda258',
  classification: 'OTHER',
  rarity: 'Bronze',
  bodySlot: 'NONE',
  equippable: false,
  stackable: false,
  droppable: false,
  sellable: false,
  relatedQuestId: 'rust-to-rumbling',
});
assert.ok(data.sources[item.sourceId]);
assert.ok(!('price' in item));

for (const prefix of ['', 'zh/']) {
  const quest = fs.readFileSync(path.join(root, prefix, 'database/quests/rust-to-rumbling.html'), 'utf8');
  const vehicles = fs.readFileSync(path.join(root, prefix, 'guides/vehicles-transport.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const questSection = quest.split('id="rust-to-rumbling"')[1]?.split('</section>')[0];
  assert.ok(questSection?.includes('data-quest-vehicle-id="CarToRepair_Cimka"'));
  assert.ok(questSection.includes(prefix ? item.zhName : 'Victor&#39;s Old Car'));
  assert.match(questSection, prefix ? /不等于已验证的修车价格或奖励/ : /not a verified repair price or reward/);
  assert.match(questSection, prefix ? /不证明当前可驾驶、性能、修理价格或任务奖励/ : /do not establish current drivability, performance, a repair price or a quest reward/);
  assert.ok(vehicles.includes('data-quest-vehicle-id="CarToRepair_Cimka"'));
  assert.ok(vehicles.includes(`/${prefix}database/quests#rust-to-rumbling`));
  assert.match(vehicles, prefix ? /不证明当前可驾驶/ : /does not establish current drivability/);
  const questRoute = `/${prefix}database/quests#rust-to-rumbling`;
  assert.ok(index.some(result => result.url === questRoute), 'vehicle search index must retain the quest directory route');
  const searchResults = searchCore.searchDocuments(index, prefix ? '锈迹斑斑到轰鸣上路' : 'Rust to Rumbling', 12);
  assert.ok(searchResults.some(result => result.url === questRoute), 'quest title search must reach the vehicle quest directory');
  const itemResults = searchCore.searchDocuments(index, prefix ? item.zhName : item.name, 12);
  assert.ok(itemResults.some(result => [questRoute, `/${prefix}database/quests/rust-to-rumbling#rust-to-rumbling`, `/${prefix}guides/vehicles-transport#quest-vehicle-victor-old-car`].includes(result.url)), 'native vehicle-name search must reach the quest or vehicle detail answer');
}

console.log("PASS: Victor's Old Car reaches the bilingual quest profile and vehicle guide without price or drivability claims.");
