const assert = require('node:assert/strict');
const { filterUses } = require('../assets/js/material-use-search.js');
const { recipes } = require('../data/build-recipes.json');
const stone = recipes.filter(recipe => recipe.materials.some(item => item.id === 'ressource_rock_simple'))
  .map(recipe => ({ id: recipe.id, text: recipe.name + ' ' + recipe.zhName }));
assert.deepEqual(filterUses(stone, '  basic SPRINKLER ').map(item => item.id), ['sprinkler_n1']);
assert.deepEqual(filterUses(stone, '洒水器 基础').map(item => item.id), ['sprinkler_n1']);
assert.deepEqual(filterUses(stone, 'Sprinkler Basic').map(item => item.id), ['sprinkler_n1']);
assert.deepEqual(filterUses(stone, 'not-a-recipe'), []);
assert.deepEqual(filterUses(stone, '   '), stone);
const fs = require('node:fs');
const path = require('node:path');
for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(__dirname, '..', prefix, 'database/materials.html'), 'utf8');
  assert.equal((html.match(/data-material-uses=/g) || []).length, 5);
  assert.equal((html.match(/class="resource-use-controls" hidden/g) || []).length, 5, 'No-JS readers retain usable static tables, not dead search controls');
  assert.ok(html.includes('material-use-search.js?v=20260913-use1'));
  assert.ok(html.includes('resource-reference.css?v=20260913-use1'));
  assert.ok(html.includes('data-use-row="sprinkler_n1" data-use-search-text="Basic Sprinkler 基础款洒水器"'));
}
console.log('PASS: material-scoped recipe search finds the intended item.');
