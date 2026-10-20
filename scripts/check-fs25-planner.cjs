const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'data', 'fs25', 'production.json');
const dataPath = path.join(root, 'assets', 'js', 'fs25-planner-data.js');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const planner = require(dataPath);

assert.equal(planner.SOURCE_DATA.schemaVersion, source.schemaVersion, 'planner data must be generated from production.json');
assert.equal(source.schemaVersion, 'fs25-bread-v1');
assert.equal(source.game.id, 'fs25');
assert.deepEqual(source.chain.steps.map(step => step.id), ['bakery', 'mill']);
assert.equal(source.chain.steps[0].inputPerOutput.runtimeConfirmed, false);
for (const field of ['inputPerOutput', 'outputCapacityPerMonth']) {
  for (const step of source.chain.steps) {
    const fact = step[field];
    assert.equal(fact.status, 'community-reference', 'the historical recipe now has a directly inspected author source');
    assert.equal(fact.sourceId, 'productions-guide-v143');
    assert.equal(fact.runtimeConfirmed, false, 'reading an author sheet is not runtime confirmation');
    assert.equal(fact.evidence.facilityVariant, 'standard-not-shed');
    assert.equal(fact.evidence.gameBuild, null, 'do not invent a current game build');
    const basis = fact.evidence;
    const derived = field === 'inputPerOutput' ? basis.inputPerCycle / basis.outputPerCycle : basis.cyclesPerMonth * basis.outputPerCycle;
    assert.equal(fact.value, derived, 'reference result must be reproduced from the attributed recipe row');
  }
}
const reference = source.sources.find(item => item.id === 'productions-guide-v143');
assert.equal(reference.edition, '1.4.3');
assert.match(reference.url, /1KBP3QLKgKboofOCFQnM2gedq75pu7ugzm960FQDb3EM/);
assert.equal(source.chain.steps[1].sharingRule.editable, true);
assert.equal(source.chain.crop.yieldPerHaPerHarvest.unit, 'L / ha / harvest');
assert.equal(source.chain.crop.yieldPerHaPerHarvest.status, 'sample-assumption');
assert.equal(source.chain.crop.yieldPerHaPerHarvest.sourceId, null);
assert.match(source.chain.crop.yieldPerHaPerHarvest.evidenceScope, /No direct source supports 11,800/);
assert.match(source.chain.crop.yieldPerHaPerHarvest.zhEvidenceScope, /没有直接来源支持/);
assert.equal(planner.CHAIN.steps[0].inputPerOutput, 2);
assert.equal(planner.CHAIN.steps[1].outputCapacityPerMonth, 10080);

const need = planner.litersNeeded({ flourPerBread: 2, wheatPerFlour: 1.25 }, 5400);
assert.deepEqual(need, { flourPerMonth: 10800, wheatPerMonth: 13500 });
assert.equal(planner.finiteProduct(1e308, 2), null, 'overflowing derived products must be invalidated');
assert.equal(planner.areaHa(1e308, 12, 11800, 1), null, 'overflowing area must be invalidated');

const independent = planner.facilitiesNeeded(10800, 10080, 2, 'independent');
assert.equal(independent.effective, 10080, 'independent lines must not multiply the selected recipe');
assert.equal(independent.count, 2);

const divided = planner.facilitiesNeeded(10800, 10080, 2, 'divided');
assert.equal(divided.effective, 5040, 'shared lines split the facility budget');
assert.equal(divided.count, 3);

const oneMill = planner.facilityPlan(10800, 10080, 1, 'independent', 1);
assert.equal(oneMill.totalNeeded, 2);
assert.equal(oneMill.additionalNeeded, 1);
assert.equal(oneMill.shortfall, 720);
const enoughMill = planner.facilityPlan(10800, 10080, 1, 'independent', 2);
assert.equal(enoughMill.additionalNeeded, 0);
assert.equal(enoughMill.shortfall, 0);
const omittedMill = planner.facilityPlan(10800, 10080, 1, 'independent', null);
assert.equal(omittedMill.totalNeeded, 2);
assert.equal(omittedMill.additionalNeeded, null, 'omitted existing count must not become zero');
assert.equal(omittedMill.shortfall, null, 'omitted existing count has no current shortfall');
const zeroMill = planner.facilityPlan(10800, 10080, 1, 'independent', 0);
assert.equal(zeroMill.additionalNeeded, 2);
assert.equal(zeroMill.shortfall, 10800);
assert.equal(planner.facilityPlan(10800, 10080, 1, 'independent', -1), null);
assert.equal(planner.facilityPlan(10800, 10080, 1, 'independent', 1.5), null);

assert.equal(planner.areaHa(13500, 12, 11800, 1).toFixed(1), '13.7');
assert.equal(planner.areaHa(13500, 6, 11800, 1).toFixed(1), '6.9');

const fixture = source.fixtures.find(item => item.id === 'default-example-5400');
assert.equal(fixture.expected.flourPerMonth, need.flourPerMonth);
assert.equal(fixture.expected.wheatPerMonth, need.wheatPerMonth);
assert.equal(fixture.expected.millCount, divided.count - 1, 'fixture should document the one-line default, not the two-line override');

console.log('PASS: FS25 bread-chain source contract and pure planner calculations are consistent.');
require('./check-fs25-planner-ui.cjs');
