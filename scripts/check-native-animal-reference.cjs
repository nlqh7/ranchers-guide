const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/animals.json');
const searchCore = require('../assets/js/search-core.js');
const reference = data.nativeAnimalReference;

assert.ok(reference, 'Animals source needs a public, source-bounded native-name reference');
assert.equal(reference.build, '0.8.10.842');
assert.equal(reference.steamBuild, '24847725');
assert.equal(reference.entries.length, 27);
assert.deepEqual(Object.fromEntries(['chicken', 'cow', 'sheep', 'goat', 'rabbit'].map(id => [id, reference.entries.filter(entry => entry.speciesId === id).length])), {
  chicken: 8,
  cow: 11,
  sheep: 2,
  goat: 4,
  rabbit: 2,
});
assert.equal(new Set(reference.entries.map(entry => entry.id)).size, 27);
assert.ok(reference.entries.every(entry => entry.name && entry.zhName && ['adult', 'young'].includes(entry.stage) && ['female', 'male'].includes(entry.sex)));
assert.deepEqual(reference.sharedConfiguration, {
  classification: 'FARMING',
  rarity: 'Bronze',
  equippable: false,
  bodySlot: 'NONE',
  stackable: false,
  droppable: false,
  sellableFlag: true,
});
assert.ok(reference.entries.every(entry => !('price' in entry) && !('description' in entry)), 'internal prices and raw developer descriptions stay private');
assert.ok(data.species.some(species => species.id === 'sheep'), 'the two native sheep entries need an existing-page profile');

for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'database/animals.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  for (const entry of reference.entries) {
    const anchor = `native-animal-${entry.id}`;
    const row = html.split(`id="${anchor}"`)[1]?.split('</tr>')[0];
    assert.ok(row, `${prefix || 'en/'}: missing native animal row ${entry.id}`);
    assert.ok(row.includes(prefix ? entry.zhName : entry.name), `${entry.id}: localized name stays visible`);
    assert.ok(index.some(document => document.url === `/${prefix}database/animals#${anchor}`), `${entry.id}: direct search destination exists`);
    assert.equal(searchCore.searchDocuments(index, entry.id, 12)[0]?.url, `/${prefix}database/animals#${anchor}`, `${entry.id}: source ID opens its exact row`);
  }
  assert.match(html, prefix ? /配置不证明当前可购买、可出售活体、可繁殖或会在存档中生成/ : /configuration does not prove current purchase, live-animal sale, breeding or save availability/);
  assert.doesNotMatch(html, /protect the flock and fertilize eggs|reasonabe meat and dairy production/i, 'raw developer descriptions are not promoted as player-facing facts');
}

console.log('PASS: 27 native animal definitions reach bilingual existing-page profiles without publishing internal prices or raw descriptions.');
