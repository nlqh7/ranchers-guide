const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-customization.json');
const expectedCounts = {
  CC_Cloth_BTM: 59,
  CC_Cloth_SUNGLASS: 12,
  CC_Cloth_VEST: 27,
  CC_Hair: 17,
  CC_Cloth_HAT: 28,
  CC_Cloth_TOP: 69,
  CC_Cloth_DRESS: 8,
  CC_Panties: 2,
  CC_Cloth_Boots: 32,
  CC_Bread: 15,
};

assert.equal(data.items.length, 269, 'all retained customization definitions are available');
assert.equal(new Set(data.items.map(item => `${item.sourceId}:${item.id}`)).size, 269, 'source IDs keep every definition distinct');
assert.deepEqual(Object.fromEntries(Object.keys(expectedCounts).map(source => [source, data.items.filter(item => item.sourceName === source).length])), expectedCounts);
for (const item of data.items) {
  assert.ok(item.id && item.name && item.zhName && item.sourceId && item.category && item.bodySlot);
  assert.equal(item.description, null, `${item.sourceName}:${item.id}: empty I2 description remains null`);
  assert.equal('price' in item, false, 'internal prices stay private');
  assert.equal('available' in item, false, 'source configuration does not claim runtime availability');
}

for (const locale of ['en', 'zh']) {
  const prefix = locale === 'zh' ? 'zh/' : '';
  const html = fs.readFileSync(path.join(root, prefix, 'database/customization.html'), 'utf8');
  assert.equal((html.match(/data-customization-entry/g) || []).length, 269, `${locale}: every definition has a public profile`);
  assert.equal((html.match(/class="customization-directory-link"/g) || []).length, 269, `${locale}: every definition is browsable before the profiles`);
  assert.match(html, /data-customization-search/);
  assert.match(html, /data-customization-category/);
  assert.match(html, new RegExp(`href="/${prefix}database/customization" aria-current="page"`));
  for (const item of data.items) {
    const anchor = `customization-${item.sourceName.toLowerCase().replace(/_/g, '-')}-${item.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    assert.ok(html.includes(`id="${anchor}"`), `${locale}: ${item.sourceName}:${item.id} has an exact destination`);
    assert.ok(html.includes(`href="#${anchor}"`), `${locale}: ${item.sourceName}:${item.id} is linked from the directory`);
  }
  assert.match(html, /Cap_A_BlueWhite/);
  assert.match(html, /Cap_B_WhiteBlue/);
  assert.doesNotMatch(html, /\b(?:price|retail|drop rate|current availability)\b/i);
}

for (const prefix of ['', 'zh/']) {
  const hub = fs.readFileSync(path.join(root, `${prefix}database.html`), 'utf8');
  assert.match(hub, new RegExp(`/${prefix}database/customization`));
}
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.match(sitemap, /<loc>https:\/\/theranchersguide\.com\/database\/customization<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/theranchersguide\.com\/zh\/database\/customization<\/loc>/);
const searchRuntime = fs.readFileSync(path.join(root, 'assets/js/search.js'), 'utf8');
assert.match(searchRuntime, /"\/database\/customization"/);
assert.match(searchRuntime, /"\/zh\/database\/customization"/);
for (const locale of ['en', 'zh']) {
  const prefix = locale === 'zh' ? '/zh' : '';
  const index = JSON.parse(fs.readFileSync(path.join(root, locale === 'zh' ? 'zh/search-index.json' : 'search-index.json'), 'utf8'));
  for (const item of data.items) {
    const anchor = `customization-${item.sourceName.toLowerCase().replace(/_/g, '-')}-${item.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const route = `${prefix}/database/customization#${anchor}`;
    const record = index.find(entry => entry.url === route);
    assert.ok(record, `${locale}: ${item.sourceName}:${item.id} has a search destination`);
    assert.equal(record.title, locale === 'zh' ? `${item.zhName} · ${item.name}` : item.name);
  }
}

console.log('PASS: 269 bilingual customization definitions are browsable, filterable and directly searchable.');
