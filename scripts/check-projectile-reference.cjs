const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-projectiles.json');
const searchCore = require('../assets/js/search-core.js');

assert.deepEqual(data.items.map(item => item.id), ['weapon_Projectile_LVL0', 'weapon_Missile_LVL0']);
assert.deepEqual(data.items.map(item => item.zhName), ['0级射弹武器', '0级导弹武器']);
for (const item of data.items) {
  assert.equal(item.description, null);
  assert.ok(data.sources[item.sourceId]);
  assert.ok(!('price' in item) && !('damage' in item) && !('ammo' in item));
  assert.equal(item.equippable, false);
  assert.equal(item.stackable, false);
  assert.equal(item.droppable, false);
  assert.equal(item.sellable, false);
}

for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'guides/crafting-guide.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const block = html.split('data-projectile-reference')[1]?.split('</details>')[0];
  assert.ok(block);
  assert.ok(block.includes(`/${prefix}guides/crafting-guide#tool-weapon_Ammo_01`));
  assert.match(block, prefix ? /不证明武器可用性、弹药兼容、伤害、射速、容量、掉落或当前运行时实现/ : /do not establish weapon availability, ammunition compatibility, damage, fire rate, capacity, drops or current runtime implementation/);
  for (const item of data.items) {
    const anchor = `projectile-${item.id}`;
    const title = prefix ? item.zhName : item.name;
    assert.ok(block.includes(`id="${anchor}"`));
    assert.equal(searchCore.searchDocuments(index, title, 12)[0]?.url, `/${prefix}guides/crafting-guide#${anchor}`);
  }
}

console.log('PASS: 2 source-defined projectile names reach a collapsed bilingual equipment lookup without weapon-behavior claims.');
