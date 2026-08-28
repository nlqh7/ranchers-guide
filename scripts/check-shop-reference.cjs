const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'data/build-shops.json');
assert.ok(fs.existsSync(file), 'Shop configuration must be applied to public lookup data');
const data = JSON.parse(fs.readFileSync(file));
assert.equal(data.shops.length, 8);
assert.equal(data.offers.length, 139);
assert.equal(new Set(data.offers.map(o => o.id)).size, 139);
assert.equal(data.evidenceLevel, 'build-observed');
assert.equal(data.validity, 'unknown');
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
  for (const offer of data.offers) assert.ok(html.includes(`id="offer-${offer.id}"`), `Missing listing: ${prefix}${offer.id}`);
  for (const offer of data.offers) {
    const named = Boolean(data.items.find(i => i.id === offer.itemId).name);
    const profile = require('../data/crops.json').inputs.find(i => i.buildInput?.sourceItemId === offer.itemId);
    assert.equal(indexed.includes(`#offer-${offer.id}\"`), named && !profile, `Named offers without a full input profile remain indexed: ${offer.id}`);
    if (profile) {
      assert.ok(index.some(i => i.url === `/${prefix}database/crops#${profile.id}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`database/crops#${profile.id}`));
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
