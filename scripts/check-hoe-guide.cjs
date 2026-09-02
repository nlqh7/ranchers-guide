const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-tutorials.json');
const searchCore = require('../assets/js/search-core.js');
const hoe = data.families.find(entry => entry.id === 'hoe-planting');

assert.ok(hoe, 'hoe planting tutorial family must exist');
assert.equal(hoe.evidenceLevel, 'build-observed');
assert.equal(hoe.validity, 'unknown');
assert.deepEqual(hoe.sourceKeys, [
  'GT/hoe_how_to_use_KeepItClean',
  'GT/hoe_how_to_use_PlacementValidation',
  'GT/hoe_how_to_use_PlantSeeds',
  'GT/hoe_how_to_use_Title',
  'GT/hoe_how_to_use_WaterDaily',
]);
assert.deepEqual(hoe.placementIndicators, ['red-blocked', 'white-ready']);
assert.equal(hoe.tillableLand, 'owned-only');
assert.deepEqual(hoe.growthConditions, ['correct-season', 'daily-watering', 'no-weeds', 'not-stolen-by-birds']);
for (const field of ['growthDays', 'coverageTiles', 'yield', 'profit', 'missedWaterPenalty']) {
  assert.equal(hoe[field], undefined, `unsupported ${field} fact must not be published`);
}

for (const locale of ['en', 'zh']) {
  const prefix = locale === 'zh' ? 'zh/' : '';
  const guide = fs.readFileSync(path.join(root, prefix, 'guides/farming-fields.html'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const block = guide.match(/BEGIN HOE TUTORIAL REFERENCE -->[\s\S]*?<!-- END HOE TUTORIAL REFERENCE/)?.[0] || '';

  assert.ok(block, `${locale}: generated hoe tutorial block missing`);
  assert.match(block, /id="start-farming"[^>]*data-search-entry/, `${locale}: planting steps need a searchable deep link`);
  assert.equal((block.match(/<li>/g) || []).length, 4, `${locale}: planting path should stay at four scannable steps`);
  assert.match(block, locale === 'zh' ? /红色[\s\S]*白色/ : /red[\s\S]*white/i);
  assert.match(block, locale === 'zh' ? /自己的土地|自有土地/ : /land you own|owned land/i);
  assert.match(block, locale === 'zh' ? /使用键[\s\S]*洒水壶/ : /use button[\s\S]*watering can/i);
  assert.match(block, locale === 'zh' ? /每天浇水/ : /water(?:ing)? every day|daily watering/i);
  assert.match(block, locale === 'zh' ? /除草[\s\S]*小鸟/ : /weed[\s\S]*birds/i);
  assert.doesNotMatch(block, /24847725/, `${locale}: internal Steam build must not appear in player copy`);

  const obsolete = locale === 'zh'
    ? [/已种作物多久浇一次仍未验证/, /开田和温室的当前版本步骤仍未闭环/, /不要把旧温室或锄头教程当成确定路线/, /未验证：开田与温室/, /钱会进入当天结算/, /钱在日终结算单/]
    : [/watering interval for a planted crop is still unverified/i, /current-build tilling and greenhouse steps are still open/i, /old greenhouse or hoe tutorial/i, /Not yet verified: tilling & greenhouses/i, /money arrives in the end-of-day Farming line/i];
  for (const pattern of obsolete) assert.doesNotMatch(guide, pattern, `${locale}: obsolete guidance must be removed: ${pattern}`);

  const queries = locale === 'zh'
    ? ['怎么开第一块种植地', '锄头 红色 白色', '锄头 播种 使用键 洒水壶']
    : ['how to start first plantation', 'hoe red white placement', 'hoe plant seed watering can'];
  for (const query of queries) {
    assert.equal(
      searchCore.searchDocuments(searchIndex, query, 5)[0]?.url,
      `/${prefix}guides/farming-fields#start-farming`,
      `${locale}: ${query} must open the current planting path`,
    );
  }
}

console.log('PASS: current-build hoe placement, planting and daily-care guidance is source-bounded and directly searchable.');
