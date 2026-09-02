const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-tutorials.json');
const searchCore = require('../assets/js/search-core.js');
const blueprint = data.families.find(entry => entry.id === 'blueprint-building');

assert.ok(blueprint, 'blueprint building tutorial family must exist');
assert.equal(blueprint.evidenceLevel, 'build-observed');
assert.equal(blueprint.validity, 'unknown');
assert.deepEqual(blueprint.sourceKeys, [
  'GT/Build_HowToBuild_BluePrint_BuiltIt',
  'GT/Build_HowToBuild_BluePrint_BuiltIt_Joystick',
  'GT/Build_HowToBuild_BluePrint_Demolishit',
  'GT/Build_HowToBuild_BluePrint_Placement',
  'GT/Build_HowToBuild_Hammer_EnergyConsumption',
  'GT/Build_HowToBuild_Title',
]);
assert.deepEqual(blueprint.placementActions, ['move', 'rotate', 'confirm']);
assert.deepEqual(blueprint.buildActions, ['aim', 'repeat-build']);
assert.equal(blueprint.controllerSelection, 'hold-selection-button');
assert.equal(blueprint.editAccess, 'hammer-edit-button');
assert.deepEqual(blueprint.energyFactors, ['build-step-count', 'hammer-quality']);
for (const field of ['energyCost', 'buildStepCount', 'materials', 'demolitionRefund', 'buttonBindings']) {
  assert.equal(blueprint[field], undefined, `unsupported ${field} fact must not be published`);
}

for (const locale of ['en', 'zh']) {
  const prefix = locale === 'zh' ? 'zh/' : '';
  const guide = fs.readFileSync(path.join(root, prefix, 'guides/building-construction.html'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const block = guide.match(/BEGIN BLUEPRINT TUTORIAL REFERENCE -->[\s\S]*?<!-- END BLUEPRINT TUTORIAL REFERENCE/)?.[0] || '';

  assert.ok(block, `${locale}: generated blueprint tutorial block missing`);
  assert.match(block, /id="blueprint-building"[^>]*data-search-entry/, `${locale}: blueprint steps need a searchable deep link`);
  assert.equal((block.match(/<li>/g) || []).length, 4, `${locale}: blueprint path should stay at four scannable steps`);
  assert.match(block, locale === 'zh' ? /位置[\s\S]*旋转[\s\S]*确认/ : /position[\s\S]*rotat[\s\S]*confirm/i);
  assert.match(block, locale === 'zh' ? /锤子[\s\S]*对准/ : /hammer[\s\S]*aim/i);
  assert.match(block, locale === 'zh' ? /手柄[\s\S]*长按[\s\S]*选择/ : /controller[\s\S]*hold[\s\S]*selection/i);
  assert.match(block, locale === 'zh' ? /反复[\s\S]*建造/ : /press[\s\S]*build[\s\S]*until/i);
  assert.match(block, locale === 'zh' ? /编辑[\s\S]*拆除/ : /edit[\s\S]*demolish/i);
  assert.match(block, locale === 'zh' ? /体力[\s\S]*步骤[\s\S]*锤子质量/ : /energy[\s\S]*steps[\s\S]*hammer quality/i);
  assert.doesNotMatch(block, /24847725/, `${locale}: internal Steam build must not appear in player copy`);
  assert.match(block, locale === 'zh' ? /没有给出[^。]*拆除返还/ : /does not provide[^.]*demolition refund/i);
  assert.doesNotMatch(block, locale === 'zh' ? /拆除会返还|拆除可返还|固定消耗|每次消耗/ : /demolition (?:will|does) refund|returns? materials|fixed energy|energy per action/i);

  assert.match(guide, new RegExp(`<a href="#blueprint-building">`), `${locale}: table of contents must link to the tutorial`);
  assert.match(guide, new RegExp(`answer-box[\\s\\S]*?<a href="#blueprint-building">`), `${locale}: answer-first copy must expose the tutorial`);

  const queries = locale === 'zh'
    ? ['蓝图怎么建造 锤子', '旋转放置蓝图', '蓝图 锤子 编辑 拆除']
    : ['how to build blueprint with hammer', 'rotate and place blueprint', 'demolish built piece'];
  for (const query of queries) {
    assert.equal(
      searchCore.searchDocuments(searchIndex, query, 5)[0]?.url,
      `/${prefix}guides/building-construction#blueprint-building`,
      `${locale}: ${query} must open the current blueprint path`,
    );
  }
}

console.log('PASS: current-build blueprint placement, hammer building and edit guidance is source-bounded and directly searchable.');
