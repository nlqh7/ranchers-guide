const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const crops = require('../data/crops.json');
const standaloneCropIds = new Set(['red-lettuce', 'garlic', 'strawberry']);
for (const locale of ['en', 'zh']) {
  const index = JSON.parse(fs.readFileSync(path.join(root, locale === 'zh' ? 'zh/knowledge-index.json' : 'knowledge-index.json'), 'utf8'));
  for (const crop of crops.buildRoster.entries) {
    const matches = index.entities.filter(e => e.id === `crop:${crop.id}`);
    assert.equal(matches.length, 1, `${locale}: ${crop.id} needs one direct knowledge card`);
    const entity = matches[0];
    const prefix = locale === 'zh' ? '/zh' : '';
    const expectedRoute = standaloneCropIds.has(crop.id)
      ? `${prefix}/database/crops/${crop.id}`
      : `${prefix}/database/crops#${crop.id}`;
    assert.equal(entity.route, expectedRoute);
    assert.ok(entity.aliases.includes(crop.name) && entity.aliases.includes(crop.zhName));
    const facts = entity.facts.filter(f => f.evidenceLevel === 'build-observed');
    const cropFacts = facts.filter(f => f.sourceIds.includes('local-build-24847725'));
    assert.ok(facts.some(f => f.text.includes(String(crop.daysToFirstHarvest))), 'first-harvest configuration must be accessible in search');
    assert.ok(facts.every(f => f.build === crop.build && f.sourceIds.length > 0), 'every build fact needs its own source');
    assert.ok(cropFacts.length >= 3, 'crop timing and shop facts keep their crop-table source');
    assert.ok(facts.some(f => f.text.includes(locale === 'zh' ? '未实测' : 'not gameplay-tested')));
    if (crop.townSeedVendor !== 'listed') assert.ok(facts.some(f => f.text.includes(locale === 'zh' ? '购买途径未确认' : 'acquisition is unconfirmed')));
  }
}
console.log('PASS: all 11 crop configuration profiles have source-labeled bilingual knowledge cards.');

const search = require('../assets/js/search-core.js');
const storeAnswer = {title:'Where is the General Store? Look for Leafy Markets', aliases:['General Store'], url:'/guides/resources-and-materials#general-store'};
assert.equal(search.dossierSupportsExactAnswer({route:'/map#youssefs-stand'},'General Store',[storeAnswer]),false,'An exact answer alias must suppress a keyword-only unrelated location card');
assert.equal(search.dossierSupportsExactAnswer({route:storeAnswer.url},'General Store',[storeAnswer]),true,'The matching answer route may keep its card');
assert.equal(search.dossierSupportsExactAnswer({route:'/map#youssefs-stand'},'clothing store',[storeAnswer]),true,'Keep fallback cards when no exact title or alias answers the question');
const englishKnowledge = require('../knowledge-index.json');
const soloDossiers = englishKnowledge.entities.filter(entity => search.entityScore(entity, 'PLAY SOLO') >= 52);
assert.deepEqual(soloDossiers.map(entity => entity.id), [], 'PLAY SOLO must not promote unrelated quests or possessive shop names through a single letter');
assert.equal(search.searchDocuments(require('../search-index.json'), 'PLAY SOLO')[0].url, '/guides/multiplayer-coop#session-mode');
assert.equal(search.entityScore({label: 'Cow'}, 'coward'), 0, 'Latin names must not match inside another word');
assert.equal(search.entityScore({label: 'Vehicle', aliases: ['car']}, 'carpet'), 0, 'Aliases need the same word boundaries as labels');
assert.ok(search.entityScore({label: 'Cow'}, 'how to feed a cow') >= 52);
assert.ok(search.entityScore({label: "Lina's Tools"}, 'Lina') >= 52);
assert.ok(search.entityScore({label: '鸡'}, '鸡生病了') >= 52, 'Single-character Chinese animal names remain searchable');
assert.ok(search.entityScore({label: 'Hay', aliases: ['干草']}, '干草在哪里买') >= 52);
assert.ok(search.entityScore({label: 'CashIn'}, 'CashIn怎么卖东西') >= 52, 'Chinese text does not need spaces around an English name');
const buildFact = {text:'Configured item name', evidenceLevel:'build-observed', validity:'unknown', sourceIds:['owned-build-animals']};
const rumor = {text:'Unverified price', evidenceLevel:'unverified-lead', validity:'unknown', sourceIds:['report']};
const officialFact = {text:'Official roster', evidenceLevel:'official', validity:'current'};
assert.deepEqual(search.dossierFacts({facts:[buildFact, rumor, officialFact]}), [buildFact, officialFact], 'source-backed configuration remains visible without promoting runtime rumors');
assert.deepEqual(search.evidencePresentation('build-observed', 'zh'), {label:'构建资料（未实测）', className:'build'});
assert.deepEqual(search.evidencePresentation('build-observed', 'en'), {label:'Build data (not gameplay-tested)', className:'build'});
assert.equal(search.evidencePresentation('official', 'en').label, 'Official');
assert.equal(search.evidencePresentation('unknown-kind', 'zh').label, '待验证');
assert.equal(search.dossierFacts({facts:Array(8).fill(officialFact)}).length, 5);
console.log('PASS: source-backed build facts stay visible with a distinct, non-runtime evidence label.');

for (const locale of ['en','zh']) {
  const prefix=locale==='zh'?'/zh':'';
  const index=JSON.parse(fs.readFileSync(path.join(root,prefix?'zh/search-index.json':'search-index.json'),'utf8'));
  const query=prefix?'小块兔肉':'Rabbit Meat - Small';
  const matches=search.searchDocuments(index,query,12);
  const animal={route:prefix+'/database/animals#rabbit'};
  assert.equal(matches[0].url,prefix+'/guides/resources-and-materials#food-consumable_meat_small_rabit');
  assert.ok(!matches[0].snippet.includes('consumable food energy'),'Search keywords are not visible item descriptions');
  assert.ok(matches[0].snippet.includes('60') && matches[0].snippet.includes('108'));
  assert.equal(search.dossierSupportsExactAnswer(animal,query,matches),false,'An unrelated animal dossier must not precede an exact consumable answer');
  assert.equal(search.dossierSupportsExactAnswer(animal,prefix?'兔子怎么养':'how to care for rabbits',matches),true,'Care queries keep their animal dossier');
  assert.equal(search.dossierSupportsExactAnswer({route:matches[0].url},query,matches),true,'The exact answer itself can keep its dossier');
  assert.equal(search.dossierSupportsExactAnswer(animal,query,[]),true,'Absent exact answers must not hide useful fallback dossiers');
}
