const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'data', 'fs25', 'production.json');
const outputPath = path.join(root, 'assets', 'js', 'fs25-planner-data.js');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

function fail(message) {
  throw new Error(`FS25 data contract: ${message}`);
}

if (source.schemaVersion !== 'fs25-production-v3') fail('unexpected schema version');
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
if (source.additionalChains?.map(chain => chain.id).join(',') !== 'canola-oil,greenhouse-lettuce') fail('additional scope is canola oil and greenhouse lettuce only');
const oil = source.additionalChains[0];
const greenhouse = source.additionalChains[1];
if (greenhouse.steps?.length !== 1 || greenhouse.steps[0].id !== 'greenhouse') fail('greenhouse needs one facility');
if (greenhouse.variants?.map(v => v.id).join(',') !== 'small,medium,large') fail('only sourced small, medium and large greenhouse variants');
for (const variant of greenhouse.variants) {
  const e = variant.evidence;
  if (variant.status !== 'community-reference' || variant.sourceId !== 'greenhouses-guide-v143' || variant.runtimeConfirmed !== false || e.gameBuild !== null || variant.inputPerOutput !== e.inputPerCycle / e.outputPerCycle || variant.outputCapacityPerMonth !== e.outputPerCycle * e.cyclesPerMonth) fail(`invalid greenhouse ${variant.id} source arithmetic`);
}
const defaultGreenhouse = greenhouse.variants.find(v => v.id === greenhouse.defaultVariant);
if (!defaultGreenhouse || greenhouse.steps[0].inputPerOutput.value !== defaultGreenhouse.inputPerOutput || greenhouse.steps[0].outputCapacityPerMonth.value !== defaultGreenhouse.outputCapacityPerMonth) fail('greenhouse default must match its scoped variant');
if (oil.steps.length !== 1 || oil.steps[0].id !== 'oil-mill') fail('oil chain must contain one Oil Mill');
for (const field of ['inputPerOutput', 'outputCapacityPerMonth']) {
  const fact = oil.steps[0][field];
  const e = fact.evidence;
  const expected = field === 'inputPerOutput' ? e.inputPerCycle / e.outputPerCycle : e.cyclesPerMonth * e.outputPerCycle;
  if (fact.value !== expected || fact.status !== 'community-reference' || fact.sourceId !== 'productions-guide-v143' || fact.runtimeConfirmed !== false || e.facilityVariant !== 'standard-not-shed' || e.gameBuild !== null) fail(`oil ${field} lacks scoped reference evidence`);
}
if (oil.crop.yieldPerHaPerHarvest.value !== null) fail('unknown canola yield must not have an invented default');
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

  function singleStepPlan(input) {
    var required = [input.target, input.ratio, input.capacity];
    if (!required.every(function (n) { return Number.isFinite(n) && n > 0; })) return null;
    var demand = finiteProduct(input.target, input.ratio);
    var facility = facilityPlan(input.target, input.capacity, input.lines, input.rule, input.owned);
    if (demand === null || !facility) return null;
    var area = null;
    if (input.yieldHa != null && input.months != null && input.harvests != null) {
      if (![input.yieldHa, input.months, input.harvests].every(function (n) { return Number.isFinite(n) && n > 0; })) return null;
      area = areaHa(demand, input.months, input.yieldHa, input.harvests);
      if (area === null) return null;
    }
    return { inputPerMonth: demand, facility: facility, areaHa: area };
  }

  function transportLoads(requiredLitres, capacityLitres) {
    if (!Number.isFinite(requiredLitres) || requiredLitres < 0 || !Number.isFinite(capacityLitres) || capacityLitres <= 0) return null;
    var loads = Math.ceil(requiredLitres / capacityLitres);
    return Number.isSafeInteger(loads) ? loads : null;
  }
  function waterDeliveryPlan(requiredLitres, availableStock, tankerCapacity) {
    if (!Number.isFinite(requiredLitres) || requiredLitres < 0) return null;
    var knownStock = availableStock !== null && availableStock !== undefined;
    if (knownStock && (!Number.isFinite(availableStock) || availableStock < 0)) return null;
    var toDeliver = knownStock ? Math.max(0, requiredLitres - availableStock) : requiredLitres;
    return { requiredLitres: requiredLitres, availableStock: knownStock ? availableStock : null,
      stockCredited: knownStock, litresToDeliver: toDeliver, trips: transportLoads(toDeliver, tankerCapacity) };
  }
  var api = {
    SOURCE_DATA: SOURCE_DATA,
    CHAIN: CHAIN,
    finiteProduct: finiteProduct,
    litersNeeded: litersNeeded,
    effectiveCapacity: effectiveCapacity,
    facilitiesNeeded: facilitiesNeeded,
    facilityPlan: facilityPlan,
    areaHa: areaHa,
    singleStepPlan: singleStepPlan,
    transportLoads: transportLoads,
    waterDeliveryPlan: waterDeliveryPlan
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

// Only these marked additions are generated; the established bread UI stays intact.
function oilMarkup(zh) {
  const t = (en, cn) => zh ? cn : en;
  const field = (id, label, extra = '') => `<div class="calc-field"><label for="fo-${id}">${label}</label><input id="fo-${id}" type="number" ${/\bmin=/.test(extra) ? '' : 'min="0"'} ${/\bstep=/.test(extra) ? '' : 'step="any"'} inputmode="decimal" ${extra}></div>`;
  return `<!-- FS25-OIL:START -->
      <form id="fo-form" hidden novalidate>
        <div class="fp-layout">
          <section class="calc-panel fp-target" aria-labelledby="fo-title">
            <h3 id="fo-title">${t('Your monthly canola oil target', '每月菜籽油目标')}</h3>
            ${field('target', t('Canola oil per month (L)', '菜籽油目标（L/月）'), `placeholder="${oil.sampleTarget}"`)}
            ${field('owned', t('Oil Mills you already own (optional)', '已拥有的油坊（可不填）'), 'step="1"')}
            <p class="fp-src-note">${t('Leave owned count blank for total need only; enter 0 if you have none.', '现有数量空白时只算总需求；没有油坊请填 0。')}</p>
            <div class="fp-actions"><button class="btn" type="submit">${t('Generate plan', '生成计划')}</button><button class="btn btn-outline" id="fo-reference" type="button">${t('Load Oil Mill reference', '载入油坊参考值')}</button><button class="btn btn-outline" id="fo-save" type="button" disabled>${t('Save settings', '保存设置')}</button></div>
            <p id="fo-status" class="fp-status" role="status"></p>
          </section>
          <section class="calc-panel fp-results" aria-labelledby="fo-results-title">
            <h3 id="fo-results-title">${t('Your oil plan', '菜籽油计划')}</h3>
            <div id="fo-results" aria-live="polite"><p class="fp-empty">${t('Enter a target, then enter your facility values or load the Oil Mill reference.', '先填写目标，再填写设施参数或载入油坊参考值。')}</p></div>
            <div class="fp-actions"><button class="btn btn-outline" id="fo-copy" type="button" disabled>${t('Copy plan', '复制计划')}</button></div>
            <p id="fo-copy-status" class="fp-status" role="status"></p>
            <textarea id="fo-manual" class="fp-copy-manual" hidden readonly aria-label="${t('Plan text for manual copy', '手动复制计划文本')}"></textarea>
          </section>
          <details class="calc-panel fp-advanced" id="fo-parameters">
            <summary>${t('Oil Mill capacity, recipe & optional field area', '油坊产能、配比与可选耕地面积')}</summary>
            <p class="fp-src-note">${t('Historical author sheet v1.4.3, row 40, standard Oil Mill (not shed). Recipe and capacity are references, not a current-build test. Sharing rule is an editable assumption; canola yield is your own input.', '原作者表 v1.4.3 第40行，普通油坊（不是棚屋）。配比和产能为历史参考，非当前实机测试。共享规则可自行调整；菜籽单产需自己填写。')}</p>
            <div class="fp-grid">
              ${field('ratio', t('Canola per 1 L oil', '每 1 L 油需要的菜籽（L）'))}
              ${field('capacity', t('Oil output per production month (L)', '每生产运行月的油产量（L）'))}
              <div class="calc-field"><label for="fo-rule">${t('Recipe capacity rule', '配方产能规则')}</label><select id="fo-rule"><option value="divided">${t('Active recipes share capacity', '启用的配方平分产能')}</option><option value="independent">${t('Other recipes do not reduce this recipe', '其他配方不减少本配方产能')}</option></select></div>
              ${field('lines', t('Active recipes in each Oil Mill', '每座油坊启用的配方数'), 'min="1" max="8" step="1" value="1"')}
              ${field('months', t('Production run months per year (area only)', '每年生产运行月数（仅影响面积）'), 'min="1" max="12" step="1"')}
              ${field('harvests', t('Canola harvests per year (area only)', '每年菜籽收获次数（仅影响面积）'), 'min="1" max="12" step="1"')}
              ${field('yield', t('Your canola yield (L / ha / harvest, optional)', '你的菜籽单产（L/公顷/次，可不填）'))}
            </div>
            <p class="fp-src-note">${t('No assumed crop yield. Without your yield, materials and facilities still calculate. Independent recipes keep the selected recipe’s capacity; selecting two recipes never doubles it.', '不预填菜籽单产；缺少单产仍可计算原料和设施。独立配方保持本配方原产能，选两条配方不代表产能翻倍。')}</p>
          </details>
        </div>
      </form>
      <section class="calc-panel" id="oil-supply" data-search-entry data-search-title="${t('FS25 canola oil: how many Oil Mills do I need?', 'FS25 菜籽油需要多少油坊？')}" data-search-aliases="${t('canola oil shortage|oil mill capacity|canola needed|canola oil production', '菜籽油不够|油坊产能|菜籽需求|菜籽油生产')}" data-search-status="${t('Historical community reference', '历史社区参考')}">
        <h2>${t('Plan canola supply and the extra Oil Mills you need', '先算菜籽供应，再决定添几座油坊')}</h2>
        <p>${t('Using the standard Oil Mill reference, 20 L canola makes 10 L oil, with 480 cycles per month: 4,800 L oil/month. A 6,000 L oil target needs 12,000 L canola and 2 Oil Mills in total. If you own 1, its monthly shortfall is 1,200 L oil: add 1 identical mill.', '普通油坊参考配方为 20 L 菜籽产 10 L 油，每月 480 轮，即 4,800 L 油。目标每月 6,000 L 油时，需要 12,000 L 菜籽和共 2 座油坊；已有 1 座时，月产能差 1,200 L 油，还需同规格油坊 1 座。')}</p>
        <p>${t('If two recipes share that budget, each gets 2,400 L/month and this target needs 3 mills. If they run independently, this recipe stays at 4,800 L/month and needs 2 mills—not one. Set the rule to match your building. The sheet’s shed variant is 480 L/month and is not the reference used here.', '若两条配方平分该产能，每条为 2,400 L/月，此目标共需 3 座；若独立运行，本配方仍为 4,800 L/月，共需 2 座，而不是 1 座。请按自己设施选择规则。表中棚屋版为 480 L/月，不是本工具载入的规格。')}</p>
        <p><a href="#fo-form" data-fs25-product="canola-oil">${t('Calculate with your Oil Mill', '用自己的油坊参数计算')}</a> · <a href="${source.sources.find(s => s.id === 'productions-guide-v143').url}" rel="noopener noreferrer">${t('Original author sheet, row 40', '原作者表，第40行')}</a></p>
      </section>
      <!-- FS25-OIL:END -->`;
}
function greenhouseMarkup(zh) {
  const t = (en, cn) => zh ? cn : en;
  const field = (id, label, attrs = '') => `<div class="calc-field"><label for="fg-${id}">${label}</label><input id="fg-${id}" type="number" inputmode="decimal" ${/min=/.test(attrs) ? '' : 'min="0"'} ${/step=/.test(attrs) ? '' : 'step="any"'} ${attrs}></div>`;
  const sourceUrl = source.sources.find(s => s.id === 'greenhouses-guide-v143').url;
  return `<!-- FS25-GREENHOUSE:START -->
      <form id="fg-form" hidden novalidate>
        <div class="fp-layout">
          <section class="calc-panel fp-target" aria-labelledby="fg-title">
            <h3 id="fg-title">${t('Your greenhouse lettuce target', '温室生菜目标')}</h3>
            <div class="calc-field"><label for="fg-variant">${t('Reference size — changing size loads its recipe', '参考型号——切换型号会载入对应参数')}</label><select id="fg-variant">${greenhouse.variants.map(v => `<option value="${v.id}"${v.id === greenhouse.defaultVariant ? ' selected' : ''}>${zh ? v.zhName : v.name} · ${v.outputCapacityPerMonth.toLocaleString('en-US')} L/${t('month', '月')}</option>`).join('')}</select></div>
            ${field('target', t('Lettuce target per month (L)', '每月生菜目标（L）'), `placeholder="${greenhouse.sampleTarget}"`)}
            ${field('owned', t('Matching greenhouses already owned (optional)', '已有同规格温室（可不填）'), 'step="1"')}
            ${field('tanker', t('Your water tanker capacity (L, optional)', '你的水车容量（L，可不填）'))}
            <p class="fp-src-note">${t('Blank owned count is unknown, not zero. Tanker capacity adds minimum delivery trips for this target; it is not water-storage capacity.', '现有数量空白不等于 0。填写水车容量后计算满足目标至少要运几趟；这里不是温室储水上限。')}</p>
            <div class="fp-actions"><button class="btn" type="submit">${t('Generate plan', '生成计划')}</button><button id="fg-reference" class="btn btn-outline" type="button">${t('Load greenhouse reference', '载入温室参考值')}</button><button id="fg-save" class="btn btn-outline" type="button" disabled>${t('Save settings', '保存设置')}</button></div>
            <p id="fg-status" class="fp-status" role="status"></p>
          </section>
          <section class="calc-panel fp-results" aria-labelledby="fg-results-title"><h3 id="fg-results-title">${t('Water & greenhouse plan', '供水与温室计划')}</h3><div id="fg-results" aria-live="polite"><p class="fp-empty">${t('Enter your target and facility values, or load a reference size.', '填写目标与设施参数，或载入对应型号的参考值。')}</p></div><div class="fp-actions"><button id="fg-copy" class="btn btn-outline" type="button" disabled>${t('Copy plan', '复制计划')}</button></div><p id="fg-copy-status" class="fp-status" role="status"></p><textarea id="fg-manual" class="fp-copy-manual" hidden readonly aria-label="${t('Plan text for manual copy', '手动复制计划文本')}"></textarea></section>
          <details id="fg-parameters" class="calc-panel fp-advanced"><summary>${t('Greenhouse recipe & capacity', '温室配比与产能')}</summary>
            <p class="fp-src-note">${t('Historical author sheet v1.4.3, Greenhouses tab, rows 6 / 15 / 24. Size changes output per cycle; these are not hydroponic or modded facilities. Replace the values if your save differs.', '历史原作者表 v1.4.3，Greenhouses 第6／15／24行。型号改变每轮产出；不包括水培或模组温室，存档数值不同时可修改。')}</p>
            <div class="fp-grid">${field('stock', t('Water already available for this production month (L, optional)', '本生产月可用存水（L，可不填）'))}${field('ratio', t('Water per 1 L lettuce (L)', '每 1 L 生菜需水（L）'))}${field('capacity', t('Lettuce output per production month (L)', '每生产运行月的生菜产量（L）'))}
            <div class="calc-field"><label for="fg-rule">${t('Capacity rule', '产能规则')}</label><select id="fg-rule"><option value="divided">${t('Active recipes share capacity', '启用的配方平分产能')}</option><option value="independent">${t('Other recipes do not reduce this recipe', '其他配方不减少本配方产能')}</option></select></div>
            ${field('lines', t('Active recipes per greenhouse', '每座温室启用的配方数'), 'min="1" max="8" step="1" value="1"')}</div>
            <p class="fp-src-note">${t('Water demand is for your lettuce target, not every crop or full-speed production. Enter available water to subtract it for this one month; blank means no stock has been credited, while 0 means you have none. Trips round upward. Water is not assumed free or automatically supplied.', '需水量按生菜目标计算，不是全部作物或全速运转总量。填写可用存水后仅抵扣本生产月；空白表示尚未抵扣，0 表示没有存水。运输趟数向上取整；不假定水源免费或自动补给。')}</p>
            <p><a href="${sourceUrl}" rel="noopener noreferrer">${t('Check the original greenhouse data', '核对原始温室数据')}</a></p>
          </details>
        </div>
      </form>
      <section class="calc-panel" id="greenhouse-water" data-search-entry data-search-title="${t('FS25 greenhouse water calculator: lettuce and tanker trips', 'FS25 温室生菜需水量与水车运输计算')}" data-search-aliases="${t('greenhouse water needed|lettuce production|greenhouse capacity|water tanker trips', '温室缺水|生菜需水|温室产能|水车几趟')}" data-search-status="${t('Historical community reference', '历史社区参考')}">
        <h2>${t('Size the greenhouse and the water deliveries together', '温室数量与送水次数一起算')}</h2>
        <p>${t('The author sheet records lettuce at 1,008 / 2,016 / 4,032 L per month in small / medium / large greenhouses, at 2 L water per 1 L lettuce. A 6,000 L lettuce target needs 12,000 L water and 2 large greenhouses in total. With one large greenhouse owned, the lettuce capacity gap is 1,968 L/month: add one matching building.', '原作者表记录小／中／大温室每月生菜产出为 1,008／2,016／4,032 L，配比为每 1 L 生菜需 2 L 水。目标每月 6,000 L 生菜，需要 12,000 L 水及共 2 座大型温室；已有 1 座时，生菜月产能差 1,968 L，还需同规格温室 1 座。')}</p>
        <p>${t('For an explicitly entered 5,000 L tanker with no water credited, that target takes at least 3 deliveries. With 3,000 L already available for this month, only 9,000 L remains to deliver: 2 trips. These are transport examples, not default vehicle or storage sizes. Two large greenhouses running the lettuce recipe at full speed instead produce 8,064 L lettuce and use 16,128 L water. Other active recipes are not included.', '假设填入 5,000 L 水车且未抵扣存水，这个目标至少需送 3 趟；本月已有 3,000 L 可用水时，只需再运 9,000 L，向上取整为 2 趟。这些是运输算例，不是默认车辆或储水容量。两座大型温室若生菜全速运行，则产 8,064 L 生菜、需 16,128 L 水；其他启用配方不在此计算内。')}</p>
        <p><a href="#fg-form" data-fs25-product="greenhouse-lettuce">${t('Plan your water deliveries', '计算自己的供水计划')}</a> · <a href="${sourceUrl}" rel="noopener noreferrer">${t('Author source: Greenhouses tab', '原作者 Greenhouses 数据表')}</a></p>
      </section>
      <!-- FS25-GREENHOUSE:END -->`;
}
function orderSetupBeforeResults(html) {
  for (const prefix of ['fp', 'fo', 'fg']) {
    const settings = html.match(new RegExp('<details\\b[^>]*\\bid="'+prefix+'-parameters"[^>]*>[\\s\\S]*?<\\/details>'));
    const results = html.match(new RegExp('<section\\b[^>]*aria-labelledby="'+prefix+'-results-title"[^>]*>[\\s\\S]*?<\\/section>'));
    if (!settings || !results) fail(prefix+' setup/results section missing');
    if (settings.index > results.index) {
      html = html.replace(settings[0], '');
      html = html.replace(results[0], settings[0]+'\n          '+results[0]);
    }
    if (!html.includes('id="'+prefix+'-inputs"')) {
      const targetId = prefix === 'fp' ? 'fp-target-title' : prefix+'-title';
      const target = html.match(new RegExp('<section\\b[^>]*aria-labelledby="'+targetId+'"[^>]*>[\\s\\S]*?<\\/section>'));
      if (!target) fail(prefix+' target section missing');
      html = html.replace(target[0], '').replace(settings[0], '');
      html = html.replace(results[0], '<div class="fp-inputs" id="'+prefix+'-inputs">\n'+target[0]+'\n'+settings[0]+'\n</div>\n'+results[0]);
    }
  }
  return html;
}
for (const locale of ['', 'zh/']) {
  const file = path.join(root, locale, 'games/fs25/tools/production-planner/index.html');
  const current = fs.readFileSync(file, 'utf8');
  const selector = `<!-- FS25-PRODUCT:START --><div class="calc-field fp-product-picker"><label for="fp-product">${locale ? '选择目标产品' : 'Choose your target product'}</label><select id="fp-product"><option value="bread">${locale ? '面包：小麦 → 面粉 → 面包' : 'Bread: wheat → flour → bread'}</option><option value="canola-oil">${locale ? '菜籽油：菜籽 → 油' : 'Canola oil: canola → oil'}</option><option value="greenhouse-lettuce">${locale ? '温室生菜：水 → 生菜' : 'Greenhouse lettuce: water → lettuce'}</option></select></div><!-- FS25-PRODUCT:END -->`;
  let next = /<!-- FS25-PRODUCT:START -->/.test(current)
    ? current.replace(/<!-- FS25-PRODUCT:START -->[\s\S]*?<!-- FS25-PRODUCT:END -->/, selector)
    : current.replace('      <form id="fp-form"', `      ${selector}\n      <form id="fp-form"`);
  next = /<!-- FS25-OIL:START -->/.test(next)
    ? next.replace(/<!-- FS25-OIL:START -->[\s\S]*?<!-- FS25-OIL:END -->/, oilMarkup(Boolean(locale)))
    : next.replace('      </form>', `      </form>\n      ${oilMarkup(Boolean(locale))}`);
  next = /<!-- FS25-GREENHOUSE:START -->/.test(next)
    ? next.replace(/<!-- FS25-GREENHOUSE:START -->[\s\S]*?<!-- FS25-GREENHOUSE:END -->/, greenhouseMarkup(Boolean(locale)))
    : next.replace('<!-- FS25-OIL:END -->', `<!-- FS25-OIL:END -->\n      ${greenhouseMarkup(Boolean(locale))}`);
  next = orderSetupBeforeResults(next).replace(/^[\t ]+$/gm, '');
  if (process.argv.includes('--check')) {
    if (next !== current) fail(`${locale}planner oil markup is out of sync`);
  } else fs.writeFileSync(file, next);
}
console.log(`PASS: FS25 planner data and bilingual production sections ${process.argv.includes('--check') ? 'match' : 'generated from'} ${path.relative(root, sourcePath)}.`);
