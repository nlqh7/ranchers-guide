const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/animals.json');
const searchCore = require('../assets/js/search-core.js');
const ref = data.nativeAnimalCareReference;

function detailsDepthAt(html, position) {
  let depth = 0;
  for (const match of html.slice(0, position).matchAll(/<\/?details\b[^>]*>/g)) depth += match[0].startsWith('</') ? -1 : 1;
  return depth;
}

assert.ok(ref, 'animal data must expose current-build diet and delivery references');
assert.equal(ref.build, '0.8.10.842');
assert.equal(ref.steamBuild, '24847725');
assert.equal(ref.evidenceLevel, 'build-observed');
assert.equal(ref.validity, 'unknown', 'serialized configuration is not runtime-tested behavior');

const dietSource = data.sources['owned-build-animal-diets'];
assert.equal(dietSource.kind, 'first-hand-build-resource');
assert.equal(dietSource.asset, 'resources.assets');
assert.equal(dietSource.objects.length, 6);
for (const object of dietSource.objects) {
  assert.ok(Number.isInteger(object.pathId));
  assert.match(object.rawSha256, /^[0-9a-f]{64}$/);
  assert.ok(object.name);
}

assert.deepEqual(ref.foods, [
  { id: 'ressource_straw', name: 'Hay', zhName: '干草' },
  { id: 'vegetable_green_luttuce_normal', name: 'Green Lettuce', zhName: '绿叶生菜' },
  { id: 'vegetable_red_luttuce_normal', name: 'Green Salad', zhName: '绿色沙拉菜' },
  { id: 'vegetable_carotte_normal', name: 'Carotte', zhName: '胡萝卜' },
  { id: 'farm_water_1L', name: 'Water', zhName: '水' },
]);

const diets = Object.fromEntries(ref.diets.map(diet => [diet.id, diet]));
assert.deepEqual(Object.keys(diets), ['chicken', 'cow', 'goat', 'rabbit', 'ram']);
assert.deepEqual(diets.chicken.foodIds, ['ressource_straw']);
assert.deepEqual(diets.cow.foodIds, ['ressource_straw']);
assert.deepEqual(diets.goat.foodIds, ['ressource_straw', 'vegetable_green_luttuce_normal', 'vegetable_red_luttuce_normal', 'vegetable_carotte_normal']);
assert.deepEqual(diets.rabbit.foodIds, ['vegetable_red_luttuce_normal', 'vegetable_green_luttuce_normal', 'vegetable_carotte_normal']);
assert.deepEqual(diets.ram.foodIds, ['ressource_straw']);
assert.ok(ref.diets.every(diet => diet.waterIds.length === 1 && diet.waterIds[0] === 'farm_water_1L'));
assert.deepEqual(diets.ram.entryIds, ['animal_ram_male'], 'RAM source must not be expanded to every sheep entry');

assert.equal(ref.delivery.titleSourceKey, 'GT/Animals_Pickable_FromDeliveryToBarn_Title');
assert.deepEqual(ref.delivery.steps.map(step => step.sourceKey), [
  'GT/Animals_Pickable_FromDeliveryToBarn_DeliveryZone',
  'GT/Animals_Pickable_FromDeliveryToBarn_GetInVec',
  'GT/Animals_Pickable_FromDeliveryToBarn_GetOutVec',
  'GT/Animals_Pickable_FromDeliveryToBarn_AssociateWithBarn',
]);
assert.ok(ref.delivery.steps.every(step => step.text && step.zhText));
assert.doesNotMatch(JSON.stringify({ diets: ref.diets, delivery: ref.delivery }), /quantity|perDay|dailyConsumption|seller|price/i, 'care records must not invent quantities, cadence, sellers or prices');

for (const animalId of ['chicken', 'cow', 'goat', 'rabbit']) {
  const animal = data.species.find(entry => entry.id === animalId);
  assert.ok(animal.lookupFacts?.some(fact => fact.nativeCareId === `${animalId}-feed` && fact.evidenceLevel === 'build-observed' && fact.sourceIds.includes('owned-build-animal-diets')), `${animalId}: current-build feed lookup missing`);
  assert.ok(animal.lookupFacts?.some(fact => fact.nativeCareId === `${animalId}-water` && fact.evidenceLevel === 'build-observed' && fact.sourceIds.includes('owned-build-animal-diets')), `${animalId}: current-build water lookup missing`);
}
const sheep = data.species.find(entry => entry.id === 'sheep');
assert.ok(sheep.lookupFacts?.some(fact => /Ram/.test(fact.text) && /not establish the ewe/.test(fact.text)), 'sheep lookup must preserve the ram-only boundary');

for (const locale of ['en', 'zh']) {
  const prefix = locale === 'zh' ? 'zh/' : '';
  const html = fs.readFileSync(path.join(root, prefix, 'database/animals.html'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const knowledgeIndex = JSON.parse(fs.readFileSync(path.join(root, prefix, 'knowledge-index.json'), 'utf8'));
  assert.match(html, /id="bringing-small-animals-home"[^>]*data-search-entry/, `${locale}: delivery route must be directly searchable`);
  assert.match(html, /data-animal-delivery-reference/, `${locale}: delivery route must be visible`);
  const deliveryPosition = html.indexOf('data-animal-delivery-reference');
  assert.equal(detailsDepthAt(html, deliveryPosition), 0, `${locale}: delivery route must not be hidden inside a collapsed disclosure`);
  for (const step of ref.delivery.steps) assert.ok(html.includes(locale === 'zh' ? step.zhText : step.text));
  for (const diet of ref.diets) {
    const id = diet.id === 'ram' ? 'ram' : diet.id;
    assert.match(html, new RegExp(`id="${id}-diet"[^>]*data-search-entry`), `${locale}: ${id} diet needs a labeled search destination`);
  }
  assert.match(html, locale === 'zh' ? /配置不能证明食量、喂食频率、商店库存或产出/ : /does not establish quantity, feeding frequency, shop stock or output/);
  const deliveryQuery = locale === 'zh' ? '带小动物回家' : 'bringing small animals home';
  assert.equal(searchCore.searchDocuments(searchIndex, deliveryQuery, 5)[0]?.url, `/${prefix}database/animals#bringing-small-animals-home`, `${locale}: delivery query must open the action path`);
  const rabbitQuery = locale === 'zh' ? '兔子 饲料' : 'rabbit diet';
  assert.equal(searchCore.searchDocuments(searchIndex, rabbitQuery, 5)[0]?.url, `/${prefix}database/animals#rabbit-diet`, `${locale}: rabbit diet query must open its source-backed card`);
  for (const animalId of ['chicken', 'cow', 'goat', 'sheep', 'rabbit']) {
    const entity = knowledgeIndex.entities.find(entry => entry.id === `animal:${animalId}`);
    assert.ok(entity.facts.some(fact => fact.evidenceLevel === 'build-observed' && fact.sourceIds.includes('owned-build-animal-diets')), `${locale}: ${animalId} knowledge dossier needs the diet configuration`);
  }
}

console.log('PASS: current-build animal diets and small-animal delivery route are source-bounded and visible in both locales.');
