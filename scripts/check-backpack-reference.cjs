const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-backpacks.json');
const searchCore = require('../assets/js/search-core.js');

assert.deepEqual(data.items.map(item => item.id), ['backpack_big_simple', 'backpack_heavy', 'backpack_Medium_01', 'backpack_Medium_02']);
assert.deepEqual(data.items.map(item => item.storageCapacity), [15, 40, 25, 30]);
for (const item of data.items) {
  assert.equal(item.description, null);
  assert.ok(data.sources[item.sourceId]);
  assert.ok(!('price' in item) && !('shop' in item) && !('actualSlots' in item));
}

for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'guides/beginners-guide.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const block = html.split('data-backpack-reference')[1]?.split('</details>')[0];
  assert.ok(block);
  assert.match(block, prefix ? /不证明当前可获得、实际可用槽位、扩容效果、价格、商店或任务解锁/ : /do not establish current availability, usable slots, expansion effects, price, shop or quest unlocks/);
  for (const item of data.items) {
    const anchor = `backpack-${item.id}`;
    const title = prefix ? `${item.zhName} · 容量配置 ${item.storageCapacity}` : `${item.name} · Capacity setting ${item.storageCapacity}`;
    assert.ok(block.includes(`id="${anchor}"`));
    assert.ok(block.includes(title));
    assert.equal(searchCore.searchDocuments(index, title, 12)[0]?.url, `/${prefix}guides/beginners-guide#${anchor}`);
  }
}

console.log('PASS: 4 source-defined backpacks reach a bilingual capacity lookup with duplicate medium names distinguished.');
