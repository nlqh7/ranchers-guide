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
const standaloneMaterials=new Set(['stone','wood-log','hay']);
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
 const missingTools=guide.match(/<details\b[^>]*id="missing-tools"[^>]*>[\s\S]*?<\/details>/)?.[0]||'';
 assert.ok(missingTools.includes('data-search-entry'),`${prefix}: missing tools must have a directly searchable answer`);
 assert.match(missingTools,prefix?/市政厅[\s\S]*补买/:/City Hall[\s\S]*replacement/i,`${prefix}: give the supported replacement route`);
 assert.ok(missingTools.includes(`href="/${prefix}map#city-hall"`),`${prefix}: the answer needs a localized City Hall map link`);
 assert.ok(missingTools.includes('567045839109751880'),`${prefix}: retain the actual Missing Tools reply`);
 assert.doesNotMatch(missingTools,/confirmed (?:buying|success)|确认(?:买到|购买成功)/i,`${prefix}: the player only said they would go, not that buying succeeded`);
 const generalStore=guide.match(/<details\b[^>]*id="general-store"[^>]*>[\s\S]*?<\/details>/)?.[0]||'';
 assert.match(generalStore,/General Store[\s\S]*Leafy Markets/i,`${prefix}: explain the shop alias instead of inventing a new map location`);
 assert.ok(generalStore.includes(`href="/${prefix}map#leafy-market"`)&&generalStore.includes('href="#shop-seed-store"'),`${prefix}: connect the market map and existing listing`);
 assert.ok(generalStore.includes('592942202593765840'),`${prefix}: retain the September shop clarification`);
 const charcoalAnswer=guide.match(/<section\b[^>]*id="charcoal"[^>]*>[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(charcoalAnswer.includes('592942202593765840'),`${prefix}: Charcoal has a direct September staff source`);
 assert.match(charcoalAnswer,prefix?/燃烧木材[\s\S]*按键、计时和产量/:/burning wood[\s\S]*controls, timing or yield/i,`${prefix}: separate the supported method from unverified details`);
 assert.doesNotMatch(guide,/retained record has no direct public post URL|现有存档没有保留直接公开帖子链接/,'Do not hide the newly available direct source behind the old missing-source claim');
 const animalGuide=fs.readFileSync(path.join(root,prefix+'guides/animal-guide.html'),'utf8');
 assert.match(guide,prefix?/牧场外正常(?:敲石|采集石头)[\s\S]{0,45}不会触发警察追逐/:/normal wood and stone gathering outside the ranch[\s\S]{0,70}does not trigger a police chase/i,`${prefix}: normal off-ranch gathering must follow the current no-chase rule`);
 assert.match(guide,prefix?/临时[\s\S]*早于 0\.8\.10\.868/:/temporary[\s\S]*predates 0\.8\.10\.868/i,`${prefix}: preserve the temporary update boundary and mark the older report as historical`);
 const haySection=guide.split(prefix?'<h2 id="hay">':'<h2 id="hay">')[1]?.split('<h2')[0]||'';
 assert.match(haySection,prefix?/野草[\s\S]*任何生长阶段[\s\S]*早于抢先体验[\s\S]*当前版本玩家报告/:/wild grass[\s\S]*any growth stage[\s\S]*predates Early Access[\s\S]*current-build player report/i,`${prefix}: Hay route must lead with the dated official grass method and retain the current-build lead as unverified`);
 const hayQuickAnswer=guide.match(prefix?/<strong>干草：<\/strong>([^<]+)/:/<strong>Hay:<\/strong>([^<]+)/)?.[1]||'';
 assert.match(hayQuickAnswer,prefix?/先.{0,12}野草[\s\S]*早于抢先体验[\s\S]*先查背包/i:/try.{0,40}wild grass[\s\S]*predates Early Access[\s\S]*check your inventory/i,`${prefix}: the page summary must not contradict the actionable historical-first route`);
 assert.match(guide,prefix?/干草 Hay<\/strong><\/td><td>先.{0,12}野草[\s\S]*早于抢先体验/:/Hay<\/strong><\/td><td>Try.{0,40}wild grass[\s\S]*pre-EA/i,`${prefix}: the gathering table must use the same Hay recommendation as the detailed guide`);
 assert.doesNotMatch(animalGuide,/matches current-build behavior reported by players|与玩家报告的当前版本行为一致/i,`${prefix}: pre-EA Hay guidance must not be presented as current-build confirmed`);
 for(const item of data.items.filter(i=>!i.materialId)) {
  assert.ok(guide.includes(`id="resource-${item.id}"`),'Water, energy and fuel need real readable profiles');
  assert.ok(guide.includes(`data-resource-id="${item.id}"`));
  assert.ok(guide.includes(`data-search-title="${prefix?item.zhName:item.name}"`));
 }
 const hub=fs.readFileSync(path.join(root,prefix+'database.html'),'utf8');
 assert.ok(hub.includes(`href="/${prefix}guides/resources-and-materials#resource-definitions"`),'Resource profiles need a database entrance');
 const knowledge=JSON.parse(fs.readFileSync(path.join(root,prefix+'knowledge-index.json'),'utf8'));
 const index=JSON.parse(fs.readFileSync(path.join(root,prefix+'search-index.json'),'utf8'));
 for(const [query,anchor] of (prefix?[['锄头丢了','missing-tools'],['工具不见','missing-tools'],['General Store','general-store'],['木炭在哪里买','charcoal']]:[['lost hoe','missing-tools'],['missing tools','missing-tools'],['General Store','general-store'],['buy charcoal','charcoal']])) {
  assert.equal(search.searchDocuments(index,query,1)[0]?.url,`/${prefix}guides/resources-and-materials#${anchor}`,`${prefix}: ${query} should open the actionable answer, not a raw tool record`);
 }
 const storeMatches=search.searchDocuments(index,'General Store',12);
 assert.equal(search.dossierSupportsExactAnswer({route:`/${prefix}map#youssefs-stand`},'General Store',storeMatches),false,`${prefix}: the visible answer must not be preceded by the unrelated old stall card`);
 for(const item of data.items) {
  const expected=`/${prefix}${item.materialId?(standaloneMaterials.has(item.materialId)?'database/materials/'+item.materialId+'#'+item.materialId:'database/materials#'+item.materialId):'guides/resources-and-materials#resource-'+item.id}`;
  assert.equal(search.searchDocuments(index,prefix?item.zhName:item.name,12)[0]?.url,expected,'Exact resource names must open their full profiles');
 }
 for(const alias of prefix?['锆矿','原木']:['Zirconite','Wood Log']) {
  const material=alias==='原木'||alias==='Wood Log'?'wood-log':'zirconite';
  const expectedAlias=standaloneMaterials.has(material)?`/${prefix}database/materials/${material}#${material}`:`/${prefix}database/materials#${material}`;
  assert.equal(search.searchDocuments(index,alias,12)[0]?.url,expectedAlias,'Existing resource aliases must lead to the same complete profile');
 }
 for(const item of data.items.filter(i=>i.materialId)) {
  const entity=knowledge.entities.find(e=>e.id===`material:${item.materialId}`);
  assert.ok(entity.aliases.includes(item.name)&&entity.aliases.includes(item.zhName),'Native material names must find the existing dossier');
  assert.ok(entity.facts.some(f=>f.evidenceLevel==='build-observed'&&f.sourceIds.includes(item.sourceId)),'Dossiers must use the resource configuration with its own evidence');
 }
}
console.log('PASS: resource definitions and complete material recipe uses retain source boundaries.');
