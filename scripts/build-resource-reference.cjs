const fs=require('node:fs');
const path=require('node:path');
const data=require('../data/build-resources.json');
const recipes=require('../data/build-recipes.json').recipes;
const shops=require('../data/build-shops.json');
const root=path.resolve(__dirname,'..');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups={essentials:['Basic crafting','基础制作'],farming:['Farm equipment','农用设施'],building:['Building parts','建筑部件'],furniture:['Furniture','家具'],decoration:['Decoration','装饰']};
const slots={NONE:['None','无'],TwoHandHolder:['Both hands','双手'],Right_Hand_Weapon:['Right hand','右手']};
function settings(item,zh) {
 const yn=value=>zh?(value?'是':'否'):(value?'Yes':'No');
 const pairs=[[zh?'可堆叠':'Stackable',yn(item.stackable)],[zh?'持握位置':'Held slot',slots[item.bodySlot][zh?1:0]]];
 const extra=[[zh?'可装备字段':'Equip flag',yn(item.equippable)],[zh?'可丢弃字段':'Drop flag',yn(item.droppable)],[zh?'可出售字段':'Sell flag',yn(item.sellable)],[zh?'原版分类':'Native category',item.classification==='FORAGING'?(zh?'采集':'Foraging'):(zh?'其他':'Other')],[zh?'稀有度字段':'Rarity field',item.rarity==='Bronze'?(zh?'青铜':'Bronze'):item.rarity]];
 const dl=values=>`<dl class="resource-settings">${values.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
 const stats=['energy','health'].map(key=>[key,item[key]]).map(([key,value])=>value?`${zh?(key==='energy'?'体力':'生命'):(key==='energy'?'Energy':'Health')}: ${zh?'消耗':'use'} ${value.consumption} · ${zh?'恢复':'restore'} ${value.restore}`:`${zh?(key==='energy'?'体力':'生命'):(key==='energy'?'Energy':'Health')}: ${zh?'未收录':'not recorded'}`).join(' / ');
 return `<div class="resource-config" data-resource-id="${item.id}"><p class="resource-note">${zh?'站长整理 · 游戏文件配置':'Editor-collected game configuration'}</p>${dl(pairs)}<details class="resource-details"><summary>${zh?'其他配置与来源':'Other settings & sources'}</summary>${dl(extra)}<p>${stats}</p><p>${zh?'字段不是实测效果；出售标志不代表已开放出售途径，稀有度不代表价格。未收录不等于零。':'Fields are not measured effects. A sell flag does not prove a working sale path; rarity does not establish price. Missing fields are not zero.'}</p><p>Ressources / ${data.sources[item.sourceId].asset} / ${data.sources[item.sourceId].pathId} · ${data.build} · Steam ${data.steamBuild}; I2. <a href="${zh?'/zh':''}/methodology">${zh?'验证方法':'Methodology'}</a></p></details></div>`;
}
function materialReference(materialId,zh) {
 const item=data.items.find(i=>i.materialId===materialId);
 if(!item)return '';
 const prefix=zh?'/zh':'';
 const uses=recipes.filter(r=>r.materials.some(m=>m.id===item.id));
 const listings=shops.offers.filter(o=>o.itemId===item.id);
 const shopLinks=listings.length?`<div class="resource-links"><span class="resource-note">${zh?'商店记录（库存未核实）：':'Shop records (stock unverified):'}</span>${listings.map(o=>{const seller=shops.shops.find(s=>s.id===o.shopId);return `<a href="${prefix}/guides/resources-and-materials#offer-${o.id}">${esc(zh?seller.zhName:seller.name)}</a>`;}).join('')}</div>`:'';
 return `${settings(item,zh)}${shopLinks}<div class="resource-uses"><h3>${zh?'制作用途':'Crafting uses'}</h3><p class="resource-note">${zh?'每项列出这种材料所需数量；点物品查看完整配方。工作台与解锁条件见配方页。':'Quantity of this material per recipe. Open an item for its full ingredients, workbench and unlock conditions.'}</p>${Object.entries(groups).map(([group,labels])=>{
 const rows=uses.filter(r=>r.category===group);
 if(!rows.length)return '';
 return `<details class="resource-details"${group==='essentials'||group==='farming'?' open':''}><summary>${labels[zh?1:0]}</summary><div class="resource-table-wrap" tabindex="0" role="region" aria-label="${esc(zh?item.zhName:item.name)} — ${labels[zh?1:0]}"><table class="resource-use-table"><thead><tr><th scope="col">${zh?'物品':'Item'}</th><th scope="col">${zh?'数量':'Quantity'}</th></tr></thead><tbody>${rows.map(r=>`<tr data-resource-use="${item.id}:${r.id}" data-quantity="${r.materials.find(m=>m.id===item.id).quantity}"><th scope="row"><a href="${prefix}/guides/crafting-guide#recipe-${r.id}">${esc(zh?r.zhName:r.name)}</a></th><td>× ${r.materials.find(m=>m.id===item.id).quantity}</td></tr>`).join('')}</tbody></table></div></details>`;
 }).join('')}</div>`;
}
module.exports={settings,materialReference};
function renderUtilities(zh) {
 const prefix=zh?'/zh':'';
 const notes={
  farm_water_1L:['The water resource is separate from water-producing equipment. The record does not establish a billing unit or rate.','水资源记录与供水设施分开；这个定义不能确认结算单位或水费。'],
  farm_energy_1KW:['This is the utility energy resource, not the character energy stat. Its ID does not establish a billing unit or rate.','这是公用能源资源，不是人物体力字段；内部名称不能确认结算单位或电费。'],
  ressource_Fuel:['A fuel-container definition with no match in the reviewed shop listings. Capacity, price and refuelling controls remain unverified.','原版燃料容器定义，尚未在已核对商店记录中匹配。容量、价格与加油操作仍待验证。']
 };
 const items=data.items.filter(i=>!i.materialId);
 return `<!-- BEGIN RESOURCE REFERENCE -->
<section class="resource-reference" aria-label="${zh?'水、能源与燃料':'Water, energy & fuel'}"><h2 id="resource-definitions">${zh?'水、能源与燃料':'Water, energy & fuel'}</h2><nav class="resource-links" aria-label="${zh?'资源条目':'Resource entries'}">${items.map(i=>`<a href="#resource-${i.id}">${esc(zh?i.zhName:i.name)}</a>`).join('')}</nav>${items.map(i=>`<section class="resource-profile" id="resource-${i.id}" data-search-entry data-search-title="${esc(zh?i.zhName:i.name)}" data-search-tags="${esc(i.name+' '+i.zhName+' resource 资源 '+(i.id==='ressource_Fuel'?'fuel can 燃油 燃料罐':i.id==='farm_energy_1KW'?'electricity utility power 电力 能源':'water 水'))}" data-search-status="${zh?'游戏构建配置':'Game-build configuration'}"><h3>${esc(zh?i.zhName:i.name)}</h3><p>${notes[i.id][zh?1:0]}</p>${settings(i,zh)}${i.id!=='ressource_Fuel'?`<div class="resource-links"><a href="${prefix}/guides/electricity-power#equipment">${zh?'水电设备配置':'Power & water equipment'}</a><a href="${prefix}/guides/electricity-power#two-paths">${zh?'水电合同与账单':'Contracts & billing'}</a></div>`:''}</section>`).join('\n')}<p class="resource-note">${zh?'非官方资料；以上为游戏文件定义，不是已实测的运行时机制。':'Unofficial reference: game-file definitions, not tested runtime mechanics.'}</p></section>
<!-- END RESOURCE REFERENCE -->`;
}
if(require.main===module) {
 let stale=false;
 for(const zh of [false,true]) {
  const file=path.join(root,zh?'zh':'','guides/resources-and-materials.html');
  const before=fs.readFileSync(file,'utf8');
  if(!before.includes('<!-- BEGIN RESOURCE REFERENCE -->'))throw new Error('Resource block is missing: '+file);
  const after=before.replace(/<!-- BEGIN RESOURCE REFERENCE -->[\s\S]*?<!-- END RESOURCE REFERENCE -->/,renderUtilities(zh));
  if(after!==before) {
   if(process.argv.includes('--check'))stale=true;
   else fs.writeFileSync(file,after);
  }
 }
 if(stale){console.error('Resource profiles are stale.');process.exitCode=1;}
 else console.log('PASS: water, energy and fuel profiles are synchronized.');
}
