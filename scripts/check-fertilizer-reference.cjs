const assert = require('node:assert/strict');
const data = require('../data/crops.json');
const ids = ['fertilizer', 'boost-fertilizer', 'ogm-fertilizer'];
const expectedUses = ['quality', 'quantity', 'giant'];
const fs = require('node:fs');
const path = require('node:path');
const searchCore = require('../assets/js/search-core.js');
const shops = require('../data/build-shops.json');
for (const [index, id] of ids.entries()) {
  const item = data.inputs.find(i => i.id === id);
  assert.ok(item?.buildInput, `${id}: source configuration must reach the existing crop input`);
  assert.equal(item.buildInput.intendedUse, expectedUses[index]);
  assert.deepEqual(item.buildInput.energy, {consumption: 1, restoration: 0});
  assert.equal(item.buildInput.classification, 'FARMING');
  assert.equal(item.buildInput.rarity, 'Bronze');
  assert.equal(item.buildInput.droppable, true);
  assert.equal(item.buildInput.sellableFlag, true);
  assert.ok(!('price' in item.buildInput) && !('sharedGO' in item.buildInput), 'Internal price and rendering metadata stay private');
  assert.equal(item.buildInput.localizedDescription, null, 'An empty localization slot must not be filled with the native table description');
  assert.equal(item.buildInput.evidenceLevel, 'build-observed');
  assert.equal(item.buildInput.validity, 'unknown');
  for (const fact of item.fields.flatMap(field => field.facts).filter(fact => fact.evidenceLevel === 'video-observed')) {
    assert.equal(fact.validity, 'historical', 'Older-build price observations must not remain current facts');
  }
  for (const prefix of ['', 'zh/']) {
    const html = fs.readFileSync(path.join(__dirname,'..',prefix,'database/crops.html'),'utf8');
    assert.ok(!html.includes('video on the current Early Access build'), 'The historical comparison introduction must not claim the current build');
    const profile = html.split(`id="${id}" data-search-entry`)[1]?.split('</section>')[0];
    assert.ok(profile?.includes('data-fertilizer-config'), `${prefix}${id}: show labeled build settings in the existing profile`);
    assert.ok(profile.includes(prefix ? '体力消耗' : 'Energy use'));
    assert.ok(profile.includes('<dd>1</dd>') && profile.includes('<dd>0</dd>'));
    assert.ok(profile.includes(prefix ? '实际效果尚未验证' : 'Actual effects are unverified'));
    assert.match(profile, prefix ? /共同配置：FARMING.*Bronze.*可丢弃.*可出售标志/ : /Shared settings: FARMING.*Bronze.*droppable.*sellable flag/);
    assert.ok(profile.includes('farming-fields#fertilizer'));
    const lookup = html.split('id="browse-entries"')[1]?.split('</section>')[0];
    assert.ok(lookup?.includes(`href="#${id}"`), `${id}: named entry must be in the visible crop directory`);
    const shopHtml = fs.readFileSync(path.join(__dirname,'..',prefix,'guides/resources-and-materials.html'),'utf8');
    for (const offer of shops.offers.filter(o => o.itemId === item.buildInput.sourceItemId)) {
      assert.ok(profile.includes(`#offer-${offer.id}`));
      assert.ok(shopHtml.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`database/crops#${id}`), 'Shop entry must link back to its full fertilizer profile');
    }
    const index = JSON.parse(fs.readFileSync(path.join(__dirname,'..',prefix,'search-index.json')));
    assert.ok(!index.some(e => e.url === `/${prefix}database/crops#browse-entries-title`), 'Navigation groups are not alternative item answers');
    const expectedUrl = `/${prefix}database/crops#${id}`;
    assert.equal(searchCore.searchDocuments(index, prefix ? item.buildInput.zhName : item.name,12)[0].url, expectedUrl);
    if (prefix && id !== 'fertilizer') {
      const oldAlias = id === 'ogm-fertilizer' ? 'OGM 肥料' : 'Boost 肥料';
      assert.equal(searchCore.searchDocuments(index, oldAlias,12)[0].url, expectedUrl, 'Preserve established bilingual search aliases');
    }
    const knowledge = JSON.parse(fs.readFileSync(path.join(__dirname,'..',prefix,'knowledge-index.json')));
    const entity = knowledge.entities.find(e => e.route === expectedUrl);
    if (id !== 'fertilizer') {
      assert.ok(entity?.aliases.includes(id === 'ogm-fertilizer' ? 'OGM 肥料' : 'Boost 肥料'), 'The top dossier must recognize the same legacy alias as the result list');
    }
    assert.ok(entity?.relatedRoutes.some(r => r.href === `/${prefix}guides/farming-fields#fertilizer`), 'The search card must retain a direct fertilizer warning link');
    assert.ok(entity?.facts.some(f => f.evidenceLevel === 'build-observed' && f.validity === 'unknown' && f.sourceIds.includes('local-fertilizers-24847725')), 'Search dossier must include the source-backed input settings');
    for (const fact of entity.facts.filter(f => f.evidenceLevel !== 'build-observed')) {
      assert.notEqual(fact.build, data.meta.build, 'Historical observations must not inherit the current baseline build');
      assert.ok(fact.sourceIds.length, 'Localized observations must retain their own sources');
    }
    if (prefix) {
      const warning = entity.facts.find(f => f.text.includes('官方'));
      assert.equal(warning?.evidenceLevel, 'official');
      assert.ok(warning.sourceIds.includes('thread-fertilizer-bug'));
      assert.ok(entity.sources.some(s => s.id === 'thread-fertilizer-bug'));
    }
  }
}
console.log('PASS: three fertilizer references retain their source boundaries.');
