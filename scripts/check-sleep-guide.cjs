const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-tutorials.json');
const searchCore = require('../assets/js/search-core.js');

const sleep = data.families.find(entry => entry.id === 'sleep-save-fainting');
assert.ok(sleep, 'sleep/save/fainting tutorial family must exist');
assert.equal(data.build, '0.8.10.842');
assert.equal(data.steamBuild, '24847725');
assert.equal(data.source.asset, 'resources.assets');
assert.equal(data.source.pathId, 393483);
assert.equal(data.source.rawSha256, '2c505386fe9b1b9c2579aad1e6957907db838d8c7f87227e818fbfd4b57d5f4e');
assert.equal(sleep.evidenceLevel, 'build-observed');
assert.equal(sleep.validity, 'unknown');
assert.deepEqual(sleep.sourceKeys, [
  'GT/SleepMechanic_Title',
  'GT/SleepMechanic_die_respawn_hospital',
  'GT/SleepMechanic_energy_health_die',
  'GT/SleepMechanic_howto',
  'GT/SleepMechanic_staylate_die',
]);
assert.deepEqual(sleep.sleepLocations, ['tent', 'bed', 'motel', 'motorhome']);
assert.equal(sleep.cutoff.hour, 3);
assert.equal(sleep.cutoff.period, 'a.m.');
assert.doesNotMatch(JSON.stringify(sleep), /feeAmount|restoreAmount|percentage|currentAvailability/i);

for (const locale of ['en', 'zh']) {
  const prefix = locale === 'zh' ? 'zh/' : '';
  const html = fs.readFileSync(path.join(root, prefix, 'guides/beginners-guide.html'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  assert.match(html, /id="saving-sleep-fainting"[^>]*data-search-entry/, `${locale}: answer must be a searchable deep-link target`);
  assert.match(html, /BEGIN SLEEP TUTORIAL REFERENCE[\s\S]*END SLEEP TUTORIAL REFERENCE/, `${locale}: generated source-backed block missing`);
  assert.ok(html.indexOf('href="#saving-sleep-fainting"') < html.indexOf('href="#setup"'), `${locale}: table of contents must match the answer-first page order`);
  assert.match(html, locale === 'zh' ? /帐篷、床、汽车旅馆或房车/ : /tent, bed, motel or motorhome/i);
  assert.match(html, locale === 'zh' ? /凌晨 3 点后/ : /past 3 a\.m\./i);
  assert.match(html, locale === 'zh' ? /最近的医院/ : /nearest hospital/i);
  assert.doesNotMatch(html, locale === 'zh' ? /医院.{0,16}(?:\d+[元币C]|费用为\d)/ : /hospital.{0,16}(?:fee of|costs?)\s*\d/i);
  const renderedBlock = html.match(/BEGIN SLEEP TUTORIAL REFERENCE -->[\s\S]*?<!-- END SLEEP TUTORIAL REFERENCE/)?.[0] || '';
  assert.doesNotMatch(renderedBlock, /24847725/, `${locale}: do not expose the internal Steam build in the player answer`);
  const queries = locale === 'zh'
    ? ['怎么保存游戏', '凌晨3点晕倒']
    : ['how to save', 'faint after 3am'];
  for (const query of queries) {
    assert.equal(
      searchCore.searchDocuments(searchIndex, query, 5)[0]?.url,
      `/${prefix}guides/beginners-guide#saving-sleep-fainting`,
      `${locale}: ${query} must open the exact answer`,
    );
  }
}

console.log('PASS: current-build sleep, save, fainting and hospital guidance is source-bounded and directly searchable.');
