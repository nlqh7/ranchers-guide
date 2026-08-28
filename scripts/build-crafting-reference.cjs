const fs = require('node:fs');
const path = require('node:path');
const data = require('../data/build-recipes.json');
const shops = require('../data/build-shops.json');
const farmEquipment = require('../data/build-farm-equipment.json').equipment;
const icons = require('../data/item-icons.json').icons;
const root = path.resolve(__dirname, '..');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const groups = {essentials:['Essentials', '基础制作'], farming:['Farming', '农场设施'], building:['Building parts', '建筑部件'], furniture:['Furniture', '家具'], decoration:['Decoration', '装饰'], tools:['Tools & equipment', '工具与装备']};
const materialRoutes = {ressource_wood:'wood-log', ressource_rock_simple:'stone', ressource_straw:'hay', ressource_coal:'charcoal', ressource_zerkonite:'zirconite'};
const heldSlots = {Left_Hand_Weapon:['Left hand','左手'],Right_Hand_Weapon:['Right hand','右手'],TwoHandHolder:['Two-hand holder','双手持物']};

function render(locale, compact = false) {
  const zh = locale === 'zh';
  const prefix = zh ? '/zh' : '';
  const name = row => zh ? row.zhName : row.name;
  const title = zh ? '制作配方与工具' : 'Recipes & tools';
  const rowId = row => `${row.materials ? 'recipe' : 'tool'}-${row.id}`;
  const materials = recipe => `<ul class="recipe-ingredients">${recipe.materials.map(m => {
    const entry = data.ingredients.find(i => i.id === m.id);
    const icon = icons.find(i => i.sourceItemId === m.id);
    return `<li><a href="${prefix}/database/materials#${materialRoutes[m.id]}">${icon ? `<img src="${icon.src}" width="28" height="28" alt="" loading="lazy" decoding="async">` : ''}<span>${esc(name(entry))}</span><strong>× ${m.quantity}</strong></a></li>`;
  }).join('')}</ul>`;
  const renderRow = (row, isTool = false) => {
    const recipe = isTool ? data.recipes.find(r => r.id === row.id) : row;
    const offer = isTool ? shops.offers.find(o => o.itemId === row.id) : null;
    const seller = offer ? shops.shops.find(s=>s.id===offer.shopId) : null;
    const farmItem = !isTool && farmEquipment.some(i=>i.id===row.id);
    const farmLink = farmItem ? `<a class="shop-recipe-link" href="${prefix}/guides/farming-fields#farm-${row.id}">${zh?'查看设施资料':'Equipment details'} →</a>` : '';
    const toolLink = !isTool && data.tools.some(t=>t.id===row.id) ? `<a class="shop-recipe-link" href="${compact?`${prefix}/guides/crafting-guide`:''}#tool-${row.id}">${zh?'查看工具属性':'Tool settings'} →</a>` : '';
    const shopLink = offer ? `<a class="shop-recipe-link" href="${prefix}/guides/resources-and-materials#offer-${offer.id}">${zh ? '商店配置：' : 'Shop listing: '}${esc(name(seller))} →</a>` : '';
    const settings = isTool ? `<p class="recipe-muted tool-settings">${row.energy ? `<span data-energy-consumption="${row.energy.consumption}">${zh?'耗能配置：':'Energy use setting: '}${row.energy.consumption}</span>${row.energy.supply ? ` · ${zh?'恢复配置：':'Restore setting: '}${row.energy.supply}` : ''}` : `<span data-energy-missing>${zh?'耗能字段未收录':'Energy field not listed'}</span>`}<br>${zh?'可堆叠：':'Stackable: '}${row.stackable?(zh?'是':'Yes'):(zh?'否':'No')} · ${heldSlots[row.bodySlot][zh?1:0]}</p>` : '';
    const requirement = (recipe ? materials(recipe) : `<span class="recipe-muted">${zh ? '配方表未收录' : 'No recipe in the extracted tables'}</span>`) + shopLink + settings + toolLink + farmLink;
    const workbench = recipe ? (recipe.workbench ? (zh ? '需要工作台' : 'Workbench required') : (zh ? '不要求工作台' : 'No workbench required')) : '';
    const quest = recipe?.questRequirements.length ? `<small>${zh ? '有任务条件，解锁时机未确认' : 'Quest condition; unlock timing unverified'}</small>` : '';
    return `<tr id="${rowId(row)}" data-recipe-row data-query="${esc(`${row.name} ${row.zhName} ${(recipe?.materials || []).map(m => { const i = data.ingredients.find(i => i.id === m.id); return `${i.name} ${i.zhName}`; }).join(' ')}`)}"${compact || (isTool && recipe) || farmItem ? '' : ` data-search-entry data-search-title="${esc(name(row))}" data-search-tags="${esc(`${row.name} ${row.zhName} crafting recipe tools 制作 配方 工具`)}" data-search-status="${zh ? '游戏构建配置' : 'Game-build configuration'}"`}><th scope="row"><a href="${compact ? `${prefix}/guides/crafting-guide` : ''}#${rowId(row)}">${esc(name(row))}</a>${workbench ? `<small>${workbench}</small>` : ''}${quest}</th><td>${requirement}</td></tr>`;
  };
  const selectedGroups = Object.entries(groups).filter(([id]) => !compact || ['essentials', 'farming', 'building'].includes(id));
  return `<!-- BEGIN CRAFTING REFERENCE -->
<section class="crafting-reference" data-crafting-reference aria-label="${title}">
  <p class="recipe-boundary">${zh ? '站长整理 · 游戏文件配置。材料数量与工作台要求来自原生记录；是否已解锁、可获得仍以当前存档为准。' : 'Editor-collected game configuration. Ingredients and workbench requirements come from native records; availability and unlocks depend on your save.'}</p>
  <div class="recipe-controls"><label>${zh ? '查找物品或材料' : 'Find an item or material'}<input type="search" data-recipe-query placeholder="${zh ? '例如：水井、干草、木栅栏' : 'e.g. Well, Hay, Wood Fence'}"></label><label>${zh ? '分类' : 'Category'}<select data-recipe-category><option value="all">${zh ? '全部' : 'All'}</option>${selectedGroups.map(([id, labels]) => `<option value="${id}">${labels[zh ? 1 : 0]}</option>`).join('')}</select></label></div>
  <p data-recipe-empty hidden role="status">${zh ? '没有匹配的条目，试试其他名称或分类。' : 'No matching entries. Try another name or category.'}</p>
  ${selectedGroups.map(([id, labels]) => `<section data-recipe-group="${id}"><h2 id="recipes-${id}">${labels[zh ? 1 : 0]}</h2>${id==='tools'?`<p class="recipe-boundary">${zh?'工具属性为游戏文件配置。耗能值不是已实测的每次操作消耗，也不是牧场用电；未收录不等于零消耗。堆叠上限未验证。':'Tool attributes are game-file settings. Energy values are not measured per-action costs or ranch electricity use; an absent field is not zero consumption. Stack limits are unverified.'}</p>`:''}<div class="recipe-table-wrap" role="region" aria-label="${labels[zh ? 1 : 0]}" tabindex="0"><table class="recipe-table"><thead><tr><th scope="col">${zh ? '物品' : 'Item'}</th><th scope="col">${id==='tools'?(zh?'材料、商店与属性':'Materials, shop & settings'):(zh ? '所需材料' : 'Materials needed')}</th></tr></thead><tbody>${(id === 'tools' ? data.tools : data.recipes.filter(r => r.category === id)).map(r => renderRow(r, id === 'tools')).join('\n')}</tbody></table></div></section>`).join('\n')}
  ${compact ? `<p><a class="recipe-more" href="${prefix}/guides/crafting-guide">${zh ? '查看全部配方、家具、装饰与工具 →' : 'All recipes, furniture, decoration & tools →'}</a></p>` : ''}
  <details class="recipe-sources"><summary>${zh ? '资料来源与可用性' : 'Sources & availability'}</summary><p>${zh ? '非官方资料。名称逐项匹配游戏的中英文文本，配方按原始物品 ID 对应材料。' : 'Unofficial reference. Names are matched to the game’s English and Chinese text; ingredients are linked by their original item IDs.'} ${esc(data.build)} · Steam ${esc(data.steamBuild)}.</p><p>${zh ? 'Demo 标记不代表现版本可获得；任务条件的状态值尚未解码，因此不推导解锁时机。配方表未收录不代表物品不存在或无法获得。' : 'Demo flags do not establish current availability. Quest-state values are not decoded, so no unlock order is inferred. An absent recipe does not mean an item is unavailable.'}</p><p>${zh ? '来源：' : 'Sources: '}${Object.values(data.sources).map(s => esc(s.title)).join(', ')}. <a href="${prefix}/methodology">${zh ? '验证方法' : 'Verification method'}</a></p></details>
</section>
<!-- END CRAFTING REFERENCE -->`.replace(/[ \t]+$/gm, '');
}

let stale = false;
for (const locale of ['en', 'zh']) {
  for (const route of ['guides/crafting-guide.html', 'guides/building-construction.html', 'tools/ranch-checklist.html']) {
    const file = path.join(root, locale === 'zh' ? 'zh' : '', route);
    const before = fs.readFileSync(file, 'utf8');
    if (!before.includes('<!-- BEGIN CRAFTING REFERENCE -->')) throw new Error(`Missing crafting block: ${file}`);
    const after = before.replace(/<!-- BEGIN CRAFTING REFERENCE -->[\s\S]*?<!-- END CRAFTING REFERENCE -->/, render(locale, !route.includes('crafting-guide')));
    if (before !== after) {
      if (process.argv.includes('--check')) { console.error(`STALE: ${file}`); stale = true; }
      else fs.writeFileSync(file, after);
    }
  }
}
if (stale) process.exitCode = 1;
else console.log('PASS: bilingual native recipe and tool tables are synchronized.');
