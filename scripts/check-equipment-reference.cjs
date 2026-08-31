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
assert.deepEqual(data.sharedConfiguration,{
  type:'Placeable',classification:'OTHER',rarity:'Bronze',equippable:false,bodySlot:'NONE',droppable:true,sellableFlag:true,hasInteriorFeatures:false,interiorConsumesFarmEnergy:false,stackableByGroup:{generators:true,devices:false},
});
assert.deepEqual(data.buildingConfiguration,{
  defaultHealthByGroup:{generators:3,devices:1},defaultBuildStepsByGroup:{generators:2,devices:0},buildStepExceptions:{prop_Roof_LVL1_SolarPanel_01:0,enrg_solar_n1:1,enrg_water_pump_n1:0},
});
const buildingFor=entry=>({defaultHealth:data.buildingConfiguration.defaultHealthByGroup[entry.group],buildSteps:data.buildingConfiguration.buildStepExceptions[entry.id]??data.buildingConfiguration.defaultBuildStepsByGroup[entry.group]});
assert.ok(data.equipment.every(entry=>Number.isFinite(buildingFor(entry).defaultHealth)&&Number.isFinite(buildingFor(entry).buildSteps)));
const washingNote=data.sourceNotes.prop_Kitchen_CounterWashing_01;
assert.equal(washingNote.en,'The developer description mentions 12 storage slots while also saying the object does not wash dishes.');
assert.equal(washingNote.zh,'开发者说明提到 12 个储物槽，同时写明该物品不会清洗餐具。');
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
  assert.ok(!Object.hasOwn(entry, 'rawDescription'));
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
    assert.ok(profile.includes('data-equipment-native-settings'));
    const building=buildingFor(entry);
    assert.ok(profile.includes(`${prefix?'默认健康字段':'Default-health field'}: ${building.defaultHealth}`));
    assert.ok(profile.includes(`${prefix?'建造步数字段':'Build-step field'}: ${building.buildSteps}`));
    const stackable=data.sharedConfiguration.stackableByGroup[entry.group];
    assert.ok(profile.includes(`${prefix?'可堆叠':'Stackable'}: ${stackable?(prefix?'是':'Yes'):(prefix?'否':'No')}`));
    assert.match(profile,prefix?/健康与建造步数字段不是已实测耐久或施工次数/:/Health and build-step fields are not measured durability or construction actions/);
    const sourceNote=data.sourceNotes[entry.id];
    if(sourceNote) {
      assert.ok(profile.includes(prefix?sourceNote.zh:sourceNote.en));
      assert.ok(profile.includes(prefix?'异常来源备注，不是已验证功能':'Anomalous source note, not a verified feature'));
    }
  }
}
for(const prefix of ['','zh/']) assert.doesNotMatch(fs.readFileSync(path.join(root,prefix,'guides/electricity-power.html'),'utf8'),/A farm fence maded from wood to protect your farm/);
console.log('PASS: 23 equipment definitions reach labeled bilingual profiles without invented units or rates.');
