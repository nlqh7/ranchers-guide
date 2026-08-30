const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-placeables.json');
const recipes = require('../data/build-recipes.json');
const searchCore = require('../assets/js/search-core.js');
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));

assert.equal(data.items.length, 167);
assert.equal(data.items.filter(item => item.recipeId).length, 150);
assert.equal(data.items.filter(item => !item.recipeId).length, 17);
assert.equal(data.items.filter(item => item.building.sleep).length, 8);
assert.equal(data.items.filter(item => item.utilities).length, 37);
assert.equal(data.items.filter(item => item.grid).length, 4);
assert.equal(Object.values(data.sources).filter(source => source.title !== 'Owned-build item localization').length, 6);
for (const item of data.items) {
  assert.ok(item.name && item.zhName && data.sources[item.sourceId]);
  assert.equal(item.description, null);
  assert.ok(!('price' in item) && !('retailPrice' in item));
  assert.ok(Number.isFinite(item.building.defaultHealth));
  assert.ok(Number.isFinite(item.building.buildSteps));
  if (item.grid) {
    assert.deepEqual(Object.keys(item.grid), ['x', 'y', 'z', 'showGrid']);
    assert.ok(['x', 'y', 'z'].every(axis => Number.isFinite(item.grid[axis])));
  }
  if (item.recipeId) assert.ok(recipes.recipes.some(recipe => recipe.id === item.recipeId));
}
assert.deepEqual(data.items.find(item => item.id === 'Building_Workbench_1').utilities.electricity.consumption, [5, 5, 5, 5]);
assert.deepEqual(data.items.find(item => item.id === 'red_tent').building.sleep, {energyRestorePercent: 70, healthRestorePercent: 70});
assert.deepEqual(data.items.find(item => item.id === 'prop_Silo_Big').grid, {x: 20, y: 20, z: 20, showGrid: true});

for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'guides/crafting-guide.html'), 'utf8');
  const compact = fs.readFileSync(path.join(root, prefix, 'guides/building-construction.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  assert.ok(html.includes('data-recipe-group="native"'));
  assert.ok(html.includes(prefix ? '仅源内可放置物' : 'Source-only placeables'));
  assert.ok(!compact.includes('data-recipe-group="native"'));
  for (const item of data.items) {
    const anchor = item.recipeId ? `recipe-${item.id}` : `placeable-${item.id}`;
    const profile = html.split(`id="${anchor}"`)[1]?.split('</tr>')[0];
    assert.ok(profile, `${prefix}: missing placeable route ${item.id}`);
    assert.ok(profile.includes(`data-placeable-id="${item.id}"`));
    assert.ok(profile.includes(esc(prefix ? item.zhName : item.name)), `${prefix}: missing localized name for ${item.id}`);
    assert.ok(index.some(document => document.url === `/${prefix}guides/crafting-guide#${anchor}`), `${prefix}: missing placeable search document ${item.id}`);
  }
  const representatives = [...new Map(data.items.map(item => [item.sourceId, item])).values()];
  representatives.push(data.items.find(item => item.id === 'Custum_Barn_Weak_Small'));
  for (const item of representatives) {
    const query = prefix ? item.zhName : item.name;
    const expectedUrls = data.items.filter(candidate => (prefix ? candidate.zhName : candidate.name) === query).map(candidate => `/${prefix}guides/crafting-guide#${candidate.recipeId ? `recipe-${candidate.id}` : `placeable-${candidate.id}`}`);
    const firstUrl = searchCore.searchDocuments(index, query, 12)[0]?.url;
    assert.ok(expectedUrls.includes(firstUrl), `${prefix}: exact placeable name ${query} opened ${firstUrl}`);
  }
  assert.ok(html.includes(prefix ? '不是已实测耐久、施工次数' : 'not measured durability, construction actions'));
  assert.ok(html.includes(prefix ? '格网参数 X/Y/Z' : 'Grid parameters X/Y/Z'));
}

console.log('PASS: 167 placeables reach recipe-linked bilingual settings or the source-only lookup without inferred prices or effects.');
