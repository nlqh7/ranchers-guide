const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const en = read('database/animals/chicken.html');
const zh = read('zh/database/animals/chicken.html');
const enLivestock = read('database/animals/livestock.html');
const zhLivestock = read('zh/database/animals/livestock.html');
const enDirectory = read('database/animals.html');
const zhDirectory = read('zh/database/animals.html');
const searchJs = read('assets/js/search.js');
const sitemap = read('sitemap.xml');
const enIndex = JSON.parse(read('search-index.json'));
const zhIndex = JSON.parse(read('zh/search-index.json'));
const enKnowledge = JSON.parse(read('knowledge-index.json'));
const zhKnowledge = JSON.parse(read('zh/knowledge-index.json'));
const searchCore = require('../assets/js/search-core.js');
const animalData = require('../data/animals.json');
const silosUrl = 'https://steamcommunity.com/app/1501310/discussions/0/587308167364408897/';

assert.equal(animalData.sources['thread-silos']?.url, silosUrl, 'Silos source must point to the original discussion');
assert.ok(read('guides/animal-guide.html').includes(silosUrl), 'English care guide must link the direct Silos source');
assert.ok(read('zh/guides/animal-guide.html').includes(silosUrl), 'Chinese care guide must link the direct Silos source');

for (const [locale, html, canonical, counterpart] of [
  ['en', en, '/database/animals/chicken', '/zh/database/animals/chicken'],
  ['zh', zh, '/zh/database/animals/chicken', '/database/animals/chicken'],
]) {
  assert.match(html, new RegExp(`<link rel="canonical" href="https://theranchersguide\\.com${canonical.replaceAll('/', '\\/')}">`), `${locale}: self canonical`);
  assert.ok(html.includes(`hreflang="${locale === 'en' ? 'zh-CN' : 'en'}" href="https://theranchersguide.com${counterpart}"`), `${locale}: translated alternate`);
  assert.match(html, /data-search-entry[\s\S]*chicken/i, `${locale}: searchable direct entry`);
}

assert.ok(enDirectory.includes('id="chicken" data-search-entry'), 'English directory must keep the legacy #chicken entry');
assert.ok(zhDirectory.includes('id="chicken" data-search-entry'), 'Chinese directory must keep the legacy #chicken entry');
assert.ok(enDirectory.includes('id="chicken-acquisition"'), 'English directory must keep its legacy acquisition anchor');
assert.ok(enDirectory.includes('id="chicken-feed"'), 'English directory must keep its legacy feed anchor');
assert.ok(zhDirectory.includes('id="feeding"'), 'Chinese directory must keep its legacy feeding anchor');
for (const html of [enDirectory, zhDirectory]) assert.match(html, /database\/animals\/chicken/, 'animal directory links to the detail page');
for (const route of ['/database/animals/chicken', '/zh/database/animals/chicken']) {
  assert.ok(sitemap.includes(`https://theranchersguide.com${route}`), `sitemap includes ${route}`);
  assert.ok(searchJs.includes(`"${route}"`), `search page list includes ${route}`);
}
assert.ok(enIndex.some(doc => doc.url === '/database/animals/chicken' && /Angela|coop|hay/i.test(`${doc.title} ${doc.description}`)), 'English index has a useful chicken detail result');
assert.ok(zhIndex.some(doc => doc.url === '/zh/database/animals/chicken' && /Angela|鸡舍|干草/.test(`${doc.title} ${doc.description}`)), 'Chinese index has a useful chicken detail result');
assert.ok(searchCore.searchDocuments(enIndex, 'chicken feed', 5)[0]?.url.startsWith('/database/animals/chicken'), 'English player query reaches the detail before the generic animal guide');
assert.ok(searchCore.searchDocuments(zhIndex, '鸡舍干草', 5)[0]?.url.startsWith('/zh/database/animals/chicken'), 'Chinese player query reaches the detail before the generic directory');
for (const [locale, index] of [['en', enKnowledge], ['zh', zhKnowledge]]) {
  const chicken = index.entities.find(entity => entity.id === 'animal:chicken');
  assert.ok(chicken, `${locale}: chicken knowledge card exists`);
  assert.equal(chicken.route, locale === 'zh' ? '/zh/database/animals/chicken' : '/database/animals/chicken', `${locale}: knowledge card opens detail`);
}
for (const route of ['/database/animals/livestock', '/zh/database/animals/livestock']) {
  assert.ok(sitemap.includes(`https://theranchersguide.com${route}`), `sitemap includes ${route}`);
  assert.ok(searchJs.includes(`"${route}"`), `search page list includes ${route}`);
}
assert.ok(searchCore.searchDocuments(enIndex, 'cow illness 7 days', 5).some(doc => doc.url === '/database/animals/livestock#cow'), 'English cow illness query reaches the cow section');
assert.ok(searchCore.searchDocuments(zhIndex, '山羊病程 8天', 5).some(doc => doc.url === '/zh/database/animals/livestock#goat'), 'Chinese goat illness query reaches the goat section');
for (const [locale, html, canonical, counterpart] of [
  ['en', enLivestock, '/database/animals/livestock', '/zh/database/animals/livestock'],
  ['zh', zhLivestock, '/zh/database/animals/livestock', '/database/animals/livestock'],
]) {
  assert.ok(html.includes(`href="https://theranchersguide.com${canonical}"`), `${locale}: livestock self canonical`);
  assert.ok(html.includes(`href="https://theranchersguide.com${counterpart}"`), `${locale}: livestock translated alternate`);
  assert.match(html, /data-search-entry[^>]+id="cow"|id="cow"[^>]+data-search-entry/, `${locale}: cow detail anchor is searchable`);
  assert.match(html, /data-search-entry[^>]+id="goat"|id="goat"[^>]+data-search-entry/, `${locale}: goat detail anchor is searchable`);
  assert.ok(html.includes('0.8.10.858'), `${locale}: illness durations retain official build`);
  assert.match(html, /7 days|7 天/, `${locale}: cow illness duration is present`);
  assert.match(html, /8 days|8 天/, `${locale}: goat illness duration is present`);
}
assert.ok(enLivestock.includes('672C') && /shelf purchase price, not player sale value/i.test(enLivestock), 'English livestock page distinguishes shelf price from player income');
assert.match(enLivestock, /not verified|unverified|not confirmed/i, 'English livestock page keeps purchase/diet claims bounded');
assert.match(zhLivestock, /尚未验证|未确认|不能证明/, 'Chinese livestock page keeps purchase/diet claims bounded');
assert.doesNotMatch(animalData.species.find(item => item.id === 'chicken').fields.flatMap(field => field.facts).map(fact => fact.text).join(' '), /confirming the meat path for culled chickens/i, 'Chicken shelf evidence must not imply a culling mechanism');
const cowSelling = animalData.species.find(item => item.id === 'cow').fields.find(field => field.key === 'selling')?.facts ?? [];
assert.ok(cowSelling.some(fact => fact.validity === 'unknown' && /chickens and roosters only/i.test(fact.text)), 'Cow selling guidance must keep the rooster-only source scope and unknown cattle route');
assert.doesNotMatch(enLivestock, /meat path is the current disposal route/i, 'Livestock page must not generalize rooster disposal guidance to cattle');
assert.doesNotMatch(zhLivestock, /处理后出售肉类是已确认路线/, 'Chinese livestock page must not generalize rooster disposal guidance to cattle');
for (const [locale, html] of [['en', enLivestock], ['zh', zhLivestock]]) {
  assert.match(html, /Hay|干草/, `${locale}: livestock care configuration exposes hay`);
  assert.match(html, /Water|水/, `${locale}: livestock care configuration exposes water`);
  assert.match(html, /Green Lettuce|Green Salad|Carotte|绿叶生菜|绿色沙拉菜|胡萝卜/, `${locale}: goat care configuration exposes its configured foods`);
  assert.match(html, /serialized configuration|序列化配置|配置.*不是.*实测/, `${locale}: livestock configuration keeps the runtime-testing boundary`);
  assert.doesNotMatch(html, /current (?:cattle\/goat|goat) diets? remain unknown|牛羊当前饮食.*未知|山羊当前饮食也未确认/i, `${locale}: livestock page no longer hides known configured diets behind unknown wording`);
}
assert.equal((en.match(/class="animal-next-steps"/g) || []).length, 1, 'English chicken page has one next-steps navigation');
assert.equal((zh.match(/class="animal-next-steps"/g) || []).length, 1, 'Chinese chicken page has one next-steps navigation');
assert.equal((enLivestock.match(/class="animal-next-steps"/g) || []).length, 1, 'English livestock page has one next-steps navigation');
assert.equal((zhLivestock.match(/class="animal-next-steps"/g) || []).length, 1, 'Chinese livestock page has one next-steps navigation');
assert.match(zhLivestock, /游戏文件：动物定义/);
assert.match(zhLivestock, /Games Station 游戏实录/);
assert.doesNotMatch(zhLivestock, /Owned game files:/, 'Chinese livestock evidence labels are localized');
assert.match(enDirectory, /database\/animals\/livestock#cow/, 'animal directory links cow to the combined livestock detail');
assert.match(enDirectory, /database\/animals\/livestock#goat/, 'animal directory links goat to the combined livestock detail');
assert.match(zhDirectory, /database\/animals\/livestock#cow/, 'Chinese directory links cow to the combined livestock detail');
assert.match(zhDirectory, /database\/animals\/livestock#goat/, 'Chinese directory links goat to the combined livestock detail');
for (const [locale, index] of [['en', enKnowledge], ['zh', zhKnowledge]]) {
  assert.equal(index.entities.find(entity => entity.id === 'animal:cow')?.route, locale === 'zh' ? '/zh/database/animals/livestock#cow' : '/database/animals/livestock#cow', `${locale}: cow knowledge route`);
  assert.equal(index.entities.find(entity => entity.id === 'animal:goat')?.route, locale === 'zh' ? '/zh/database/animals/livestock#goat' : '/database/animals/livestock#goat', `${locale}: goat knowledge route`);
}
for (const [locale, html] of [['en', en], ['zh', zh]]) {
  assert.match(html, /Angela/, `${locale}: acquisition next step is visible`);
  assert.match(html, /Hay|干草/, `${locale}: feeding answer is visible`);
  assert.match(html, /Gigi|大鸡蛋/, `${locale}: egg quest next step is visible`);
  assert.match(html, /auto|自动/, `${locale}: general care/automation guide is linked`);
  assert.doesNotMatch(html, /guaranteed large eggs|保证(?:马上|必定|一定)产/, `${locale}: no guaranteed egg outcome`);
}

console.log('PASS: bilingual chicken and livestock details, legacy anchors, directory links, sitemap, search and knowledge entries.');
