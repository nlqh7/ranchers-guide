const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const data = JSON.parse(read('data/crops.json'));
const searchJs = read('assets/js/search.js');
const sitemap = read('sitemap.xml');
const enIndex = JSON.parse(read('search-index.json'));
const zhIndex = JSON.parse(read('zh/search-index.json'));
const enKnowledge = JSON.parse(read('knowledge-index.json'));
const zhKnowledge = JSON.parse(read('zh/knowledge-index.json'));
const searchCore = require('../assets/js/search-core.js');
const selected = ['red-lettuce', 'garlic', 'strawberry'];

for (const id of selected) {
  const entry = data.crops.find(crop => crop.id === id);
  assert.ok(entry, `source profile exists: ${id}`);
  for (const [locale, prefix] of [['en', ''], ['zh', '/zh']]) {
    const route = `${prefix}/database/crops/${id}`;
    const file = `${locale === 'zh' ? 'zh/' : ''}database/crops/${id}.html`;
    const html = read(file);
    assert.ok(html.includes(`href="https://theranchersguide.com${route}"`), `${route}: self canonical`);
    assert.ok(html.includes(locale === 'zh' ? entry.zh.summary : entry.summary), `${route}: player-facing answer`);
    assert.ok(html.includes(locale === 'zh' ? 'CashIn' : 'CashIn'), `${route}: selling route`);
    assert.match(html, /pagead\/js\/adsbygoogle\.js\?client=/, `${route}: canonical AdSense script URL`);
    assert.ok(sitemap.includes(`https://theranchersguide.com${route}`), `sitemap includes ${route}`);
    assert.ok(searchJs.includes(`"${route}"`), `search route list includes ${route}`);
    const configPosition = html.indexOf('class="database-config"');
    const pricePosition = html.indexOf('id="price-boundary"');
    assert.ok(configPosition >= 0 && pricePosition > configPosition, `${route}: seed/season/growth configuration precedes price boundary`);
    assert.match(html, /First harvest|首次收获/, `${route}: first harvest is visible in the quick configuration`);
  }
}

const garlic = data.crops.find(crop => crop.id === 'garlic');
assert.ok(garlic && !/31C/.test(`${garlic.summary} ${garlic.decision}`), 'Garlic summary and decision do not lead with the retail-price boundary');
for (const file of ['database/crops/garlic.html', 'zh/database/crops/garlic.html']) {
  const html = read(file);
  const priceSection = html.slice(html.indexOf('id="price-boundary"'));
  assert.match(html.slice(0, html.indexOf('id="price-boundary"')), /4 days|4 天/);
  assert.match(html.slice(0, html.indexOf('id="price-boundary"')), /Spring|春季/);
  assert.ok((priceSection.match(/31C/g) || []).length <= 1, `${file}: garlic retail price appears once in the price section`);
}

assert.match(read('zh/database/crops/garlic.html'), /待补画面/);
assert.match(read('zh/database/crops/garlic.html'), /视频观测/);
assert.match(read('zh/database/crops/strawberry.html'), /理论模型/);
for (const [index, query, route] of [
  [enIndex, 'red lettuce seed 48c', '/database/crops/red-lettuce'],
  [enIndex, 'garlic 31c', '/database/crops/garlic'],
  [enIndex, 'strawberry regrow 144c', '/database/crops/strawberry'],
  [zhIndex, '红生菜 48C', '/zh/database/crops/red-lettuce'],
  [zhIndex, '大蒜 31C', '/zh/database/crops/garlic'],
  [zhIndex, '草莓 再生 144C', '/zh/database/crops/strawberry'],
]) {
  assert.ok(searchCore.searchDocuments(index, query, 5).some(doc => doc.url === route || doc.url.startsWith(`${route}#`)), `${query}: search can open its detail entry`);
}
const enCrops = read('database/crops.html');
const zhCrops = read('zh/database/crops.html');
for (const id of selected) {
  assert.ok(enCrops.includes(`id="${id}"`), `English legacy anchor kept: ${id}`);
  assert.ok(zhCrops.includes(`id="${id}"`), `Chinese legacy anchor kept: ${id}`);
  assert.ok(enCrops.includes(`/database/crops/${id}`), `English directory links to detail: ${id}`);
  assert.ok(zhCrops.includes(`/zh/database/crops/${id}`), `Chinese directory links to detail: ${id}`);
  assert.ok(enCrops.includes(`class="database-crop-entry" href="/database/crops/${id}"`), `English seasonal chooser opens detail: ${id}`);
  assert.ok(zhCrops.includes(`class="database-crop-entry" href="/zh/database/crops/${id}"`), `Chinese seasonal chooser opens detail: ${id}`);
  for (const [locale, index] of [['en', enKnowledge], ['zh', zhKnowledge]]) {
    assert.equal(index.entities.find(entity => entity.id === `crop:${id}`)?.route, `${locale === 'zh' ? '/zh' : ''}/database/crops/${id}`, `${locale}: knowledge route for ${id}`);
  }
}

console.log('PASS: bilingual crop detail routes, directory anchors, sitemap, search and knowledge entries.');
