const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'data', 'fs25', 'production.json');
const outputPath = path.join(root, 'assets', 'js', 'fs25-planner-data.js');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

function fail(message) {
  throw new Error(`FS25 data contract: ${message}`);
}

if (source.schemaVersion !== 'fs25-bread-v1') fail('unexpected schema version');
if (source.game?.id !== 'fs25') fail('game id must be fs25');
if (source.chain?.id !== 'bread') fail('only the bread chain is in this pilot');
if (!Array.isArray(source.chain.steps) || source.chain.steps.length !== 2) fail('bread chain must contain exactly bakery and mill');
if (source.chain.steps.map(step => step.id).join(',') !== 'bakery,mill') fail('chain order must stay bakery,mill');
for (const step of source.chain.steps) {
  if (!(step.inputPerOutput?.value > 0)) fail(`${step.id} input ratio must be positive`);
  if (!(step.outputCapacityPerMonth?.value > 0)) fail(`${step.id} capacity must be positive`);
  if (!['divided', 'independent'].includes(step.sharingRule?.default)) fail(`${step.id} has no valid editable sharing default`);
  for (const field of ['inputPerOutput', 'outputCapacityPerMonth']) {
    const fact = step[field];
    if (!Number.isFinite(fact.value)) fail(`${step.id} ${field} must be finite`);
    if (!['community-reference', 'sample-assumption'].includes(fact.status)) fail(`${step.id} ${field} status is missing`);
    if (fact.status === 'community-reference' && !source.sources.some(item => item.id === fact.sourceId)) fail(`${step.id} ${field} reference needs a source`);
    if (fact.status === 'sample-assumption' && fact.sourceId !== null) fail(`${step.id} ${field} example must not claim a source`);
  }
}
if (!(source.chain.crop.yieldPerHaPerHarvest?.value > 0)) fail('wheat yield must be positive');
if (source.chain.crop.yieldPerHaPerHarvest.runtimeConfirmed === true) fail('pilot must not claim runtime-confirmed yield');
if (source.chain.crop.yieldPerHaPerHarvest.status !== 'sample-assumption') fail('wheat yield must remain a sample assumption until directly sourced');
if (source.chain.crop.yieldPerHaPerHarvest.sourceId !== null) fail('wheat yield must not claim a source id for the 11800 sample');

const generated = `/* GENERATED from data/fs25/production.json — do not edit manually. */
(function () {
  "use strict";
  var SOURCE_DATA = ${JSON.stringify(source, null, 2)};
  var bakery = SOURCE_DATA.chain.steps[0];
  var mill = SOURCE_DATA.chain.steps[1];
  var CHAIN = {
    product: { id: SOURCE_DATA.chain.id, name: SOURCE_DATA.chain.name, zhName: SOURCE_DATA.chain.zhName, unit: SOURCE_DATA.chain.unit },
    steps: [
      {
        id: bakery.id,
        facility: bakery.facility,
        zhFacility: bakery.zhFacility,
        inputId: bakery.inputId,
        inputPerOutput: bakery.inputPerOutput.value,
        inputPerOutputMeta: bakery.inputPerOutput,
        outputCapacityPerMonth: bakery.outputCapacityPerMonth.value,
        outputCapacityMeta: bakery.outputCapacityPerMonth,
        sharingRule: bakery.sharingRule.default,
        sharingRuleMeta: bakery.sharingRule
      },
      {
        id: mill.id,
        facility: mill.facility,
        zhFacility: mill.zhFacility,
        inputId: mill.inputId,
        inputPerOutput: mill.inputPerOutput.value,
        inputPerOutputMeta: mill.inputPerOutput,
        outputCapacityPerMonth: mill.outputCapacityPerMonth.value,
        outputCapacityMeta: mill.outputCapacityPerMonth,
        sharingRule: mill.sharingRule.default,
        sharingRuleMeta: mill.sharingRule
      }
    ],
    crop: {
      id: SOURCE_DATA.chain.crop.id,
      name: SOURCE_DATA.chain.crop.name,
      zhName: SOURCE_DATA.chain.crop.zhName,
      yieldPerHa: SOURCE_DATA.chain.crop.yieldPerHaPerHarvest.value,
      yieldMeta: SOURCE_DATA.chain.crop.yieldPerHaPerHarvest
    }
  };

  function finiteProduct(a, b) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    var result = a * b;
    return Number.isFinite(result) ? result : null;
  }

  function litersNeeded(ratios, targetPerMonth) {
    var flourPerMonth = finiteProduct(targetPerMonth, ratios.flourPerBread);
    var wheatPerMonth = finiteProduct(flourPerMonth, ratios.wheatPerFlour);
    return { flourPerMonth: flourPerMonth, wheatPerMonth: wheatPerMonth };
  }

  function effectiveCapacity(capacityPerMonth, lines, rule) {
    if (!Number.isFinite(capacityPerMonth) || !(capacityPerMonth > 0) ||
      !Number.isInteger(lines) || lines < 1 || !["independent", "divided"].includes(rule)) return null;
    if (rule === "independent") return capacityPerMonth;
    return capacityPerMonth / Math.max(1, lines);
  }

  function facilitiesNeeded(throughputPerMonth, capacityPerMonth, lines, rule) {
    var effective = effectiveCapacity(capacityPerMonth, lines, rule);
    if (!Number.isFinite(throughputPerMonth) || throughputPerMonth < 0 || !(effective > 0)) return null;
    var count = Math.ceil(throughputPerMonth / effective);
    var totalCapacity = finiteProduct(count, effective);
    if (!Number.isFinite(count) || totalCapacity === null) return null;
    return {
      count: count,
      effective: effective,
      shortfall: Math.max(0, throughputPerMonth - effective),
      singleFacilityShort: throughputPerMonth > effective,
      headroom: Math.max(0, totalCapacity - throughputPerMonth)
    };
  }

  function facilityPlan(throughputPerMonth, capacityPerMonth, lines, rule, existingCount) {
    if (existingCount !== null && existingCount !== undefined &&
      (!Number.isFinite(existingCount) || existingCount < 0 || existingCount % 1 !== 0)) return null;
    var plan = facilitiesNeeded(throughputPerMonth, capacityPerMonth, lines, rule);
    if (!plan) return null;
    var hasExisting = existingCount !== null && existingCount !== undefined;
    var currentCapacity = hasExisting ? finiteProduct(existingCount, plan.effective) : null;
    if (hasExisting && currentCapacity === null) return null;
    return {
      totalNeeded: plan.count,
      effective: plan.effective,
      additionalNeeded: hasExisting ? Math.max(0, plan.count - existingCount) : null,
      shortfall: hasExisting ? Math.max(0, throughputPerMonth - currentCapacity) : null,
      existingCount: hasExisting ? existingCount : null,
      headroom: plan.headroom
    };
  }

  function areaHa(wheatPerMonth, runMonths, yieldPerHa, harvestsPerYear) {
    if (!(yieldPerHa > 0) || !(runMonths > 0) || !(harvestsPerYear > 0)) return null;
    var annualDemand = finiteProduct(wheatPerMonth, runMonths);
    var annualYield = finiteProduct(yieldPerHa, harvestsPerYear);
    if (annualDemand === null || annualYield === null || !(annualYield > 0)) return null;
    var area = annualDemand / annualYield;
    return Number.isFinite(area) ? area : null;
  }

  var api = {
    SOURCE_DATA: SOURCE_DATA,
    CHAIN: CHAIN,
    finiteProduct: finiteProduct,
    litersNeeded: litersNeeded,
    effectiveCapacity: effectiveCapacity,
    facilitiesNeeded: facilitiesNeeded,
    facilityPlan: facilityPlan,
    areaHa: areaHa
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.FS25PlannerData = api;
})();
`;

if (process.argv.includes('--check')) {
  const current = fs.readFileSync(outputPath, 'utf8');
  if (current !== generated) {
    console.error(`FAIL: ${path.relative(root, outputPath)} is out of sync with ${path.relative(root, sourcePath)}`);
    process.exit(1);
  }
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, generated);
}

console.log(`PASS: FS25 planner data ${process.argv.includes('--check') ? 'matches' : 'generated from'} ${path.relative(root, sourcePath)}.`);
