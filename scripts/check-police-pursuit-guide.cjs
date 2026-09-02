const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-tutorials.json');
const searchCore = require('../assets/js/search-core.js');
const pursuit = data.families.find(entry => entry.id === 'police-pursuit');

assert.ok(pursuit, 'police pursuit tutorial family must exist');
assert.equal(pursuit.evidenceLevel, 'build-observed');
assert.equal(pursuit.validity, 'unknown');
assert.deepEqual(pursuit.sourceKeys, [
  'GT/Police_Pursuit_DroneBehaviour',
  'GT/Police_Pursuit_JailTime',
  'GT/Police_Pursuit_LevelHUD',
  'GT/Police_Pursuit_PayFine',
  'GT/Police_Pursuit_Title',
]);
assert.deepEqual(pursuit.pursuitTriggers, ['vehicle-theft', 'farm-animal-theft', 'character-killing']);
assert.equal(pursuit.wantedDisplay, 'hud');
assert.deepEqual(pursuit.responses, ['pay-fine', 'surrender', 'escape']);
assert.deepEqual(pursuit.escalation, ['police-cars', 'police-drones']);
assert.equal(pursuit.oneStarOutcome, 'pay-and-continue');
assert.equal(pursuit.multiStarOutcome, 'pay-and-custody');
for (const field of ['fineAmounts', 'buttonBindings', 'custodyDuration', 'judgeFormula', 'starIncrements']) {
  assert.equal(pursuit[field], undefined, `unsupported ${field} fact must not be published`);
}

for (const locale of ['en', 'zh']) {
  const prefix = locale === 'zh' ? 'zh/' : '';
  const guide = fs.readFileSync(path.join(root, prefix, 'guides/police-wanted-levels.html'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const block = guide.match(/BEGIN POLICE PURSUIT TUTORIAL REFERENCE -->[\s\S]*?<!-- END POLICE PURSUIT TUTORIAL REFERENCE/)?.[0] || '';

  assert.ok(block, `${locale}: generated police pursuit block missing`);
  assert.match(block, /id="police-pursuit-current-build"[^>]*data-search-entry/, `${locale}: pursuit path needs a searchable deep link`);
  assert.equal((block.match(/<li>/g) || []).length, 4, `${locale}: pursuit path should stay at four scannable steps`);
  assert.match(block, locale === 'zh' ? /偷车[\s\S]*农场动物[\s\S]*杀死/ : /steal[^<]*vehicle[\s\S]*farm animal[\s\S]*kill/i);
  assert.match(block, locale === 'zh' ? /HUD[\s\S]*通缉等级/ : /HUD[\s\S]*wanted level/i);
  assert.match(block, locale === 'zh' ? /交罚款[\s\S]*自首[\s\S]*逃跑/ : /pay[^<]*fine[\s\S]*surrender[\s\S]*escape/i);
  assert.match(block, locale === 'zh' ? /1 星[\s\S]*继续[\s\S]*超过 1 星[\s\S]*拘留/ : /1 star[\s\S]*continue[\s\S]*more than 1 star[\s\S]*custody/i);
  assert.match(block, locale === 'zh' ? /警车[\s\S]*无人机[\s\S]*(?:更|越)激进/ : /police cars[\s\S]*drones[\s\S]*more aggressive/i);
  assert.doesNotMatch(block, /24847725/, `${locale}: internal Steam build must not appear in player copy`);
  assert.match(block, locale === 'zh' ? /没有给出[^。]*罚款金额/ : /does not provide[^.]*fine amounts/i);
  assert.doesNotMatch(block, locale === 'zh' ? /按下.{0,10}键|拘留\s*\d+|每次增加\s*\d+\s*星/ : /press the .{0,12} key|custody for \d+|adds? \d+ stars?/i);

  assert.match(guide, /<a href="#police-pursuit-current-build">/, `${locale}: table of contents must link to the current-build path`);
  assert.match(guide, /answer-box[\s\S]*?<a href="#police-pursuit-current-build">/, `${locale}: answer-first copy must expose the path`);

  const queries = locale === 'zh'
    ? ['怎么触发警方追捕', '一星怎么交罚款', '警察追捕 自首 逃跑']
    : ['how police pursuit starts', 'pay fine at one star', 'police pursuit surrender or escape'];
  for (const query of queries) {
    assert.equal(
      searchCore.searchDocuments(searchIndex, query, 5)[0]?.url,
      `/${prefix}guides/police-wanted-levels#police-pursuit-current-build`,
      `${locale}: ${query} must open the current-build pursuit path`,
    );
  }
}

console.log('PASS: current-build police pursuit triggers, HUD and response path are source-bounded and directly searchable.');
