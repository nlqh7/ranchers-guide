const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-world-services.json');
const vehicles = require('../data/build-vehicles.json');
const searchCore = require('../assets/js/search-core.js');
const css = fs.readFileSync(path.join(root, 'assets/css/crafting-reference.css'), 'utf8');
const expectedIds = [
  'BicycleRentStation',
  'EnvObj_TaxiRentalStation_Buisness',
  'EnvObj_TaxiRentalStation_VIP',
  'EnvObj_TaxiRentalStation_Regular',
];

assert.equal(data.audit.totalRecords, 186);
assert.equal(data.audit.publicServiceRecords, 4);
assert.equal(data.audit.nonPublicRecords, 182);
assert.equal(data.audit.technicalIdentifierRecords, 179);
assert.equal(data.audit.missingLocalizationRecords, 3);
assert.deepEqual(data.services.map(service => service.id), expectedIds);
assert.equal(new Set(data.services.map(service => service.id)).size, 4);
assert.equal(data.services[0].description, 'Rent a bicycle for the day, explore the roads your way.');
assert.equal(data.services[0].zhDescription, '租一辆自行车，按自己的方式探索道路。');
assert.equal(data.services[0].mapLocationId, 'bykii-terminal');
for (const service of data.services.slice(1)) {
  assert.equal(service.description, null, `${service.id}: empty I2 description remains null`);
  assert.ok(service.relatedVehicleId, `${service.id}: taxi station links to its matching vehicle definition`);
}
assert.equal('price' in data.services[0], false);
assert.equal('coordinate' in data.services[0], false);
assert.equal('available' in data.services[0], false);
assert.match(css, /\.world-service-reference\s*\{[^}]*scroll-margin-top:\s*96px/s, 'service deep links clear the sticky site header');

const excludedExamples = ['Big_Wood_Fence', 'EnvObj_Parking_CarSpawner', 'EnvObj_Shop_SunGlass'];
for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'guides/vehicles-transport.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const block = html.match(/<!-- BEGIN WORLD SERVICE REFERENCE -->[\s\S]*?<!-- END WORLD SERVICE REFERENCE -->/)?.[0];
  assert.ok(block, `${prefix || 'en/'}: source-bounded world-service reference exists`);
  for (const service of data.services) {
    assert.ok(block.includes(`id="world-service-${service.id}"`), `${service.id}: public service has a direct destination`);
  }
  assert.match(block, new RegExp(`href="/${prefix}map#bykii-terminal"`));
  for (const service of data.services.slice(1)) {
    assert.match(block, new RegExp(`href="#vehicle-${service.relatedVehicleId}"`));
    const serviceUrl = `/${prefix}guides/vehicles-transport#world-service-${service.id}`;
    assert.equal(searchCore.searchDocuments(index, service.id, 12)[0]?.url, serviceUrl, `${prefix}: technical service ID opens the service card`);
    const vehicle = vehicles.items.find(item => item.id === service.relatedVehicleId);
    assert.ok(vehicle, `${service.id}: related vehicle exists`);
    assert.equal(searchCore.searchDocuments(index, prefix ? vehicle.zhName : vehicle.name, 12)[0]?.url, `/${prefix}guides/vehicles-transport#vehicle-${vehicle.id}`, `${prefix}: native taxi name keeps the richer vehicle profile first`);
  }
  for (const id of excludedExamples) assert.doesNotMatch(block, new RegExp(id), `${id}: internal object is not promoted to a player entry`);
  assert.match(block, prefix ? /不推断精确坐标、租赁价格、当前营业或可用性/ : /No exact coordinates, rental prices, current operation or availability are inferred/);
  assert.doesNotMatch(block, /(?:has exact coordinates|currently available|rental price is|spawns at)/i);
}

console.log('PASS: 4 player-facing world services are separated from 182 internal environment records.');
