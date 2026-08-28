const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const data = require('../data/animals.json');
const cow = data.species.find(a => a.id === 'cow');
assert.ok(cow.buildReference, 'cow profile must expose source-backed breeds and shop requirements');
const ref = cow.buildReference;
assert.equal(ref.evidenceLevel, 'build-observed');
assert.equal(ref.validity, 'unknown', 'file configuration must not imply runtime verification');
assert.equal(ref.build, data.meta.build);
for (const id of ref.sourceIds) {
  const source = data.sources[id];
  assert.equal(source.kind, 'first-hand-build-resource');
  assert.match(source.rawSha256, /^[0-9a-f]{64}$/);
  assert.equal(source.build, ref.build);
  assert.ok(source.pathId && source.steamBuild);
}
assert.equal(ref.breeds.length, 5);
assert.equal(new Set(ref.breeds.flatMap(b => b.itemIds)).size, 7);
for (const locale of ['en', 'zh']) {
  const html = fs.readFileSync(path.join(root, locale === 'zh' ? 'zh/database/animals.html' : 'database/animals.html'), 'utf8');
  const block = html.match(/<div class="animal-build-reference"[\s\S]*?<!-- animal-build-reference-end -->/)?.[0];
  assert.ok(block, `${locale}: cow build reference is visible in its generated profile`);
  for (const breed of ref.breeds) assert.ok(block.includes(locale === 'zh' ? breed.zhName : breed.name));
  assert.ok(block.includes('/database/quests#chicken-coop-mission'));
  for (const step of ref.care) assert.ok(block.includes(locale === 'zh' ? step.zhText : step.text));
  const knowledge = JSON.parse(fs.readFileSync(path.join(root, locale === 'zh' ? 'zh/knowledge-index.json' : 'knowledge-index.json'), 'utf8'));
  const entity = knowledge.entities.find(e => e.id === 'animal:cow');
  assert.ok(entity.facts.some(f => f.evidenceLevel === 'build-observed'), 'knowledge lookup must use the new reference');
  assert.ok(entity.aliases.includes(locale === 'zh' ? '加斯科牛' : 'Gascon'));
  assert.doesNotMatch(block, /20[,.]?000|24[,.]?000|issellable/, 'internal prices and sale flags are not player-facing facts');
}
console.log('PASS: cow build reference has bilingual breed and requirement lookup.');

for (const locale of ['en', 'zh']) {
  const html = fs.readFileSync(path.join(root, locale === 'zh' ? 'zh/database/animals.html' : 'database/animals.html'), 'utf8');
  const profile = html.match(/<section[^>]*id="goat"[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.match(profile, /class="animal-build-reference"/, `${locale}: goat lookup must expose interpreted game data`);
  const rows = profile.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || '';
  for (const name of locale === 'zh' ? ['山羊 - 公羊', '山羊 - 母羊', '山羊 - 小母羊', '山羊 - 小公羊'] : ['Buck', 'Goat Doe', 'Goat Doeling', 'Buckling']) assert.ok(rows.includes(name));
  assert.equal((rows.match(new RegExp(locale === 'zh' ? '>有引用<' : '>Referenced<', 'g')) || []).length, 2);
  assert.equal((rows.match(new RegExp(locale === 'zh' ? '>未引用<' : '>Not referenced<', 'g')) || []).length, 2);
  assert.match(profile, /\/database\/quests#chicken-coop-mission/);
  assert.ok(profile.includes(locale === 'zh' ? '不保证当前可购买' : 'does not guarantee availability'));
  assert.doesNotMatch(profile, /14[,.]?400|7[,.]?200|issellable/);
}
console.log('PASS: goat names distinguish adult shop references from young animal definitions.');

for (const locale of ['en', 'zh']) {
  const knowledge = JSON.parse(fs.readFileSync(path.join(root, locale === 'zh' ? 'zh/knowledge-index.json' : 'knowledge-index.json'), 'utf8'));
  const entity = knowledge.entities.find(e => e.id === 'animal:goat');
  for (const name of locale === 'zh' ? ['山羊 - 小母羊', '中份山羊奶'] : ['Goat Doeling', 'Goat Milk - Medium']) {
    assert.ok(entity.aliases.includes(name), `${locale}: goat lookup must include ${name}`);
  }
  assert.ok(entity.facts.some(f => f.evidenceLevel === 'build-observed'), 'goat lookup must label build evidence');
}
console.log('PASS: bilingual goat names and product names resolve to the animal reference.');
