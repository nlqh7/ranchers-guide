const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'data/build-equipment.json');
assert.ok(fs.existsSync(file), 'Seasonal device configuration must reach the website');
const data = JSON.parse(fs.readFileSync(file));
assert.equal(data.equipment.length, 23);
assert.equal(new Set(data.equipment.map(e => e.id)).size, 23);
assert.equal(data.evidenceLevel, 'build-observed');
assert.equal(data.validity, 'unknown');
assert.equal(data.unit, null);
assert.equal(data.interval, null);
const solar = data.equipment.find(e => e.id === 'prop_Roof_LVL1_SolarPanel_01');
assert.deepEqual(solar.electricity.supply, [5,6,3,2]);
assert.deepEqual(solar.electricity.consumption, [0,0,0,0]);
const pump = data.equipment.find(e => e.id === 'enrg_water_pump_n1');
assert.deepEqual(pump.water.supply, [17,17,17,13]);
assert.deepEqual(pump.electricity.consumption, [17,17,17,17]);
for (const entry of data.equipment) {
  assert.match(data.sources[entry.sourceId].rawSha256, /^[a-f0-9]{64}$/);
  assert.ok(entry.name && entry.zhName);
  assert.ok(!Object.hasOwn(entry, 'price'));
  for (const resource of ['water','electricity']) for (const field of ['supply','consumption']) {
    assert.equal(entry[resource][field].length,4);
    assert.ok(entry[resource][field].every(n => Number.isFinite(n) && n >= 0));
  }
}
for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root,prefix,'guides/electricity-power.html'),'utf8');
  const shopHtml = fs.readFileSync(path.join(root,prefix,'guides/resources-and-materials.html'),'utf8');
  const indexed = fs.readFileSync(path.join(root,prefix,'search-index.json'),'utf8');
  for (const entry of data.equipment) {
    const profile = html.split(`id="equipment-${entry.id}"`)[1]?.split('</section>')[0];
    assert.ok(profile, `Missing labeled equipment profile: ${prefix}${entry.id}`);
    assert.match(profile, /<h3\b[^>]*>/);
    assert.match(profile, /scope="col"/);
    assert.match(profile, /scope="row"/);
    assert.ok(profile.includes(`resources-and-materials#offer-building-store-allthetime-${entry.id}`));
    assert.ok(indexed.includes(`#equipment-${entry.id}\"`), `Missing searchable equipment: ${entry.id}`);
    assert.ok(shopHtml.includes(`electricity-power#equipment-${entry.id}`), `Shop needs equipment detail link: ${entry.id}`);
  }
}
console.log('PASS: 23 equipment definitions reach labeled bilingual profiles without invented units or rates.');
