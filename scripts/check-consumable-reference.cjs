const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const file = path.join(root,'data/build-consumables.json');
assert.ok(fs.existsSync(file), 'Consumable source values must be applied to the website');
const data = JSON.parse(fs.readFileSync(file));
const shops = require('../data/build-shops.json');
const rabbit = data.items.find(i=>i.id==='consumable_meat_small_rabit');
assert.deepEqual(rabbit.energy,{consumption:0,restore:60});
assert.deepEqual(rabbit.health,{consumption:0,restore:108});
assert.equal(rabbit.isDrink,null,'A missing drink flag is not an explicit false');
assert.equal(data.items.find(i=>i.id==='consumable_milk_gold_cow').isDrink,true);
assert.equal(data.items.length,27);
assert.equal(data.evidenceLevel,'build-observed');
assert.equal(data.validity,'unknown');
for(const prefix of ['', 'zh/']) {
  const html=fs.readFileSync(path.join(root,prefix,'guides/resources-and-materials.html'),'utf8');
  const search=fs.readFileSync(path.join(root,prefix,'search-index.json'),'utf8');
  for(const item of data.items) {
    const profile=html.split(`id="food-${item.id}"`)[1]?.split('</section>')[0];
    assert.ok(profile,`Missing named consumable: ${prefix}${item.id}`);
    assert.ok(profile.includes(prefix?item.zhName:item.name));
    assert.ok(profile.includes(`<dt>${prefix?'能量恢复':'Energy restore'}</dt><dd>${item.energy.restore}</dd>`));
    assert.ok(profile.includes(`<dt>${prefix?'生命恢复':'Health restore'}</dt><dd>${item.health.restore}</dd>`));
    assert.ok(search.includes(`#food-${item.id}\"`),`Missing search entry: ${item.id}`);
    const offer = shops.offers.find(o=>o.itemId===item.id);
    assert.equal(profile.includes('#offer-'),Boolean(offer),'Only matched store references get an acquisition link');
    if(offer) assert.ok(html.split(`id="offer-${offer.id}"`)[1].split('</tr>')[0].includes(`#food-${item.id}`));
  }
  for(const route of ['database.html','database/animals.html','database/materials.html','guides/animal-guide.html']) assert.ok(fs.readFileSync(path.join(root,prefix,route),'utf8').includes('resources-and-materials#consumables'),`Missing consumable entry point: ${prefix}${route}`);
}
console.log('PASS: consumable values preserve energy/health direction and absent drink flags.');
