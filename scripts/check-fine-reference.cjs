const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-fines.json');
const searchCore = require('../assets/js/search-core.js');

assert.equal(data.items.length, 20);
assert.equal(new Set(data.items.map(item => item.id)).size, 20);
for (const item of data.items) {
  assert.ok(item.name && item.zhName && data.sources[item.sourceId]);
  assert.ok(!('price' in item) && !('description' in item));
  assert.equal(item.classification, 'FINES');
}

for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'guides/police-wanted-levels.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  assert.ok(html.includes('data-fine-reference'));
  assert.ok(html.includes(prefix ? '不公开内部金额' : 'Internal amounts are not published'));
  for (const item of data.items) {
    const anchor = `fine-${item.id}`;
    assert.ok(html.includes(`id="${anchor}"`), `${prefix}: missing ${item.id}`);
    assert.ok(index.some(document => document.url === `/${prefix}guides/police-wanted-levels#${anchor}`), `${prefix}: not indexed ${item.id}`);
    assert.equal(searchCore.searchDocuments(index, prefix ? item.zhName : item.name, 12)[0]?.url, `/${prefix}guides/police-wanted-levels#${anchor}`, `${prefix}: exact search ${item.id}`);
  }
}

console.log('PASS: 20 source-backed fine/service definitions reach bilingual police-guide profiles without publishing internal amounts.');
