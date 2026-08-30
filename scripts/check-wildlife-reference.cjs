const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/animals.json');
const searchCore = require('../assets/js/search-core.js');
const ref = data.wildlifeReference;

assert.ok(ref, 'animals.json must expose the build wildlife reference');
assert.equal(ref.entries.length, 13);
assert.equal(ref.entries.filter(item => item.kind === 'bird').length, 11);
assert.equal(ref.entries.filter(item => item.kind === 'butterfly').length, 2);
assert.equal(new Set(ref.entries.map(item => item.id)).size, 13);
assert.deepEqual([...new Set(ref.entries.map(item => item.rarity))].sort(), ['Bronze', 'Gold', 'Silver']);
for (const item of ref.entries) {
  assert.ok(item.name && item.zhName);
  assert.ok(!('description' in item) && !('drop' in item) && !('location' in item));
}

for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'database/animals.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  assert.ok(html.includes('data-wildlife-reference'));
  assert.ok(html.includes(prefix ? '不代表敌对、掉落、生成地点或可捕猎' : 'do not establish hostility, drops, spawn locations or huntability'));
  for (const item of ref.entries) {
    const anchor = `wildlife-${item.id}`;
    const title = prefix ? item.zhName : item.name;
    assert.ok(html.includes(`id="${anchor}"`), `${prefix}: missing ${item.id}`);
    assert.ok(html.includes(`href="#${anchor}"`), `${prefix}: missing browse link ${item.id}`);
    assert.ok(index.some(document => document.url === `/${prefix}database/animals#${anchor}`), `${prefix}: not indexed ${item.id}`);
    assert.equal(searchCore.searchDocuments(index, title, 12)[0]?.url, `/${prefix}database/animals#${anchor}`, `${prefix}: exact wildlife search ${item.id}`);
  }
}

console.log('PASS: 13 build-defined wildlife names reach bilingual database profiles with source-field boundaries.');
