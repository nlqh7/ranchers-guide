const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'data/build-recipes.json');
assert.ok(fs.existsSync(file), 'Native recipes must reach website generators, not remain in the private archive');
const data = JSON.parse(fs.readFileSync(file));
assert.equal(data.recipes.length, 162);
assert.equal(new Set(data.recipes.map(row => row.id)).size, 162);
const tent = data.recipes.find(row => row.id === 'red_tent');
assert.deepEqual(tent.materials, [{id:'ressource_rock_simple', quantity:4}, {id:'ressource_wood', quantity:5}]);
assert.equal(tent.workbench, false);
assert.equal(data.evidenceLevel, 'build-observed');
assert.equal(data.validity, 'unknown');
assert.deepEqual(data.tools.find(t=>t.id==='tools_axe_metal').energy, {consumption:4,supply:0});
for (const tool of data.tools) {
  if (['generic_cargo','tools_seed_bag','tools_fertilizer_box'].includes(tool.id)) assert.equal(tool.energy,null,'Absent energy must not become zero consumption');
  else {
    assert.ok(Number.isFinite(tool.energy.consumption));
    assert.ok(Number.isFinite(tool.energy.supply));
  }
}
for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'guides/crafting-guide.html'), 'utf8');
  for (const recipe of data.recipes) {
    assert.ok(html.includes(`id="recipe-${recipe.id}"`), `Missing accessible recipe: ${prefix}${recipe.id}`);
    const row = html.split(`id="recipe-${recipe.id}"`)[1].split('</tr>')[0];
    for (const m of recipe.materials) {
      const ingredient = data.ingredients.find(i => i.id === m.id);
      assert.ok(row.includes(`× ${m.quantity}</strong>`));
      assert.ok(row.includes(prefix ? ingredient.zhName : ingredient.name));
    }
    assert.ok(row.includes(prefix ? (recipe.workbench ? '需要工作台' : '不要求工作台') : (recipe.workbench ? 'Workbench required' : 'No workbench required')));
  }
  for (const tool of data.tools) {
    const row = html.split(`id="tool-${tool.id}"`)[1]?.split('</tr>')[0];
    assert.ok(row, `Missing tool: ${tool.id}`);
    assert.ok(row.includes('tool-settings'), `Missing tool settings: ${tool.id}`);
    assert.ok(row.includes(tool.energy ? `data-energy-consumption="${tool.energy.consumption}"` : 'data-energy-missing'));
    if (data.recipes.some(r=>r.id===tool.id)) {
      const recipeRow = html.split(`id="recipe-${tool.id}"`)[1]?.split('</tr>')[0];
      assert.ok(recipeRow.includes(`#tool-${tool.id}`), 'A recipe search result must expose its tool attributes');
    }
  }
  assert.match(html, /data-recipe-query/);
  assert.match(html, /data-recipe-category/);
  assert.ok(html.indexOf('id="recipe-red_tent"') < html.indexOf('id="flow"'), 'Recipes must be visible before workflow essays');
  assert.match(html, /0\.8\.10\.455/);
}
assert.equal(data.tools.length, 18);
for (const row of [...data.recipes, ...data.tools]) {
  assert.ok(row.name && row.zhName && row.nameKey === `Items_DB/${row.id}/Name`);
  assert.match(data.sources[row.sourceId].rawSha256, /^[a-f0-9]{64}$/);
  assert.ok(!Object.hasOwn(row, 'price'), 'Internal prices must not become player-facing prices');
}
console.log('PASS: native recipe requirements preserve their configuration boundary.');
