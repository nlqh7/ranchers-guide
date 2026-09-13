const assert = require('node:assert/strict');
const { calculate, groupPurchases, checkBuilding } = require('../assets/js/recipe-plan.js');
const { recipes } = require('../data/build-recipes.json');

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
