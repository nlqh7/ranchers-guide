const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-vehicles.json');
const shops = require('../data/build-shops.json');
const searchCore = require('../assets/js/search-core.js');
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));

assert.equal(data.items.length, 40);
assert.equal(data.items.filter(item => item.shopOfferIds.length).length, 23);
assert.equal(data.items.reduce((count, item) => count + item.shopOfferIds.length, 0), 24);
assert.equal(data.items.filter(item => item.description).length, 33);
assert.equal(data.items.filter(item => item.sellable).length, 22);
for (const item of data.items) {
  assert.ok(item.name && item.zhName && data.sources[item.sourceId]);
  assert.ok(!('price' in item) && !('sourceDescription' in item));
  assert.equal(item.equippable, false);
  assert.equal(item.stackable, false);
  assert.equal(item.droppable, false);
  for (const offerId of item.shopOfferIds) assert.ok(shops.offers.some(offer => offer.id === offerId && offer.itemId === item.id));
}

for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'guides/vehicles-transport.html'), 'utf8');
  const shopHtml = fs.readFileSync(path.join(root, prefix, 'guides/resources-and-materials.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  assert.ok(html.includes('data-vehicle-reference'));
  assert.ok(html.includes('data-recipe-group="dealer-listed"'));
  assert.ok(html.includes('data-recipe-group="no-dealer"'));
  for (const item of data.items) {
    const anchor = `vehicle-${item.id}`;
    const profile = html.split(`id="${anchor}"`)[1]?.split('</tr>')[0];
    assert.ok(profile, `${prefix}: missing vehicle profile ${item.id}`);
    assert.ok(profile.includes(esc(prefix ? item.zhName : item.name)), `${prefix}: missing localized vehicle name ${item.id}`);
    assert.ok(index.some(document => document.url === `/${prefix}guides/vehicles-transport#${anchor}`), `${prefix}: vehicle not indexed ${item.id}`);
    assert.equal(searchCore.searchDocuments(index, prefix ? item.zhName : item.name, 12)[0]?.url, `/${prefix}guides/vehicles-transport#${anchor}`, `${prefix}: exact vehicle search must open its profile`);
    for (const offerId of item.shopOfferIds) {
      const row = shopHtml.split(`id="offer-${offerId}"`)[1]?.split('</tr>')[0];
      assert.ok(row?.includes(`/${prefix}guides/vehicles-transport#${anchor}`), `${prefix}: missing shop roundtrip ${offerId}`);
      assert.ok(!row.includes('data-search-entry'), `${prefix}: duplicate shop answer ${offerId}`);
    }
  }
  assert.ok(html.includes(prefix ? '不证明可驾驶、当前库存、性能或售价' : 'do not establish drivability, current stock, performance or price'));
}

console.log('PASS: 40 source-backed vehicles reach bilingual profiles; 24 dealer listings roundtrip without duplicate answers.');
