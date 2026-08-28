const fs = require('node:fs');
const path = require('node:path');
const data = require('../data/build-shops.json');
const recipes = require('../data/build-recipes.json');
const equipment = require('../data/build-equipment.json');
const consumables = require('../data/build-consumables.json');
const farmInputs = require('../data/crops.json').inputs;
const icons = require('../data/item-icons.json').icons;
const root = path.resolve(__dirname, '..');
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const materialRoutes = {ressource_wood:'wood-log',ressource_rock_simple:'stone',ressource_straw:'hay'};
const sections = {supplies:['Supplies','物资'],generators:['Power generation','发电设备'],equipment:['Equipment','设备'],buildings:['Buildings','建筑'],animals:['Animals','动物'],'two-wheel':['Two-wheel vehicles','两轮车辆'],'four-wheel':['Four-wheel vehicles','四轮车辆'],vip:['Special vehicles','特殊车辆'],cars:['Cars','汽车'],vehicles:['Vehicles','车辆'],seeds:['Seeds & fertilizer','种子与肥料'],produce:['Produce','农产品'],groceries:['Groceries','杂货']};
const seasons = {AllTheTime:['All seasons','全年'],Spring:['Spring','春季'],Summer:['Summer','夏季'],Autumn:['Autumn','秋季'],Winter:['Winter','冬季']};

function render(locale, buildingOnly=false) {
  const zh = locale === 'zh', prefix = zh ? '/zh' : '';
  const name = item => zh ? item.zhName : item.name;
  const item = id => data.items.find(i => i.id === id);
  const image = id => {
    const icon = icons.find(i => i.sourceItemId === id);
    return icon ? `<img src="${icon.src}" width="28" height="28" alt="" loading="lazy" decoding="async">` : '';
  };
  const materials = offer => `<ul class="recipe-ingredients">${offer.materials.map(m => `<li><a href="${prefix}/database/materials#${materialRoutes[m.id]}">${image(m.id)}<span>${esc(name(item(m.id)))}</span><strong>× ${m.quantity}</strong></a></li>`).join('')}</ul>`;
  const row = offer => {
    const entry = item(offer.itemId);
    const id = buildingOnly ? `shop-plan-${entry.id}` : `offer-${offer.id}`;
    const link = buildingOnly ? `${prefix}/guides/resources-and-materials#offer-${offer.id}` : `#${id}`;
    const hasRecipe = recipes.recipes.some(r => r.id === entry.id);
    const equipmentLink = !buildingOnly && equipment.equipment.some(e=>e.id===entry.id) ? `<a class="shop-recipe-link" href="${prefix}/guides/electricity-power#equipment-${entry.id}">${zh?'查看四季水电配置':'Seasonal power & water values'} →</a>` : '';
    const consumableLink = !buildingOnly && consumables.items.some(i=>i.id===entry.id) ? `<a class="shop-recipe-link" href="#food-${entry.id}">${zh?'查看消耗品配置':'Consumable settings'} →</a>` : '';
    const farmInput = farmInputs.find(i => i.buildInput?.sourceItemId === entry.id);
    const farmInputLink = !buildingOnly && farmInput ? `<a class="shop-recipe-link" href="${prefix}/database/crops#${farmInput.id}">${zh?'查看肥料资料':'Fertilizer details'} →</a>` : '';
    const query = `${entry.name} ${entry.zhName} ${seasons[offer.season].join(' ')} ${offer.materials.map(m=>`${item(m.id).name} ${item(m.id).zhName}`).join(' ')}`;
    const searchAttrs = buildingOnly || farmInput ? '' : ` data-search-entry data-search-title="${esc(name(entry))}" data-search-tags="${esc(query)}" data-search-status="${zh ? '游戏构建配置' : 'Game-build configuration'} · ${esc(name(data.shops.find(s=>s.id===offer.shopId)))}"`;
    return `<tr id="${id}" data-shop-row data-query="${esc(query)}"${searchAttrs}><th scope="row"><a href="${link}">${image(entry.id)}<span>${esc(name(entry))}</span></a></th><td>${buildingOnly ? '' : `<span class="recipe-muted">${sections[offer.section][zh?1:0]} · ${seasons[offer.season][zh?1:0]}</span>`}${offer.materials.length ? materials(offer) : ''}${offer.questRequirements.length ? `<small class="shop-condition">${zh ? '含任务条件，解锁时机未确认' : 'Quest condition; unlock timing unverified'}</small>` : ''}${equipmentLink}${consumableLink}${farmInputLink}${hasRecipe && !buildingOnly ? `<a class="shop-recipe-link" href="${prefix}/guides/crafting-guide#recipe-${entry.id}">${zh ? '查看制作材料' : 'Crafting ingredients'} →</a>` : ''}</td></tr>`;
  };
  const table = (offers,title) => `<div class="recipe-table-wrap" role="region" aria-label="${esc(title)}" tabindex="0"><table class="recipe-table"><thead><tr><th scope="col">${zh?'物品':'Item'}</th><th scope="col">${buildingOnly ? (zh?'所需材料':'Materials needed') : (zh?'分类、季节与条件':'Category, season & conditions')}</th></tr></thead><tbody>${offers.map(row).join('\n')}</tbody></table></div>`;
  const title = buildingOnly ? (zh?'建筑商店材料表':'Building-store material requirements') : (zh?'商店商品查阅':'Shop item lookup');
  const body = buildingOnly ? table(data.offers.filter(o=>o.materials.length),title) : `<div class="recipe-controls"><label>${zh?'查找物品或材料':'Find an item or material'}<input type="search" data-shop-query placeholder="${zh?'例如：鸡舍、太阳能、草莓':'e.g. Coop, Solar, Strawberry'}"></label><label>${zh?'商店':'Shop'}<select data-shop-category><option value="all">${zh?'全部商店':'All shops'}</option>${data.shops.map(s=>`<option value="${s.id}">${esc(name(s))}</option>`).join('')}</select></label></div><p data-shop-empty hidden role="status">${zh?'没有匹配的商品。':'No matching listings.'}</p>${data.shops.map((shop,index)=>{
    const offers = data.offers.filter(o=>o.shopId===shop.id);
    const named = offers.filter(o=>item(o.itemId).name);
    const unresolved = offers.filter(o=>!item(o.itemId).name);
    return `<details class="shop-group" id="shop-${shop.id}" data-shop-group="${shop.id}"${index===0?' open':''}><summary>${esc(name(shop))}</summary>${table(named,name(shop))}${unresolved.length ? `<details class="shop-unresolved"><summary>${zh?'未匹配名称的车辆引用':'Unresolved vehicle references'}</summary><p>${zh?'商店表还引用以下内部ID，但没有匹配的物品定义与名称；不将它们当作已确认车型。':'These shop IDs have no matching item definition or name. They are not confirmed vehicle models.'}</p><ul>${unresolved.map(o=>`<li id="offer-${o.id}"><code>${esc(o.itemId)}</code></li>`).join('')}</ul></details>`:''}</details>`;
  }).join('\n')}`;
  return `<!-- BEGIN SHOP REFERENCE -->
<section class="crafting-reference shop-reference"${buildingOnly?'':' data-shop-reference'} aria-label="${title}">
<h2 id="${buildingOnly?'shop-building-materials':'shops'}">${title}</h2>
<p class="recipe-boundary">${zh?'站长整理 · 游戏文件配置。这里列出商店商品与材料条件，不保证当前库存，也不代表完整售价。':'Editor-collected game configuration: shop listings and resource conditions, not guaranteed stock or the full purchase price.'}</p>
${body}
<details class="recipe-sources"><summary>${zh?'资料来源与可用性':'Sources & availability'}</summary><p>${zh?'非官方资料。商品名称逐项核对游戏双语文本；商店标题按源表类型描述，未推测店主、营业时间或精确地点。季节为商店配置分组，不是种植季节。':'Unofficial reference. Item names are matched to bilingual game text. Shop headings describe source categories; no owner, opening time or precise location is inferred. Seasons describe shop sections, not growing seasons.'} ${data.build} · Steam ${data.steamBuild}.</p><p>${zh?'不从 Demo 标记、内部价格或任务状态推断运行时可用性。材料条件来自商店记录，与制作配方分开；空材料条件不代表免费。':'Demo flags, internal prices and quest states do not establish runtime availability. Shop resource conditions are distinct from crafting recipes; an empty condition does not mean an item is free.'}</p><p>${zh?'来源：':'Sources: '}${Object.values(data.sources).filter(s=>!buildingOnly || ['Architect','Owned-build item localization'].includes(s.title)).map(s=>esc(s.title)).join(', ')}. <a href="${prefix}/methodology">${zh?'验证方法':'Methodology'}</a></p></details>
</section>
<!-- END SHOP REFERENCE -->`;
}

let stale = false;
for(const locale of ['en','zh']) for(const route of ['guides/resources-and-materials.html','guides/building-construction.html','tools/ranch-checklist.html']) {
  const file = path.join(root,locale==='zh'?'zh':'',route);
  const before = fs.readFileSync(file,'utf8');
  if(!before.includes('<!-- BEGIN SHOP REFERENCE -->')) throw new Error(`Missing shop block: ${file}`);
  const after = before.replace(/<!-- BEGIN SHOP REFERENCE -->[\s\S]*?<!-- END SHOP REFERENCE -->/,render(locale,!route.includes('resources-and-materials')));
  if(before!==after) {
    if(process.argv.includes('--check')) { console.error(`STALE: ${file}`);stale=true; }
    else fs.writeFileSync(file,after);
  }
}
if(stale) process.exitCode=1;
else console.log('PASS: bilingual shop catalogues and building material requirements are synchronized.');
