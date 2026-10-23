const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for(const locale of ['', 'zh/']){
 const page=fs.readFileSync(path.join(root,locale,'guides/resources-and-materials.html'),'utf8');
 assert.ok(/<script\b[^>]*src="[^"]*shop-reference\.js\?v=20261023-shop2"[^>]*\bdefer\b/.test(page),'Shop initialization must follow deferred shared navigation,so the language link exists');
}
// Search survives copied links and browser return without adding history per keystroke.
{
  const location = new URL('https://example.test/guides/resources-and-materials?q=Coop&shop=building&keep=1');
  const field = value => ({ value, addEventListener(event, handler) { this[event] = handler; } });
  const query = field('');
  const category = Object.assign(field('all'), { options: [{ value: 'all' }, { value: 'building' }] });
  const season = Object.assign(field('all'), { options: ['all', 'Spring', 'Summer', 'Autumn', 'Winter'].map(value => ({ value })) });
  const empty = {};
  const rows = ['Coop 鸡舍 Stone 石头 Wood Log 原木 Hay 干草', 'Well 水井 Stone 石头'].map(query => ({ dataset: { query, shopListingSeason: 'AllTheTime' } }));
  const group = { dataset: { shopGroup: 'building' }, querySelectorAll() { return rows; }, querySelector() { return null; } };
  const surface = { querySelector(s) { return ({ '[data-shop-query]': query, '[data-shop-category]': category, '[data-shop-season]': season, '[data-shop-empty]': empty })[s]; }, querySelectorAll() { return [group]; }, contains() { return false; } };
  const events = {};
  require('node:vm').runInNewContext(fs.readFileSync(path.join(root, 'assets/js/shop-reference.js'), 'utf8'), {
    document: { querySelectorAll(selector) { return selector==='[data-shop-reference]' ? [surface] : []; }, getElementById() { return null; } },
    location, URL, window: { addEventListener(e, fn) { events[e] = fn; } },
    history: { state: null, replaceState(_, title, href) { location.href = href; } }
  });
  assert.equal(query.value, 'Coop');
  assert.equal(category.value, 'building');
  query.value = 'Well'; query.input();
  assert.equal(location.searchParams.get('q'), 'Well');
  assert.equal(location.searchParams.get('keep'), '1');
  location.search = '?q=Seed&shop=invalid'; events.popstate();
  assert.equal(query.value, 'Seed');
  assert.equal(category.value, 'all');
  query.value = '  原木   STONE '; query.input();
  assert.deepEqual(rows.map(row => row.hidden), [false, true]);
  assert.equal(group.open, true);
  query.value = 'Stone missing'; query.input();
  assert.equal(empty.hidden, false);
  query.value = ''; query.input();
  assert.deepEqual(rows.map(row => row.hidden), [false, false]);
  rows.push({ dataset: { query: 'Carrot 胡萝卜', shopListingSeason: 'Spring' } });
  rows.push({ dataset: { query: 'Pumpkin 南瓜', shopListingSeason: 'Winter' } });
  location.search = '?season=Winter'; events.popstate();
  assert.equal(season.value, 'Winter');
  assert.deepEqual(rows.map(row => row.hidden), [false, false, true, false], 'Winter includes all-season stock but excludes spring-only listings');
  season.value = 'Spring'; season.change();
  assert.equal(location.searchParams.get('season'), 'Spring');
  assert.deepEqual(rows.map(row => row.hidden), [false, false, false, true]);
  location.search = '?season=bad'; events.popstate();
  assert.equal(season.value, 'all');
  assert.deepEqual(rows.map(row => row.hidden), [false, false, false, false]);
}
// A catalogue heading is not an item reveal: copied filters must survive #shops.
{
  const location = new URL('https://example.test/guides/resources-and-materials?q=Strawberry&shop=seed-store&season=Spring#shops');
  const control = value => ({value,addEventListener(event,fn){this[event]=fn;}});
  const query=control('');
  const category=Object.assign(control('all'),{options:['all','seed-store','building-store'].map(value=>({value}))});
  const season=Object.assign(control('all'),{options:['all','Spring','Summer'].map(value=>({value}))});
  const empty={};
  const rootNode={};
  const groups=['seed-store','building-store'].map(id=>({tagName:'DETAILS',dataset:{shopGroup:id},parentElement:rootNode,querySelector(){return null;}}));
  const rows=[{tagName:'TR',dataset:{query:'Strawberry seed',shopListingSeason:'Spring'},parentElement:groups[0]},
    {tagName:'TR',dataset:{query:'Coop',shopListingSeason:'AllTheTime'},parentElement:groups[1]}];
  groups.forEach(group=>{group.querySelectorAll=()=>rows.filter(row=>row.parentElement===group);group.contains=node=>group.querySelectorAll().includes(node);});
  const heading={tagName:'H2',parentElement:rootNode};
  [heading,...rows].forEach(node=>{node.scrollIntoView=options=>{assert.equal(options.behavior,'instant');};});
  Object.assign(rootNode,{contains:node=>node===heading||rows.includes(node)||groups.includes(node),querySelectorAll:()=>groups,
    querySelector:selector=>({'[data-shop-query]':query,'[data-shop-category]':category,'[data-shop-season]':season,'[data-shop-empty]':empty})[selector]});
  const targets={shops:heading,'shop-offer-coop':rows[1]};
  const languageBase='https://example.test/zh/guides/resources-and-materials';
  const languageLink={href:languageBase};
  const events={};
  require('node:vm').runInNewContext(fs.readFileSync(path.join(root,'assets/js/shop-reference.js'),'utf8'),{
    document:{querySelectorAll:selector=>selector==='[data-shop-reference]'?[rootNode]:selector==='.nav-language-link'?[languageLink]:[],getElementById:id=>targets[id]},location,URL,
    window:{addEventListener:(event,fn)=>{events[event]=fn;}},history:{state:null,replaceState:(_,title,href)=>{location.href=href;languageLink.href=languageBase;}}
  });
  assert.equal(category.value,'seed-store','The #shops heading must retain the selected shop instead of clearing every filter');
  assert.equal(query.value,'Strawberry');
  assert.equal(season.value,'Spring');
  assert.equal(location.searchParams.get('shop'),'seed-store');
  assert.equal(new URL(languageLink.href).searchParams.get('shop'),'seed-store','The initial language action must retain the chosen shop');
  assert.deepEqual(rows.map(row=>row.hidden),[false,true]);
  query.value='Strawberry seed';query.input();
  assert.equal(new URL(languageLink.href).searchParams.get('q'),'Strawberry seed','Language sync must run after the real shared history wrapper');
  assert.equal(location.hash,'#shops','Typing at the catalogue heading must keep the shared link anchored to the lookup');
  location.hash='#shop-offer-coop';events.hashchange();
  assert.equal(category.value,'all','An explicit item anchor still reveals an item hidden by filters');
  assert.equal(rows[1].hidden,false);
  assert.equal(groups[1].open,true);
  query.value='Coop';query.input();
  assert.equal(location.hash,'','Changing filters after a specific item reveal clears only that item anchor');
  location.href='https://example.test/guides/resources-and-materials?shop=seed-store&season=Spring#shops';events.popstate();
  assert.equal(category.value,'seed-store','Browser return to the catalogue restores its own filter state');
  assert.equal(season.value,'Spring');
}

const file = path.join(root, 'data/build-shops.json');
assert.ok(fs.existsSync(file), 'Shop configuration must be applied to public lookup data');
const data = JSON.parse(fs.readFileSync(file));
const greenhouseOffer=data.offers.find(offer=>offer.itemId==='Custum_GreenHouse_01');
for(const prefix of ['', 'zh/']){
 const farm=fs.readFileSync(path.join(root,prefix,'guides/farming-fields.html'),'utf8');
 const plan=farm.match(/<section\b[^>]*id="greenhouse-materials"[^>]*>[\s\S]*?<\/section>/)?.[0];
 assert.ok(plan,prefix+': existing greenhouse material configuration must be usable in the guide,not called wholly unknown');
 for(const material of greenhouseOffer.materials){
   const row=plan.split(`data-greenhouse-material="${material.id}"`)[1]?.split('</li>')[0];
   assert.ok(row?.includes(`× ${material.quantity}`),prefix+': each greenhouse material must keep its own source quantity');
 }
 assert.ok(plan.includes(`/${prefix}tools/ranch-checklist?building=${greenhouseOffer.id}#recipe-material-plan`),prefix+': pass the exact building to the existing material planner');
}
const seeds = require('../data/build-seeds.json').items;
const produce = require('../data/build-produce.json').items;
const placeables = require('../data/build-placeables.json').items;
const recipes = require('../data/build-recipes.json').recipes;
const miscItems = require('../data/build-misc-items.json').items;
const vehicles = require('../data/build-vehicles.json').items;
assert.equal(data.shops.length, 8);
assert.equal(data.offers.length, 139);
assert.equal(new Set(data.offers.map(o => o.id)).size, 139);
assert.equal(data.evidenceLevel, 'build-observed');
assert.equal(data.validity, 'unknown');
assert.deepEqual(data.unresolvedReferences.map(entry=>entry.id),['VIC_LadiesBike-02','VIC_DirtBike_01','VIC_DirtBike_02','VIC_CamperVan_04','VIC_4x4_01']);
for(const entry of data.unresolvedReferences) {
  assert.equal(entry.i2Name,false);
  assert.equal(entry.vehicleDefinition,false);
  assert.equal(entry.spriteAsset,true);
  assert.equal(entry.itemGraphicHeader,['VIC_CamperVan_04','VIC_4x4_01'].includes(entry.id));
  assert.equal(entry.disposition,'id-only-unresolved');
}
const buildings = data.offers.filter(o => o.materials.length);
assert.equal(buildings.length, 11);
const small = buildings.find(o => o.itemId === 'Custum_Barn_Weak_Small');
assert.deepEqual(small.materials, [{id:'ressource_rock_simple',quantity:15},{id:'ressource_wood',quantity:20},{id:'ressource_straw',quantity:15}]);
for (const offer of data.offers) {
  assert.ok(data.items.some(i => i.id === offer.itemId));
  assert.match(data.sources[offer.sourceId].rawSha256, /^[a-f0-9]{64}$/);
  assert.ok(!Object.hasOwn(offer, 'price'));
}
for (const prefix of ['', 'zh/']) {
  const index = JSON.parse(fs.readFileSync(path.join(root,prefix,'search-index.json')));
  const indexed = JSON.stringify(index);
  const html = fs.readFileSync(path.join(root,prefix,'guides/resources-and-materials.html'),'utf8');
  const unresolvedBlock=html.split('class="shop-unresolved"')[1]?.split('</details>')[0];
  for(const entry of data.unresolvedReferences) {
    assert.ok(unresolvedBlock?.includes(`<code>${entry.id}</code>`));
    assert.ok(unresolvedBlock.includes(prefix?(entry.itemGraphicHeader?'Sprite 与物品图形头记录':'仅 Sprite 资源'):(entry.itemGraphicHeader?'Sprite and item-graphic header records':'Sprite asset only')));
    assert.ok(!index.some(document=>document.url.includes(entry.id)),`${entry.id}: unresolved technical IDs are not searchable vehicle models`);
  }
  assert.match(unresolvedBlock,prefix?/技术资源痕迹不证明车型名称、可驾驶、可购买或当前生成/:/Technical asset traces do not establish a model name, drivability, purchase availability or current spawning/);
  for (const offer of data.offers) assert.ok(html.includes(`id="offer-${offer.id}"`), `Missing listing: ${prefix}${offer.id}`);
  for (const offer of data.offers) {
    const named = Boolean(data.items.find(i => i.id === offer.itemId).name);
    const profile = require('../data/crops.json').inputs.find(i => i.buildInput?.sourceItemId === offer.itemId);
    const resource = require('../data/build-resources.json').items.find(i => i.id === offer.itemId && i.materialId);
    const seed = seeds.find(i => i.id === offer.itemId && i.rosterStatus === 'current-roster');
    const produceItem = produce.find(i => i.id === offer.itemId);
    const placeable = placeables.find(i => i.id === offer.itemId);
    const miscItem = miscItems.find(i => i.id === offer.itemId);
    const vehicle = vehicles.find(i => i.id === offer.itemId);
    assert.equal(indexed.includes(`#offer-${offer.id}\"`), named && !profile && !resource && !seed && !produceItem && !placeable && !miscItem && !vehicle, `Named offers without a full profile remain indexed: ${offer.id}`);
    if (resource) {
      assert.ok(index.some(i => i.url === `/${prefix}database/materials#${resource.materialId}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`database/materials#${resource.materialId}`));
    }
    if (profile) {
      assert.ok(index.some(i => i.url === `/${prefix}database/crops#${profile.id}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`database/crops#${profile.id}`));
    }
    if (seed) {
      const detailRoute = ['red-lettuce', 'garlic', 'strawberry'].includes(seed.cropId)
        ? `/${prefix}database/crops/${seed.cropId}`
        : `/${prefix}database/crops#${seed.cropId}`;
      assert.ok(index.some(i => i.url === detailRoute));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`database/crops#${seed.cropId}`));
    }
    if (produceItem) {
      const target = produceItem.cropStatus === 'current-roster' ? produceItem.cropId : `seed-${produceItem.cropId}`;
      const detailRoute = ['red-lettuce', 'garlic', 'strawberry'].includes(target)
        ? `/${prefix}database/crops/${target}`
        : `/${prefix}database/crops#${target}`;
      assert.ok(index.some(i => i.url === detailRoute));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`database/crops#${target}`));
    }
    if (placeable) {
      const hasRecipe = recipes.some(recipe => recipe.id === placeable.id);
      const target = hasRecipe ? `recipe-${placeable.id}` : `placeable-${placeable.id}`;
      assert.ok(index.some(i => i.url === `/${prefix}guides/crafting-guide#${target}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`guides/crafting-guide#${target}`));
    }
    if (miscItem) {
      assert.ok(index.some(i => i.url === `/${prefix}guides/crafting-guide#tool-${miscItem.id}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`guides/crafting-guide#tool-${miscItem.id}`));
    }
    if (vehicle) {
      assert.ok(index.some(i => i.url === `/${prefix}guides/vehicles-transport#vehicle-${vehicle.id}`));
      assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`guides/vehicles-transport#vehicle-${vehicle.id}`));
    }
  }
  assert.match(html, /data-shop-query/);
  assert.match(html, /data-shop-category/);
  assert.match(html, /data-shop-season/);
  for (const offer of data.offers.filter(o => data.items.find(i => i.id === o.itemId).name)) {
    assert.ok(html.split(`id="offer-${offer.id}"`)[1]?.split('</tr>')[0].includes(`data-shop-listing-season="${offer.season}"`), 'Season filters must use the source field: ' + offer.id);
  }
  const tools = fs.readFileSync(path.join(root,prefix,'guides/crafting-guide.html'),'utf8');
  const axe = tools.split('id="tool-tools_axe_metal"')[1]?.split('</tr>')[0];
  assert.ok(axe?.includes('resources-and-materials#offer-building-store-allthetime-tools_axe_metal'), 'Axe lookup needs its configured shop destination');
  for (const route of ['guides/building-construction.html','tools/ranch-checklist.html']) {
    const page = fs.readFileSync(path.join(root,prefix,route),'utf8');
    for (const offer of buildings) {
      const row = page.split(`id="shop-plan-${offer.itemId}"`)[1]?.split('</tr>')[0];
      assert.ok(row, `Missing building: ${route} ${offer.itemId}`);
      for (const m of offer.materials) assert.ok(row.includes(`× ${m.quantity}</strong>`));
    }
    if (route === 'guides/building-construction.html') {
      assert.match(page, prefix ? /按动物选住所/ : /Choose a home by animal/);
      assert.match(page, prefix ? /鸡舍.*鸡/ : /Coop.*chickens/i);
      assert.match(page, prefix ? /谷仓.*牛.*山羊/ : /Barn.*cattle.*goats/i);
      assert.match(page, prefix ? /容量.*未核实/ : /capacity.*not verified/i);
      assert.match(page, /#shop-plan-Custum_Barn_Weak_Small/);
      assert.match(page, /#shop-plan-Custum_Barn_Strong_Small/);
    }
    if (route === 'guides/building-construction.html') {
      assert.match(page, prefix ? /按动物选住所/ : /Choose a home by animal/);
      assert.match(page, prefix ? /鸡舍.*鸡/ : /Coop.*chickens/i);
      assert.match(page, prefix ? /谷仓.*牛.*山羊/ : /Barn.*cattle.*goats/i);
      assert.match(page, prefix ? /容量.*未核实/ : /capacity.*not verified/i);
      assert.match(page, /#shop-plan-Custum_Barn_Weak_Small/);
      assert.match(page, /#shop-plan-Custum_Barn_Strong_Small/);
    }
  }
}
console.log('PASS: 139 source-linked vendor listings and 11 shop building requirements reach bilingual pages.');
