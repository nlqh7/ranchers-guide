const assert = require('node:assert/strict');
const { calculate, groupPurchases } = require('../assets/js/recipe-plan.js');
const { recipes } = require('../data/build-recipes.json');
const { items } = require('../data/build-resources.json');
const { formatSummary } = require('../assets/js/recipe-plan-text.js');

const selections = { prop_Outdoor_Well: 1, wood_Fence_Country_T1: 3 };
const result = calculate(recipes, selections, { ressource_wood: 6 });
assert.equal(result.valid, true);
assert.deepEqual(result.materials.find(item => item.id === 'ressource_wood'), {
  id: 'ressource_wood', required: 20, owned: 6, missing: 14
});
const plan = {
  mode: 'recipes',
  targets: Object.entries(selections).map(([id, count]) => ({
    name: recipes.find(recipe => recipe.id === id).name, count
  })),
  materials: result.materials.map(item => ({
    ...item, name: items.find(resource => resource.id === item.id).name
  })),
  shops: [],
  unlisted: []
};
const text = formatSummary(plan);
assert.ok(text.includes('- Water Well × 1 batch'));
assert.ok(text.includes(`- ${plan.targets[1].name} × 3 batches`));
assert.ok(text.includes('- Wood Log: 14 missing (required 20, on hand 6)'),
  'Render the calculated shortage directly, without subtracting shared stock twice');

const zhPlan = {
  ...plan,
  targets: [{ name: '水井', count: 1 }, { name: '木围栏', count: 3 }],
  materials: [{ name: '原木', required: 20, owned: 6, missing: 14 }]
};
const zhText = formatSummary(zhPlan, true);
assert.ok(zhText.includes('- 木围栏 × 3 份'));
assert.ok(zhText.includes('- 原木：还缺 14（需要 20，已有 6）'));

const building = { ...zhPlan, mode: 'building', targets: [{ name: 'Chicken Coop', count: 9 }] };
for (const zh of [false, true]) {
  const buildingText = formatSummary(building, zh);
  assert.ok(buildingText.split('\n').includes('- Chicken Coop'));
  assert.ok(!buildingText.includes('× 9'), 'Building targets are not recipe batches');
  assert.ok(buildingText.includes(zh ? '仅核对材料条件，不是售价或已解锁保证。' : 'Material requirements only; not a price quote or a guarantee of unlock.'));
  const complete = formatSummary({ ...building, materials: [{ name: 'Wood Log', required: 20, owned: 25, missing: 0 }] }, zh);
  assert.ok(complete.includes(zh ? '材料已齐全，无缺料。' : 'All materials covered; nothing missing.'));
  assert.ok(!complete.includes('Wood Log'), 'Covered materials stay out of the shortage list');
}

const { offers, shops } = require('../data/build-shops.json');
const sprinkler = calculate(recipes, { sprinkler_n1: 1 }, { ressource_wood: 5 });
const purchases = groupPurchases(sprinkler, offers, {});
const materialName = id => items.find(item => item.id === id).name;
const shoppingPlan = {
  mode: 'recipes', targets: [{ name: 'Basic Sprinkler', count: 1 }],
  materials: sprinkler.materials.map(item => ({ ...item, name: materialName(item.id) })),
  shops: purchases.groups.map(group => ({ name: shops.find(shop => shop.id === group.shopId).name,
    items: group.items.map(item => ({ name: materialName(item.id), missing: item.missing })) })),
  unlisted: purchases.unresolved.map(item => ({ name: materialName(item.id), missing: item.missing }))
};
const before = JSON.stringify(shoppingPlan);
for (const zh of [false, true]) {
  const summary = formatSummary(shoppingPlan, zh);
  const shopSection = summary.split(zh ? '已选商店：' : 'Selected shops:')[1].split(zh ? '未收录商店：' : 'Not in shop listings:')[0];
  shoppingPlan.shops.flatMap(shop => shop.items).forEach(item => {
    assert.equal(shopSection.split(`${item.name} × ${item.missing}`).length - 1, 1,
      'Each shortage appears under exactly one selected shop');
  });
  assert.ok(summary.includes((zh ? '未收录商店：\n- ' : 'Not in shop listings:\n- ') + `${materialName('ressource_coal')} × 10`));
  assert.ok(summary.includes(zh ? '商店来自已收录列表，不保证现货或价格。' : 'Shop choices come from listings; stock and prices are not guaranteed.'));
  assert.ok(!summary.includes('Wood Log'), 'A covered ingredient is not a purchase');
}
assert.equal(JSON.stringify(shoppingPlan), before, 'Formatting must not mutate the plan');

const vm = require('node:vm');
const fs = require('node:fs');
const browser = vm.createContext({});
vm.runInContext(fs.readFileSync(require.resolve('../assets/js/recipe-plan-text.js'), 'utf8'), browser);
assert.equal(browser.RanchRecipePlanText.formatSummary(plan), text,
  'The browser API works without DOM, storage or clipboard objects');

console.log('Recipe plan text checks passed.');
