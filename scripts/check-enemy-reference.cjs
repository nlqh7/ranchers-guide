const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/animals.json');
const searchCore = require('../assets/js/search-core.js');
const ref = data.enemyReference;

assert.equal(ref?.entries.length, 3);
assert.deepEqual(ref.entries.map(item => item.id), ['Skeleton_A', 'Spider_Black_Widow', 'Spider_Tarantula']);
assert.deepEqual(ref.entries.map(item => item.zhName), ['骨架图案', '黑寡妇蜘蛛', '狼蛛']);
assert.deepEqual(ref.entries.map(item => item.rarity), ['Bronze', 'Silver', 'Gold']);
for (const item of ref.entries) {
  assert.ok(item.name && item.zhName);
  assert.ok(!('description' in item) && !('drop' in item) && !('location' in item) && !('danger' in item));
}

for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'database/animals.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  assert.ok(html.includes('data-enemy-reference'));
  assert.ok(html.includes(prefix ? '不证明敌对行为、危险程度、掉落、生成地点或可狩猎' : 'do not establish hostile behavior, danger, drops, spawn locations or huntability'));
  assert.ok(html.includes(prefix ? '“骨架图案”是构建中的原生中文名称' : '“Skeleton” is the build-localized English name'));
  for (const item of ref.entries) {
    const anchor = `enemy-${item.id}`;
    const title = prefix ? item.zhName : item.name;
    assert.ok(html.includes(`id="${anchor}"`));
    assert.ok(html.includes(`href="#${anchor}"`));
    assert.equal(searchCore.searchDocuments(index, title, 12)[0]?.url, `/${prefix}database/animals#${anchor}`);
  }
}

console.log('PASS: 3 build-defined enemy names reach bilingual animal profiles with source-field boundaries.');
