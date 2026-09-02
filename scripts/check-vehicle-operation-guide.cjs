const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-tutorials.json');
const searchCore = require('../assets/js/search-core.js');
const vehicle = data.families.find(entry => entry.id === 'vehicle-operation');

assert.ok(vehicle, 'vehicle operation tutorial family must exist');
assert.equal(vehicle.evidenceLevel, 'build-observed');
assert.equal(vehicle.validity, 'unknown');
assert.deepEqual(vehicle.sourceKeys, [
  'GT/Vehicules_Fuel_FuelWork_Desc',
  'GT/Vehicules_Fuel_Refill',
  'GT/Vehicules_Fuel_Title',
  'GT/Vehicules_Ground_Damage_Desc',
  'GT/Vehicules_Ground_Repair_Desc',
  'GT/Vehicules_PlayerEnergy_Desc',
  'GT/Vehicules_PlayerEnergy_Title',
]);
assert.equal(vehicle.fuelGaugePosition, 'top-left');
assert.deepEqual(vehicle.fuelConsumptionFactors, ['vehicle-type', 'vehicle-performance']);
assert.deepEqual(vehicle.refillService, { id: 'gas-station', availability: '24/7' });
assert.equal(vehicle.damageGaugePosition, 'top-left');
assert.deepEqual(vehicle.damageFactors, ['collision', 'impact-speed']);
assert.deepEqual(vehicle.heavyDamageEffects, ['stability', 'turning']);
assert.deepEqual(vehicle.repairService, {
  id: 'quickfix',
  availability: '24/7',
  duringPoliceChase: true,
  costFactor: 'damage-level',
});
assert.deepEqual(vehicle.playerEnergyRecovery, ['eating', 'resting', 'sleeping']);
assert.deepEqual(vehicle.playerEnergyConsumptionFactors, ['driving-duration', 'vehicle-efficiency']);
for (const field of ['fuelCapacity', 'fuelRate', 'damageThresholds', 'repairAmounts', 'vehicleEnergyMapping', 'runtimeAvailability']) {
  assert.equal(vehicle[field], undefined, `unsupported ${field} fact must not be published`);
}

for (const locale of ['en', 'zh']) {
  const prefix = locale === 'zh' ? 'zh/' : '';
  const guide = fs.readFileSync(path.join(root, prefix, 'guides/vehicles-transport.html'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const block = guide.match(/BEGIN VEHICLE OPERATION TUTORIAL REFERENCE -->[\s\S]*?<!-- END VEHICLE OPERATION TUTORIAL REFERENCE/)?.[0] || '';

  assert.ok(block, `${locale}: generated vehicle operation block missing`);
  assert.match(block, /id="vehicle-operation-current-build"[^>]*data-search-entry/, `${locale}: operation path needs a searchable deep link`);
  assert.equal((block.match(/<li>/g) || []).length, 4, `${locale}: vehicle path should stay at four scannable steps`);
  assert.match(block, locale === 'zh' ? /左上角[\s\S]*油表[\s\S]*驾驶[\s\S]*减少/ : /top left[\s\S]*fuel gauge[\s\S]*goes down[\s\S]*drive/i);
  assert.match(block, locale === 'zh' ? /加油站[\s\S]*24.*小时/ : /petrol station[\s\S]*24\/7/i);
  assert.match(block, locale === 'zh' ? /撞[\s\S]*速度[\s\S]*损坏[\s\S]*稳定[\s\S]*转弯/ : /crash[\s\S]*faster[\s\S]*damage[\s\S]*stability[\s\S]*turning/i);
  assert.match(block, locale === 'zh' ? /QuickFix[\s\S]*警方追捕[\s\S]*损坏程度/ : /QuickFix[\s\S]*police chase[\s\S]*damage/i);
  assert.match(block, locale === 'zh' ? /玩家.*体力[\s\S]*吃东西[\s\S]*休息[\s\S]*睡觉[\s\S]*能效/ : /player energy[\s\S]*eating[\s\S]*resting[\s\S]*sleeping[\s\S]*efficiency/i);
  assert.doesNotMatch(block, /24847725/, `${locale}: internal Steam build must not appear in player copy`);
  assert.match(block, locale === 'zh' ? /没有给出[^。]*燃油容量/ : /does not provide[^.]*fuel capacity/i);
  assert.doesNotMatch(block, locale === 'zh' ? /每公里消耗|固定维修费|损坏达到\s*\d+/ : /fuel per (?:mile|kilometre|kilometer)|fixed repair cost|damage reaches \d+/i);

  assert.match(guide, /<a href="#vehicle-operation-current-build">/, `${locale}: table of contents must link to the current-build path`);
  assert.match(guide, /id="answer"[\s\S]*?<a href="#vehicle-operation-current-build">/, `${locale}: answer-first copy must expose the path`);

  const queries = locale === 'zh'
    ? ['车辆油表在哪里', 'QuickFix 修理损坏车辆', '开车消耗玩家体力']
    : ['where is the vehicle fuel gauge', 'QuickFix repair damaged vehicle', 'driving uses player energy'];
  for (const query of queries) {
    assert.equal(
      searchCore.searchDocuments(searchIndex, query, 5)[0]?.url,
      `/${prefix}guides/vehicles-transport#vehicle-operation-current-build`,
      `${locale}: ${query} must open the current-build vehicle path`,
    );
  }
}

console.log('PASS: current-build vehicle fuel, damage, repair and player-energy guidance is source-bounded and directly searchable.');
