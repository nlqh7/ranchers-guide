const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'data/build-shops.json');
assert.ok(fs.existsSync(file), 'Shop configuration must be applied to public lookup data');
const data = JSON.parse(fs.readFileSync(file));
const seeds = require('../data/build-seeds.json').items;
const produce = require('../data/build-produce.json').items;
const placeables = require('../data/build-placeables.json').items;
const recipes = require('../data/build-recipes.json').recipes;
const miscItems = require('../data/build-misc-items.json').items;
const vehicles = require('../data/build-vehicles.json').items;
assert.equal(data.shops.length, 8);
assert.equal(data.offers.length, 139);
assert.equal(new Set(data.offers.map(o => o.id)).size, 139);
assert.equal(data.evidenceLevel, 'build-observed');
assert.equal(data.validity, 'unknown');
assert.deepEqual(data.unresolvedReferences.map(entry=>entry.id),['VIC_LadiesBike-02','VIC_DirtBike_01','VIC_DirtBike_02','VIC_CamperVan_04','VIC_4x4_01']);
for(const entry of data.unresolvedReferences) {
  assert.equal(entry.i2Name,false);
  assert.equal(entry.vehicleDefinition,false);
  assert.equal(entry.spriteAsset,true);
  assert.equal(entry.itemGraphicHeader,['VIC_CamperVan_04','VIC_4x4_01'].includes(entry.id));
  assert.equal(entry.disposition,'id-only-unresolved');
}
const buildings = data.offers.filter(o => o.materials.length);
assert.equal(buildings.length, 11);
const small = buildings.find(o => o.itemId === 'Custum_Barn_Weak_Small');
assert.deepEqual(small.materials, [{id:'ressource_rock_simple',quantity:15},{id:'ressource_wood',quantity:20},{id:'ressource_straw',quantity:15}]);
for (const offer of data.offers) {
  assert.ok(data.items.some(i => i.id === offer.itemId));
  assert.match(data.sources[offer.sourceId].rawSha256, /^[a-f0-9]{64}$/);
  assert.ok(!Object.hasOwn(offer, 'price'));
}
for (const prefix of ['', 'zh/']) {
  const index = JSON.parse(fs.readFileSync(path.join(root,prefix,'search-index.json')));
  const indexed = JSON.stringify(index);
  const html = fs.readFileSync(path.join(root,prefix,'guides/resources-and-materials.html'),'utf8');
  const unresolvedBlock=html.split('class="shop-unresolved"')[1]?.split('</details>')[0];
  for(const entry of data.unresolvedReferences) {
    assert.ok(unresolvedBlock?.includes(`<code>${entry.id}</code>`));
    assert.ok(unresolvedBlock.includes(prefix?(entry.itemGraphicHeader?'Sprite 与物品图形头记录':'仅 Sprite 资源'):(entry.itemGraphicHeader?'Sprite and item-graphic header records':'Sprite asset only')));
    assert.ok(!index.some(document=>document.url.includes(entry.id)),`${entry.id}: unresolved technical IDs are not searchable vehicle models`);
  }
  assert.match(unresolvedBlock,prefix?/技术资源痕迹不证明车型名称、可驾驶、可购买或当前生成/:/Technical asset traces do not establish a model name, drivability, purchase availability or current spawning/);
  for (const offer of data.offers) assert.ok(html.includes(`id="offer-${offer.id}"`), `Missing listing: ${prefix}${offer.id}`);
  for (const offer of data.offers) {
    const named = Boolean(data.items.find(i => i.id === offer.itemId).name);
    const profile = require('../data/crops.json').inputs.find(i => i.buildInput?.sourceItemId === offer.itemId);
    const resource = require('../data/build-resources.json').items.find(i => i.id === offer.itemId && i.materialId);
    const seed = seeds.find(i => i.id === offer.itemId && i.rosterStatus === 'current-roster');
    const produceItem = produce.find(i => i.id === offer.itemId);
    const placeable = placeables.find(i => i.id === offer.itemId);
    const miscItem = miscItems.find(i => i.id === offer.itemId);
    const vehicle = vehicles.find(i => i.id === offer.itemId);
    assert.equal(indexed.includes(`#offer-${offer.id}\"`), named && !profile && !resource && !seed && !produceItem && !placeable && !miscItem && !vehicle, `Named offers without a full profile remain indexed: ${offer.id}`);
    if (resource) {
      assert.ok(index.some(i => i.url === `/${prefix}database/materials#${resource.materialId}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`database/materials#${resource.materialId}`));
    }
    if (profile) {
      assert.ok(index.some(i => i.url === `/${prefix}database/crops#${profile.id}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`database/crops#${profile.id}`));
    }
    if (seed) {
      assert.ok(index.some(i => i.url === `/${prefix}database/crops#${seed.cropId}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`database/crops#${seed.cropId}`));
    }
    if (produceItem) {
      const target = produceItem.cropStatus === 'current-roster' ? produceItem.cropId : `seed-${produceItem.cropId}`;
      assert.ok(index.some(i => i.url === `/${prefix}database/crops#${target}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`database/crops#${target}`));
    }
    if (placeable) {
      const hasRecipe = recipes.some(recipe => recipe.id === placeable.id);
      const target = hasRecipe ? `recipe-${placeable.id}` : `placeable-${placeable.id}`;
      assert.ok(index.some(i => i.url === `/${prefix}guides/crafting-guide#${target}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`guides/crafting-guide#${target}`));
    }
    if (miscItem) {
      assert.ok(index.some(i => i.url === `/${prefix}guides/crafting-guide#tool-${miscItem.id}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`guides/crafting-guide#tool-${miscItem.id}`));
    }
    if (vehicle) {
      assert.ok(index.some(i => i.url === `/${prefix}guides/vehicles-transport#vehicle-${vehicle.id}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`guides/vehicles-transport#vehicle-${vehicle.id}`));
    }
  }
  assert.match(html, /data-shop-query/);
  assert.match(html, /data-shop-category/);
  const tools = fs.readFileSync(path.join(root,prefix,'guides/crafting-guide.html'),'utf8');
  const axe = tools.split('id="tool-tools_axe_metal"')[1]?.split('</tr>')[0];
  assert.ok(axe?.includes('resources-and-materials#offer-building-store-allthetime-tools_axe_metal'), 'Axe lookup needs its configured shop destination');
  for (const route of ['guides/building-construction.html','tools/ranch-checklist.html']) {
    const page = fs.readFileSync(path.join(root,prefix,route),'utf8');
    for (const offer of buildings) {
      const row = page.split(`id="shop-plan-${offer.itemId}"`)[1]?.split('</tr>')[0];
      assert.ok(row, `Missing building: ${route} ${offer.itemId}`);
      for (const m of offer.materials) assert.ok(row.includes(`× ${m.quantity}</strong>`));
    }
  }
}
console.log('PASS: 139 source-linked vendor listings and 11 shop building requirements reach bilingual pages.');
