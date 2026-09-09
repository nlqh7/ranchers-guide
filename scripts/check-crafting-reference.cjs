const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Adjustable wall plans sum different recipe quantities, including zero and invalid inputs.
{
  const rows = [[4, 2, 3], [1, 2, 2], [1, 2, 3]].map(([count, stone, wood]) => {
    const input = { value: String(count), setAttribute() {}, addEventListener(_, handler) { this.update = handler; } };
    const ingredients = [stone, wood].map((base, i) => ({ dataset: { planIngredient: i ? 'wood' : 'stone', planBase: String(base) } }));
    return { input, querySelector() { return input; }, querySelectorAll() { return ingredients; } };
  });
  const totals = ['stone', 'wood'].map(id => ({ dataset: { planTotalValue: id }, textContent: '' }));
  const error = { hidden: true };
  const stockError = { hidden: true };
  const stocks = ['stone', 'wood'].map(id => ({ dataset: { planOwned: id }, value: '0', setAttribute() {}, addEventListener(_, handler) { this.update = handler; } }));
  const shortages = ['stone', 'wood'].map(id => ({ dataset: { planMissing: id }, textContent: '' }));
  const surface = { querySelector(selector) { return selector === '[data-plan-stock-error]' ? stockError : error; }, querySelectorAll(selector) { return ({ '[data-plan-row]': rows, '[data-plan-total-value]': totals, '[data-plan-owned]': stocks, '[data-plan-missing]': shortages })[selector] || []; } };
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../assets/js/crafting-reference.js'), 'utf8'), {
    document: { querySelectorAll(selector) { return selector === '[data-wall-plan]' ? [surface] : []; } }
  });
  assert.deepEqual(totals.map(t => t.textContent), ['12', '17']);
  assert.deepEqual(shortages.map(t => t.textContent), ['12', '17']);
  stocks[0].value = '5'; stocks[1].value = '30'; stocks[0].update();
  assert.deepEqual(shortages.map(t => t.textContent), ['7', '0']);
  stocks[0].value = '-1'; stocks[0].update();
  assert.equal(stockError.hidden, false);
  assert.deepEqual(shortages.map(t => t.textContent), ['—', '—']);
  stocks[0].value = '0'; stocks[0].update();
  rows[0].input.value = '2'; rows[0].input.update();
  assert.deepEqual(totals.map(t => t.textContent), ['8', '11']);
  rows.forEach(row => { row.input.value = '0'; }); rows[0].input.update();
  assert.deepEqual(totals.map(t => t.textContent), ['0', '0']);
  rows[0].input.value = '1.5'; rows[0].input.update();
  assert.equal(error.hidden, false);
  assert.deepEqual(totals.map(t => t.textContent), ['—', '—']);
}

// A copied URL or a browser return restores the player's recipe preparation context.
{
  const location = new URL('https://example.test/guides/crafting-guide?q=Well&category=farming&batches=3&from=guide');
  const events = {};
  const field = value => ({ value, addEventListener(name, handler) { this[name] = handler; }, setAttribute() {} });
  const query = field('');
  const category = Object.assign(field('all'), { options: [{ value: 'all' }, { value: 'farming' }] });
  const batches = field('1');
  const amount = { dataset: { recipeBaseQuantity: '4' } };
  const empty = {};
  const surface = {
    querySelector(selector) { return ({ '[data-recipe-query]': query, '[data-recipe-category]': category, '[data-recipe-batches]': batches, '[data-recipe-empty]': empty, '[data-recipe-batch-error]': empty })[selector] || null; },
    querySelectorAll(selector) { return selector === '[data-recipe-base-quantity]' ? [amount] : []; }
  };
  let writes = 0;
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../assets/js/crafting-reference.js'), 'utf8'), {
    document: { querySelectorAll(selector) { return selector === '[data-crafting-reference]' ? [surface] : []; }, getElementById() { return null; } },
    location, URL, window: { addEventListener(name, handler) { events[name] = handler; } },
    history: { state: { retained: true }, replaceState(state, _, href) { assert.equal(state.retained, true); location.href = href; writes++; } }
  });
  assert.equal(query.value, 'Well');
  assert.equal(category.value, 'farming');
  assert.equal(batches.value, '3');
  assert.equal(amount.textContent, '× 12');
  query.value = 'Tent'; query.input();
  assert.equal(location.searchParams.get('q'), 'Tent');
  assert.equal(location.searchParams.get('from'), 'guide');
  assert.equal(writes, 1, 'Typing should replace the current entry, not push history');
  location.search = '?category=bad&batches=1.5'; events.popstate();
  assert.equal(query.value, '');
  assert.equal(category.value, 'all');
  assert.equal(batches.value, '1');
  assert.equal(amount.textContent, '× 4');
}

// Players can combine item/material terms and recover from an empty search.
{
  const query = { value: '', addEventListener(_, handler) { this.update = handler; }, focus() { this.focused = true; } };
  const category = { value: 'all', options: [{ value: 'all' }], addEventListener(_, handler) { this.update = handler; } };
  const reset = { hidden: true, addEventListener(_, handler) { this.click = handler; } };
  const count = { textContent: '' };
  const empty = { hidden: true };
  const rows = ['Well 水井 Stone 石头 Wood', 'Tent 帐篷 Stone 石头'].map(query => ({ dataset: { query }, hidden: false }));
  const group = { dataset: { recipeGroup: 'farming' }, querySelectorAll() { return rows; } };
  const surface = {
    dataset: { resultLabel: '{count} results' },
    querySelector(selector) { return ({ '[data-recipe-query]': query, '[data-recipe-category]': category, '[data-recipe-reset]': reset, '[data-recipe-count]': count, '[data-recipe-empty]': empty })[selector] || null; },
    querySelectorAll(selector) { return selector === '[data-recipe-group]' ? [group] : []; }
  };
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../assets/js/crafting-reference.js'), 'utf8'), {
    document: { querySelectorAll(selector) { return selector === '[data-crafting-reference]' ? [surface] : []; }, getElementById() { return null; } },
    location: new URL('https://example.test/'), URL, history: { replaceState() {} }, window: { addEventListener() {} }
  });
  query.value = '水井 石头'; query.update();
  assert.equal(rows[0].hidden, false, 'Separate item/material keywords should match together');
  assert.equal(rows[1].hidden, true);
  assert.equal(count.textContent, '1 results');
  query.value = 'nothing'; query.update();
  assert.equal(empty.hidden, false);
  category.value = 'tools'; category.update();
  reset.click();
  assert.equal(query.value, '');
  assert.equal(category.value, 'all');
  assert.equal(query.focused, true);
  assert.equal(empty.hidden, true);
  assert.equal(count.textContent, '2 results');
  assert.equal(reset.hidden, true);
}

// Run the browser multiplier against a small DOM surface, without altering recipe data.
{
  const batches = { value: '1', setAttribute() {}, addEventListener(_, handler) { this.update = handler; } };
  const amounts = [2, 7].map(value => ({ dataset: { recipeBaseQuantity: String(value) }, textContent: '' }));
  const error = { hidden: true };
  const field = { value: '', options: [{ value: 'all' }], addEventListener() {} };
  const surface = {
    querySelector(selector) { return selector === '[data-recipe-batches]' ? batches : selector === '[data-recipe-batch-error]' ? error : ['[data-recipe-reset]', '[data-recipe-count]'].includes(selector) ? null : field; },
    querySelectorAll(selector) { return selector === '[data-recipe-base-quantity]' ? amounts : []; }
  };
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../assets/js/crafting-reference.js'), 'utf8'), {
    document: { querySelectorAll(selector) { return selector === '[data-crafting-reference]' ? [surface] : []; }, getElementById() { return null; } },
    location: new URL('https://example.test/'), URL, history: { replaceState() {} }, window: { addEventListener() {} }
  });
  batches.value = '3'; batches.update();
  require('node:assert/strict').deepEqual(amounts.map(item => item.textContent), ['× 6', '× 21']);
  for (const invalid of ['', '-1', '1.5', '1000']) {
    batches.value = invalid; batches.update();
    require('node:assert/strict').equal(error.hidden, false);
    require('node:assert/strict').equal(amounts[0].textContent, '—');
  }
  batches.value = '1'; batches.update();
  require('node:assert/strict').equal(error.hidden, true);
  require('node:assert/strict').equal(amounts[0].textContent, '× 2');
}
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'data/build-recipes.json');
assert.ok(fs.existsSync(file), 'Native recipes must reach website generators, not remain in the private archive');
const data = JSON.parse(fs.readFileSync(file));
assert.equal(data.recipes.length, 162);
for (const prefix of ['', 'zh/']) {
  for (const route of ['guides/building-construction.html', 'tools/ranch-checklist.html']) {
    const page = fs.readFileSync(path.join(root, prefix, route), 'utf8');
    assert.ok(page.includes('data-plan-total="ressource_rock_simple:12"'), 'Wall plan requires 12 Stone');
    assert.ok(page.includes('data-plan-total="ressource_wood:17"'), 'Wall plan requires 17 Wood Logs');
    assert.ok(page.includes(prefix ? '不是完整房屋清单' : 'not a complete house'), 'A partial wall example must not promise a complete house');
  }
}
assert.equal(new Set(data.recipes.map(row => row.id)).size, 162);
const tent = data.recipes.find(row => row.id === 'red_tent');
assert.deepEqual(tent.materials, [{id:'ressource_rock_simple', quantity:4}, {id:'ressource_wood', quantity:5}]);
assert.equal(tent.workbench, false);
assert.equal(data.evidenceLevel, 'build-observed');
assert.equal(data.validity, 'unknown');
assert.deepEqual(data.tools.find(t=>t.id==='tools_axe_metal').energy, {consumption:4,supply:0});
assert.deepEqual(data.toolSourceConfiguration.shared,{classification:'OTHER',rarity:'Bronze',droppable:null});
assert.equal(data.toolSourceConfiguration.types.Tools.length,11);
assert.equal(data.toolSourceConfiguration.types.Weapon.length,7);
assert.deepEqual(data.toolSourceConfiguration.equippable,{default:true,exceptions:{generic_cargo:false}});
assert.deepEqual(data.toolSourceConfiguration.sellableFlag,{default:true,exceptions:{generic_cargo:false,tools_seed_bag:false,tools_fertilizer_box:false}});
assert.equal(Object.keys(data.toolSourceConfiguration.sourceIntents).length,6);
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
    const sourceType=data.toolSourceConfiguration.types.Weapon.includes(tool.id)?'Weapon':'Tools';
    assert.ok(row.includes(`${prefix?'来源类型':'Source type'}: ${sourceType}`));
    assert.ok(row.includes(`${prefix?'来源分类':'Source classification'}: OTHER`));
    assert.ok(row.includes(`${prefix?'来源稀有度':'Source rarity'}: Bronze`));
    assert.ok(row.includes(prefix?'可丢弃字段：未收录':'Droppable field: not listed'));
    const expectedEquip=tool.id==='generic_cargo'?false:true;
    const expectedSell=['generic_cargo','tools_seed_bag','tools_fertilizer_box'].includes(tool.id)?false:true;
    assert.ok(row.includes(`${prefix?'可装备':'Equippable'}: ${expectedEquip?(prefix?'是':'Yes'):(prefix?'否':'No')}`));
    assert.ok(row.includes(`${prefix?'可出售标志':'Sellable flag'}: ${expectedSell?(prefix?'是':'Yes'):(prefix?'否':'No')}`));
    const intent=data.toolSourceConfiguration.sourceIntents[tool.id];
    if(intent) {
      assert.ok(row.includes(prefix?intent.zh:intent.en));
      assert.ok(row.includes(prefix?'来源用途线索，不是运行时验证':'Source-use clue, not runtime verification'));
    }
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
  assert.ok(!Object.hasOwn(row, 'rawDescription'), 'Raw developer descriptions stay private');
}
console.log('PASS: native recipe requirements preserve their configuration boundary.');
