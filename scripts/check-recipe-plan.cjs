const assert = require('node:assert/strict');
const { calculate, groupPurchases, checkBuilding } = require('../assets/js/recipe-plan.js');
const { recipes } = require('../data/build-recipes.json');

// Helper copy belongs beside its action, not in repeated disclaimer paragraphs.
for (const locale of ['', 'zh/']) {
  const page = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', locale, 'tools/ranch-checklist.html'), 'utf8');
  assert.ok(/data-plan-search[^>]*role="combobox"/.test(page), 'Recipe search must also expose the selectable suggestions, not a separate full-height native menu');
  assert.ok(/id="recipe-plan-query"[^>]*aria-controls="recipe-plan-options"/.test(page) && /id="recipe-plan-options" role="listbox"/.test(page), 'Recipe search announces its own suggestions');
  assert.ok(!/<select[^>]*data-plan-select/.test(page), 'Do not restore the unbounded second recipe menu');
  for (const marker of ['data-plan-save-note', 'data-plan-recipe-note']) {
    const text = page.match(new RegExp(`<p[^>]*${marker}[^>]*>([\\s\\S]*?)<\\/p>`))?.[1].replace(/<[^>]+>/g, '').trim();
    assert.ok(text, `${locale || 'en/'} ${marker}: retain necessary guidance`);
    assert.ok(text.length <= (locale ? 45 : 110), `${locale || 'en/'} ${marker}: use one short sentence`);
  }
  assert.doesNotMatch(page, /不包含历史建筑目标|not historical building targets|不保证当前库存，也不代表完整售价|not guaranteed stock or the full purchase price/,
    'Use contextual stock/price and unlock guidance instead of repeated defensive copy');
}

// Two different builds share one wood requirement, not two independent stockpiles.
const result = calculate(recipes, {
  prop_Outdoor_Well: 1,
  wood_Fence_Country_T1: 3
}, { ressource_wood: 6 });
assert.equal(result.valid, true);
assert.deepEqual(result.materials.find(row => row.id === 'ressource_wood'), {
  id: 'ressource_wood', required: 20, owned: 6, missing: 14
});
assert.equal(result.materials.find(row => row.id === 'ressource_rock_simple').required, 20);
assert.equal(result.materials.find(row => row.id === 'ressource_straw').required, 5);
// A shared shopping list groups shortages, never the full recipe requirement.
const offers = require('../data/build-shops.json').offers;
// One building is a separate shop-condition check, never a recipe multiplier.
const coopId = 'building-store-allthetime-Custum_Barn_Weak_Small';
const coop = checkBuilding(offers, coopId, { ressource_wood: 6 });
assert.equal(coop.valid, true);
assert.deepEqual(coop.materials.find(row => row.id === 'ressource_wood'), {
  id: 'ressource_wood', required: 20, owned: 6, missing: 14
});
assert.equal(coop.materials.find(row => row.id === 'ressource_rock_simple').required, 15);
assert.equal(coop.materials.find(row => row.id === 'ressource_straw').required, 15);
assert.deepEqual(checkBuilding(offers, '', {}).materials, []);
assert.equal(checkBuilding(offers, 'invented', {}).valid, false);
assert.equal(checkBuilding(offers, 'building-store-allthetime-ressource_wood', {}).valid, false);
assert.equal(checkBuilding(offers, coopId, { ressource_wood: '' }).valid, false);
assert.equal(checkBuilding(offers, coopId, { ressource_wood: 50 }).materials.find(row => row.id === 'ressource_wood').missing, 0);
const shopping = groupPurchases(result, offers, {});
const builder = shopping.groups.find(group => group.shopId === 'building-store');
assert.equal(builder.items.find(item => item.id === 'ressource_wood').missing, 14);
assert.equal(builder.items.find(item => item.id === 'ressource_rock_simple').missing, 20);
const hayRows = shopping.groups.flatMap(group => group.items).filter(item => item.id === 'ressource_straw');
assert.equal(hayRows.length, 1, 'Alternative sellers must not duplicate the purchase');
assert.equal(hayRows[0].missing, 5);
// Change the seller without changing stock, quantities or unrelated purchases.
const cattleHay = offers.find(offer => offer.itemId === 'ressource_straw' && offer.shopId === 'livestock-store');
const switched = groupPurchases(result, offers, { ressource_straw: cattleHay.id });
assert.equal(switched.groups.find(group => group.shopId === 'livestock-store').items[0].missing, 5);
assert.ok(!switched.groups.some(group => group.shopId === 'poultry-store'));
assert.deepEqual(switched.groups.find(group => group.shopId === 'building-store'), builder);
assert.deepEqual(groupPurchases(result, offers, { ressource_straw: 'invented' }), shopping);
const sprinkler = calculate(recipes, { sprinkler_n1: 1 }, { ressource_wood: 5 });
const sprinklerShops = groupPurchases(sprinkler, offers, {});
assert.deepEqual(sprinklerShops.unresolved.map(item => item.id), ['ressource_coal']);
assert.ok(!sprinklerShops.groups.flatMap(group => group.items).some(item => item.id === 'ressource_wood'));
assert.deepEqual(groupPurchases(calculate(recipes, { sprinkler_n1: '' }, {}), offers, {}), {groups:[], unresolved:[]});
// Invalid edits must never leave a plausible but incomplete material total.
for (const count of ['', -1, 1.5, 1000]) {
  const invalid = calculate(recipes, { prop_Outdoor_Well: count }, {});
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.materials, []);
}
assert.equal(calculate(recipes, { invented_recipe: 1 }, {}).valid, false);
assert.equal(calculate(recipes, { prop_Outdoor_Well: 1 }, { ressource_wood: -1 }).valid, false);
assert.equal(calculate(recipes, { prop_Outdoor_Well: 1 }, { ressource_wood: 999999 }).materials.find(row => row.id === 'ressource_wood').missing, 0);
assert.deepEqual(calculate(recipes, { prop_Outdoor_Well: 0 }, {}).materials, []);
// The browser receives exactly the recipes from the maintained data source.
const fs = require('node:fs');
const path = require('node:path');
for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(__dirname, '..', prefix, 'tools/ranch-checklist.html'), 'utf8');
  const match = html.match(/<script type="application\/json" data-plan-data>([\s\S]*?)<\/script>/);
  assert.ok(match, 'The generated planner needs its source-backed data');
  const data = JSON.parse(match[1]);
  const sourceShops = require('../data/build-shops.json');
  const sourceBuildings = sourceShops.offers.filter(offer => offer.materials.length);
  assert.equal(sourceBuildings.length, 11);
  assert.deepEqual(data.buildings.map(item => item.id), sourceBuildings.map(item => item.id));
  for (const building of data.buildings) {
    const source = sourceBuildings.find(item => item.id === building.id);
    const named = sourceShops.items.find(item => item.id === source.itemId);
    assert.equal(building.name, named.name);
    assert.equal(building.zhName, named.zhName);
    assert.deepEqual(building.materials, source.materials);
    assert.equal(building.quest, source.questRequirements.length > 0);
    assert.ok(!data.recipes.some(item => item.id === source.itemId), 'Shop buildings must stay out of the crafting selection');
    const buildingPage = fs.readFileSync(path.join(__dirname, '..', prefix, 'guides/building-construction.html'), 'utf8');
    assert.ok(buildingPage.includes('?building=' + encodeURIComponent(source.id) + '#recipe-material-plan'));
  }
  for (const offer of data.offers) {
    const source = sourceShops.offers.find(item => item.id === offer.id);
    assert.equal(offer.itemId, source.itemId);
    assert.equal(offer.shopId, source.shopId);
    assert.equal(offer.season, source.season);
    assert.equal(offer.quest, source.questRequirements.length > 0);
    assert.ok(data.shops.some(shop => shop.id === offer.shopId));
    const shopPage = fs.readFileSync(path.join(__dirname, '..', prefix, 'guides/resources-and-materials.html'), 'utf8');
    assert.ok(shopPage.includes('id="offer-' + offer.id + '"'), 'Every shop link needs an existing offer anchor');
  }
  assert.equal(data.offers.filter(offer => offer.itemId === 'ressource_straw').length, 2);
  assert.equal(data.offers.filter(offer => offer.itemId === 'ressource_coal').length, 0);
  assert.deepEqual(data.recipes.map(recipe => recipe.id), recipes.map(recipe => recipe.id));
  // Every full recipe opens that exact recipe in the same-language planner.
  const craftingPage = fs.readFileSync(path.join(__dirname, '..', prefix, 'guides/crafting-guide.html'), 'utf8');
  const craftingRows = Array.from(craftingPage.matchAll(/<tr\b[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?<\/tr>/g),
    match => ({ id: match[1], html: match[0] }));
  const recipeRows = craftingRows.filter(row => row.id.startsWith('recipe-'));
  assert.deepEqual(recipeRows.map(row => row.id).sort(), recipes.map(recipe => 'recipe-' + recipe.id).sort(),
    `${prefix || 'en/'} full crafting guide must contain every recipe row exactly once`);
  for (const recipe of recipes) {
    const row = recipeRows.find(row => row.id === 'recipe-' + recipe.id);
    const plannerLinks = Array.from(row.html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g), match => match[1])
      .filter(href => /[?&]recipe=/.test(href));
    assert.deepEqual(plannerLinks, [`/${prefix}tools/ranch-checklist?recipe=${encodeURIComponent(recipe.id)}#recipe-material-plan`],
      `${prefix || 'en/'} ${recipe.id} must link to its own recipe, not a different ID or language`);
  }
  const recipeIds = new Set(recipes.map(recipe => recipe.id));
  const nonRecipeTools = craftingRows.filter(row => row.id.startsWith('tool-') && !recipeIds.has(row.id.slice(5)));
  assert.ok(nonRecipeTools.length, 'The full guide must retain non-recipe tool rows for this regression');
  for (const row of nonRecipeTools) {
    assert.doesNotMatch(row.html, /href="[^"]*[?&]recipe=/,
      `${prefix || 'en/'} ${row.id} must not invent a recipe-planner entry`);
  }
  for (const recipe of data.recipes) {
    const source = recipes.find(item => item.id === recipe.id);
    assert.deepEqual(recipe.materials, source.materials);
    assert.equal(recipe.workbench, source.workbench);
    assert.equal(recipe.quest, source.questRequirements.length > 0);
  }
  for (const ingredient of data.ingredients) {
    const [route, id] = ingredient.href.split('#');
    const materialPage = fs.readFileSync(path.join(__dirname, '..', route + '.html'), 'utf8');
    assert.ok(materialPage.includes('id="' + id + '"'), 'Supply link must land on a real material');
    if (ingredient.icon) assert.ok(fs.existsSync(path.join(__dirname, '..', ingredient.icon)));
  }
}
console.log('PASS: combined recipe materials deduct shared stock once.');

// Exercise the shipped controller with a small DOM/storage boundary, not a second
// implementation of its filtering, keyboard or persistence rules.
function bootPicker(locale = '', initial = {}, search = '') {
  const vm = require('node:vm');
  const html = fs.readFileSync(path.join(__dirname, '..', locale, 'tools/ranch-checklist.html'), 'utf8');
  const data = JSON.parse(html.match(/data-plan-data>([\s\S]*?)<\/script>/)[1]);
  const elements = new Map();
  let active = null;
  function element(attrs = {}) {
    const node = {
      attrs, value: attrs.value || '', textContent: '', hidden: false, disabled: false,
      dataset: Object.fromEntries(Object.entries(attrs).filter(([k]) => k.startsWith('data-')).map(([k,v]) => [k.slice(5).replace(/-([a-z])/g, (_,c) => c.toUpperCase()),v])),
      get id() { return attrs.id || ''; },
      listeners: {}, classList: { add() {} }, innerHTML: '',
      setAttribute(k,v) { attrs[k] = String(v); }, getAttribute(k) { return attrs[k] ?? null; },
      removeAttribute(k) { delete attrs[k]; }, focus() { active = node; },
      contains(other) { return other === node; }, scrollIntoView() {},
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
      fire(type, event = {}) { for (const fn of this.listeners[type] || []) fn({target:node, preventDefault() {}, ...event}); },
      querySelectorAll(selector) {
        const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
        const rows = [];
        for (const tag of this.innerHTML.matchAll(/<[^/!][^>]*>/g)) {
          const found = Object.fromEntries([...tag[0].matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(m => [m[1],m[2] || '']));
          if (attribute && Object.hasOwn(found, attribute[1]) && (attribute[2] === undefined || found[attribute[1]] === attribute[2])) rows.push(element(found));
        }
        return rows;
      },
      querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    };
    return node;
  }
  for (const tag of html.matchAll(/<[^/!][^>]*\bdata-[^>]*>/g)) {
    const attrs = Object.fromEntries([...tag[0].matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(m => [m[1],m[2] || '']));
    const node = element(attrs);
    for (const key of Object.keys(attrs).filter(k => k.startsWith('data-'))) if (!elements.has('['+key+']')) elements.set('['+key+']',node);
  }
  const modes = ['recipes','building'].map(value => element({'data-plan-mode':value}));
  const selection = elements.get('[data-plan-selections]');
  const supplies = elements.get('[data-plan-supplies]');
  const scope = {
    querySelector(selector) {
      if (selector === '[data-plan-data]') return {textContent:JSON.stringify(data)};
      return elements.get(selector) || selection.querySelector(selector) || supplies.querySelector(selector);
    },
    querySelectorAll(selector) {
      if (selector === '[data-plan-mode]') return modes;
      // Supply rows need only exist after a target is added; their individual
      // fields are derived from the real controller's rendered row, below.
      return [...selection.querySelectorAll(selector), ...supplies.querySelectorAll(selector)].map(node => {
        if (selector === '[data-supply-row]') {
          const row = supplies.innerHTML.match(new RegExp('<li[^>]*data-supply-row="'+node.dataset.supplyRow+'"[^>]*>([\\s\\S]*?)<\\/li>'))?.[1] || '';
          node.innerHTML = row;
        }
        return node;
      });
    }
  };
  const store = {...initial};
  const location = {href:'https://theranchersguide.com/'+locale+'tools/ranch-checklist'+search};
  const context = vm.createContext({ URL, document:{
    documentElement:{lang:locale ? 'zh-CN':'en'}, querySelectorAll: () => [scope],
    addEventListener() {}
  }, window:{RanchRecipePlanText:require('../assets/js/recipe-plan-text.js')}, location,
  history:{state:null,replaceState(_state,_title,url) {location.href=String(url);}},
  localStorage:{getItem:k=>store[k] ?? null,setItem:(k,v)=>{store[k]=String(v);}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/recipe-plan.js'),'utf8'),context);
  return {scope,store,modes,query:elements.get('[data-plan-search]'),selected:elements.get('[data-plan-select]'),
    options:elements.get('[data-plan-options]'),results:elements.get('[data-plan-results]'),
    add:elements.get('[data-plan-add]'),form:elements.get('[data-plan-picker]'),active:()=>active};
}
for (const locale of ['', 'zh/']) {
  const p = bootPicker(locale);
  p.query.value = locale ? '水井' : 'well';
  p.query.fire('input');
  assert.equal(p.query.getAttribute('aria-expanded'),'true');
  assert.equal(p.options.querySelectorAll('[role="option"]').length,1);
  p.query.fire('keydown',{key:'Enter'});
  assert.equal(p.selected.value,'prop_Outdoor_Well','Enter chooses the actual matching recipe ID');
  assert.equal(p.results.hidden,true);
  p.form.fire('submit');
  const saved = JSON.parse(p.store['ranchers-guide-recipe-plan-v1']);
  assert.equal(saved.selections.prop_Outdoor_Well,1,'Add uses the selected recipe, not the neighboring option');
  p.form.fire('submit');
  assert.equal(JSON.parse(p.store['ranchers-guide-recipe-plan-v1']).selections.prop_Outdoor_Well,1,'Repeated Add never silently increments a selected recipe');
  assert.equal(p.active().dataset.selectedCount,'prop_Outdoor_Well','Duplicate Add focuses its batch input');
  p.scope.querySelector('[data-plan-selections]').fire('input',{target:{dataset:{selectedCount:'prop_Outdoor_Well'},value:'3'}});
  p.scope.querySelector('[data-plan-supplies]').fire('input',{target:{dataset:{supplyOwned:'ressource_wood'},value:'6'}});
  p.scope.querySelector('[data-plan-selections]').fire('input',{target:{dataset:{selectedCount:'prop_Outdoor_Well'},value:''}});
  p.modes[1].fire('click');
  const building = p.scope.querySelector('[data-building-select]');
  building.value='building-store-allthetime-Custum_Barn_Weak_Small';
  building.fire('change');
  const restored=bootPicker(locale,p.store);
  const persisted=JSON.parse(restored.store['ranchers-guide-recipe-plan-v1']);
  assert.equal(Number(persisted.selections.prop_Outdoor_Well),3,'Building save preserves the other mode’s last valid recipe count');
  assert.equal(persisted.stock.ressource_wood,6,'Modes continue to share the same original material stock');
  p.modes[0].fire('click');
  p.query.value='';
  p.query.fire('input');
  p.query.fire('keydown',{key:'ArrowDown'});
  assert.equal(p.query.getAttribute('aria-activedescendant'),'recipe-plan-option-1');
  p.query.fire('keydown',{key:'ArrowUp'});
  assert.equal(p.query.getAttribute('aria-activedescendant'),'recipe-plan-option-0');
  p.query.fire('keydown',{key:'Tab'});
  assert.equal(p.results.hidden,true,'Tab closes without trapping keyboard focus');
  p.query.value='wood';
  p.query.fire('input');
  const firstWood=p.options.querySelectorAll('[role="option"]')[0].dataset.planOption;
  assert.match(recipes.find(recipe=>recipe.id===firstWood).name,/wood/i,'A name match precedes recipes that merely consume the searched material');
  p.query.value = 'zz-no-recipe';
  p.query.fire('input');
  p.query.fire('keydown',{key:'Enter'});
  assert.equal(p.add.disabled,true,'No match cannot add the previous selection');
  assert.equal(p.query.getAttribute('aria-activedescendant'),null);
  p.query.fire('keydown',{key:'Escape'});
  assert.equal(p.results.hidden,true,'Escape closes suggestions without modifying the plan');
  assert.equal(Number(JSON.parse(p.store['ranchers-guide-recipe-plan-v1']).selections.prop_Outdoor_Well),3);
  const linked = bootPicker(locale,p.store,'?recipe=wood_Fence_Country_T1');
  assert.equal(linked.selected.value,'wood_Fence_Country_T1','Deep-link selection is still exact and does not auto-add');
  assert.equal(JSON.parse(linked.store['ranchers-guide-recipe-plan-v1']).selections.wood_Fence_Country_T1,undefined);
}
console.log('PASS: bilingual shipped picker keyboard/add/duplicate/no-match/deep-link and last-valid mode persistence.');
