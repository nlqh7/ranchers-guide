const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'data/build-resources.json');
assert.ok(fs.existsSync(file),'All eight source resource definitions need an interpreted dataset');
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const ids=['farm_water_1L','farm_energy_1KW','ressource_wood','ressource_coal','ressource_straw','ressource_rock_simple','ressource_zerkonite','ressource_Fuel'];
assert.deepEqual(data.items.map(i=>i.id),ids);
assert.equal(data.evidenceLevel,'build-observed');
assert.equal(data.validity,'unknown');
assert.equal(data.steamBuild,'24847725');
for(const item of data.items) {
 assert.ok(item.name&&item.zhName&&data.sources[item.sourceId]);
 assert.equal(item.description,null,'Empty I2 descriptions are not generated descriptions');
 for(const flag of ['equippable','stackable','droppable','sellable']) assert.equal(typeof item[flag],'boolean');
 assert.ok(!('price' in item)&&!('retailPrice' in item),'Internal prices stay private');
 for(const key of ['energy','health']) assert.ok(item[key]===null||(Number.isFinite(item[key].consumption)&&Number.isFinite(item[key].restore)));
}
assert.equal(data.items.filter(i=>i.energy===null).length,6);
assert.equal(data.items.find(i=>i.id==='ressource_straw').health.consumption,10);
assert.equal(data.items.find(i=>i.id==='ressource_Fuel').bodySlot,'Right_Hand_Weapon');
const recipes=require('../data/build-recipes.json').recipes;
const search=require('../assets/js/search-core.js');
for(const prefix of ['','zh/']) {
 const html=fs.readFileSync(path.join(root,prefix+'database/materials.html'),'utf8');
 for(const item of data.items.filter(i=>i.materialId)) {
  assert.ok(html.includes(`data-resource-id="${item.id}"`),`${prefix}: material settings are visible`);
  const uses=recipes.flatMap(r=>r.materials.filter(m=>m.id===item.id).map(m=>[r.id,m.quantity]));
  for(const [id,qty] of uses) assert.ok(html.includes(`data-resource-use="${item.id}:${id}" data-quantity="${qty}"`),`${prefix}: ${item.id} → ${id} must show its exact quantity`);
  assert.equal((html.match(new RegExp(`data-resource-use="${item.id}:`, 'g'))||[]).length,uses.length,'No missing or duplicate material uses');
  for(const offer of require('../data/build-shops.json').offers.filter(o=>o.itemId===item.id)) assert.ok(html.includes(`href="/${prefix}guides/resources-and-materials#offer-${offer.id}"`),'Matched shops must be reachable from material profiles');
 }
 const guide=fs.readFileSync(path.join(root,prefix+'guides/resources-and-materials.html'),'utf8');
 for(const item of data.items.filter(i=>!i.materialId)) {
  assert.ok(guide.includes(`id="resource-${item.id}"`),'Water, energy and fuel need real readable profiles');
  assert.ok(guide.includes(`data-resource-id="${item.id}"`));
  assert.ok(guide.includes(`data-search-title="${prefix?item.zhName:item.name}"`));
 }
 const hub=fs.readFileSync(path.join(root,prefix+'database.html'),'utf8');
 assert.ok(hub.includes(`href="/${prefix}guides/resources-and-materials#resource-definitions"`),'Resource profiles need a database entrance');
 const knowledge=JSON.parse(fs.readFileSync(path.join(root,prefix+'knowledge-index.json'),'utf8'));
 const index=JSON.parse(fs.readFileSync(path.join(root,prefix+'search-index.json'),'utf8'));
 for(const item of data.items) {
  const expected=`/${prefix}${item.materialId?'database/materials#'+item.materialId:'guides/resources-and-materials#resource-'+item.id}`;
  assert.equal(search.searchDocuments(index,prefix?item.zhName:item.name,12)[0]?.url,expected,'Exact resource names must open their full profiles');
 }
 for(const alias of prefix?['锆矿','原木']:['Zirconite','Wood Log']) {
  const material=alias==='原木'||alias==='Wood Log'?'wood-log':'zirconite';
  assert.equal(search.searchDocuments(index,alias,12)[0]?.url,`/${prefix}database/materials#${material}`,'Existing resource aliases must lead to the same complete profile');
 }
 for(const item of data.items.filter(i=>i.materialId)) {
  const entity=knowledge.entities.find(e=>e.id===`material:${item.materialId}`);
  assert.ok(entity.aliases.includes(item.name)&&entity.aliases.includes(item.zhName),'Native material names must find the existing dossier');
  assert.ok(entity.facts.some(f=>f.evidenceLevel==='build-observed'&&f.sourceIds.includes(item.sourceId)),'Dossiers must use the resource configuration with its own evidence');
 }
}
console.log('PASS: resource definitions and complete material recipe uses retain source boundaries.');
