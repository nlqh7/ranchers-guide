const fs = require('node:fs');
const path = require('node:path');
const data = require('../data/build-recipes.json');
const shops = require('../data/build-shops.json');
const farmEquipment = require('../data/build-farm-equipment.json').equipment;
const placeables = require('../data/build-placeables.json');
const miscItems = require('../data/build-misc-items.json');
const projectiles = require('../data/build-projectiles.json');
const icons = require('../data/item-icons.json').icons;
const root = path.resolve(__dirname, '..');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const groups = {essentials:['Essentials', '基础制作'], farming:['Farming', '农场设施'], building:['Building parts', '建筑部件'], furniture:['Furniture', '家具'], decoration:['Decoration', '装饰'], tools:['Tools & equipment', '工具与装备'], native:['Source-only placeables', '仅源内可放置物']};
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
  const placeableSettings = item => {
    if (!item) return '';
    const building = item.building;
    const sleep = building.sleep ? `<br>${zh ? '睡眠恢复配置' : 'Sleep restore settings'}: ${zh ? '体力' : 'Energy'} ${building.sleep.energyRestorePercent}% · ${zh ? '生命' : 'Health'} ${building.sleep.healthRestorePercent}%` : '';
    const utilities = item.utilities ? `<br>${zh ? '四季耗水/补水配置' : 'Seasonal water use/restore'} ${item.utilities.water.consumption.join('/')} · ${item.utilities.water.restore.join('/')}<br>${zh ? '四季耗电/供电配置' : 'Seasonal power use/supply'} ${item.utilities.electricity.consumption.join('/')} · ${item.utilities.electricity.restore.join('/')}` : '';
    const grid = item.grid ? `<br>${zh ? '格网参数 X/Y/Z' : 'Grid parameters X/Y/Z'}: ${item.grid.x}/${item.grid.y}/${item.grid.z} · ${zh ? '显示格网标志' : 'Show-grid flag'}: ${item.grid.showGrid ? (zh ? '是' : 'Yes') : (zh ? '否' : 'No')}` : '';
    const source = placeables.sources[item.sourceId]?.title;
    return `<details class="recipe-item-settings" data-placeable-id="${item.id}"><summary>${zh ? '原生物品配置' : 'Native item settings'}</summary><p class="recipe-muted">${source ? `${zh ? '来源表' : 'Source table'}: ${esc(source)}<br>` : ''}${zh ? '建造步数字段' : 'Build-step field'}: ${building.buildSteps} · ${zh ? '默认健康字段' : 'Default-health field'}: ${building.defaultHealth}<br>${zh ? '可堆叠' : 'Stackable'}: ${item.stackable ? (zh ? '是' : 'Yes') : (zh ? '否' : 'No')} · ${zh ? '可丢弃' : 'Droppable'}: ${item.droppable ? (zh ? '是' : 'Yes') : (zh ? '否' : 'No')} · ${zh ? '可出售标志' : 'Sellable flag'}: ${item.sellable ? (zh ? '是' : 'Yes') : (zh ? '否' : 'No')}${sleep}${utilities}${grid}</p><p class="recipe-muted">${zh ? '这些是游戏文件字段，不是已实测耐久、施工次数、睡眠效果、用量单位、格网尺寸、覆盖范围或售价。' : 'These are game-file fields, not measured durability, construction actions, sleep effects, utility units, grid dimensions, coverage or prices.'}</p></details>`;
  };
  const renderUnmatchedPlaceable = item => `<tr id="placeable-${item.id}" data-recipe-row data-query="${esc(`${item.name} ${item.zhName}`)}"${compact ? '' : ` data-search-entry data-search-title="${esc(name(item))}" data-search-tags="${esc(`${item.name} ${item.zhName} placeable building configuration 可放置 建造 配置`)}" data-search-status="${zh ? '游戏构建配置' : 'Game-build configuration'}"`}><th scope="row"><a href="${compact ? `${prefix}/guides/crafting-guide` : ''}#placeable-${item.id}">${esc(name(item))}</a><small>${zh ? '配方表未收录' : 'No recipe in the extracted tables'}</small></th><td>${placeableSettings(item)}</td></tr>`;
  const projectileReference = `<details class="recipe-sources" data-projectile-reference><summary>${zh ? '来源表中的发射物名称' : 'Projectile names retained in the source table'}</summary><p>${zh ? '两个英文名称是构建中的标识符式原文，本站不将它们改写成无证据的玩家界面名。I2 说明栏均为空。' : 'Both English names are identifier-like strings retained by this build; they are not rewritten as unverified player-facing labels. Both I2 description slots are empty.'}</p><ul class="evidence-list">${projectiles.items.map(item => `<li id="projectile-${esc(item.id)}" data-search-entry data-search-title="${esc(zh ? item.zhName : item.name)}" data-search-tags="${esc(`${item.name} ${item.zhName} projectile missile weapon 发射物 导弹 武器`)}" data-search-status="${zh ? '构建名称（未实测）' : 'Build name (not gameplay-tested)'}"><strong><a href="#projectile-${esc(item.id)}">${esc(zh ? item.zhName : item.name)}</a></strong>${zh ? ` · 原生英文 ${esc(item.name)}` : ''} · ${esc(item.rarity)} ${zh ? '字段（含义未解码）' : 'field (meaning not decoded)'}</li>`).join('')}</ul><p><a href="${prefix}/guides/crafting-guide#tool-weapon_Ammo_01">${zh ? '查看 Devil Kiss - Cartridge 原生物品配置' : 'Open the Devil Kiss - Cartridge native item settings'} →</a></p><p class="recipe-muted">${zh ? '相互链接只为了查找相关装备资料。标识符式名称、Weapon 类型与物品标志不证明武器可用性、弹药兼容、伤害、射速、容量、掉落或当前运行时实现。' : 'The cross-link is only a related-equipment lookup. Identifier-like names, the Weapon type and item flags do not establish weapon availability, ammunition compatibility, damage, fire rate, capacity, drops or current runtime implementation.'}</p></details>`;
  const renderRow = (row, isTool = false) => {
    const recipe = isTool ? data.recipes.find(r => r.id === row.id) : row;
    const offer = isTool ? shops.offers.find(o => o.itemId === row.id) : null;
    const seller = offer ? shops.shops.find(s=>s.id===offer.shopId) : null;
    const farmItem = !isTool && farmEquipment.some(i=>i.id===row.id);
    const placeable = !isTool ? placeables.items.find(i=>i.id===row.id) : null;
    const farmLink = farmItem ? `<a class="shop-recipe-link" href="${prefix}/guides/farming-fields#farm-${row.id}">${zh?'查看设施资料':'Equipment details'} →</a>` : '';
    const toolLink = !isTool && data.tools.some(t=>t.id===row.id) ? `<a class="shop-recipe-link" href="${compact?`${prefix}/guides/crafting-guide`:''}#tool-${row.id}">${zh?'查看工具属性':'Tool settings'} →</a>` : '';
    const shopLink = offer ? `<a class="shop-recipe-link" href="${prefix}/guides/resources-and-materials#offer-${offer.id}">${zh ? '商店配置：' : 'Shop listing: '}${esc(name(seller))} →</a>` : '';
    const miscItem = isTool ? miscItems.items.find(item => item.id === row.id) : null;
    const sourceConfig = data.toolSourceConfiguration;
    const sourceType = sourceConfig?.types.Weapon.includes(row.id) ? 'Weapon' : 'Tools';
    const equippable = sourceConfig?.equippable.exceptions[row.id] ?? sourceConfig?.equippable.default;
    const sellable = sourceConfig?.sellableFlag.exceptions[row.id] ?? sourceConfig?.sellableFlag.default;
    const intent = sourceConfig?.sourceIntents[row.id];
    const nativeToolSettings = isTool && !miscItem ? `<details class="recipe-item-settings tool-settings"><summary>${zh?'原生物品配置':'Native item settings'}</summary><p class="recipe-muted">${row.energy ? `<span data-energy-consumption="${row.energy.consumption}">${zh?'耗能配置':'Energy use setting'}: ${row.energy.consumption}</span>${row.energy.supply ? ` · ${zh?'恢复配置':'Restore setting'}: ${row.energy.supply}` : ''}` : `<span data-energy-missing>${zh?'耗能字段未收录':'Energy field not listed'}</span>`}<br>${zh?'来源类型':'Source type'}: ${sourceType} · ${zh?'来源分类':'Source classification'}: ${sourceConfig.shared.classification} · ${zh?'来源稀有度':'Source rarity'}: ${sourceConfig.shared.rarity}<br>${zh?'可装备':'Equippable'}: ${equippable?(zh?'是':'Yes'):(zh?'否':'No')} · ${zh?'可堆叠':'Stackable'}: ${row.stackable?(zh?'是':'Yes'):(zh?'否':'No')} · ${zh?'可出售标志':'Sellable flag'}: ${sellable?(zh?'是':'Yes'):(zh?'否':'No')} · ${zh?'可丢弃字段：未收录':'Droppable field: not listed'}<br>${heldSlots[row.bodySlot][zh?1:0]}</p>${intent?`<p class="recipe-muted">${esc(zh?intent.zh:intent.en)} <strong>${zh?'来源用途线索，不是运行时验证':'Source-use clue, not runtime verification'}</strong></p>`:''}<p class="recipe-muted">${zh?'耗能、类型、稀有度与物品标志不证明每次动作消耗、伤害、可购买性、堆叠上限、实际售价或当前实现。':'Energy, type, rarity and item flags do not establish per-action cost, damage, acquisition, stack limit, actual price or current implementation.'}</p></details>` : '';
    const settings = isTool ? (miscItem ? `<details class="recipe-item-settings" data-misc-item-id="${row.id}"><summary>${zh?'原生物品配置':'Native item settings'}</summary><p class="recipe-muted">${zh?'体力配置':'Energy settings'}: ${row.energy.consumption}/${row.energy.supply} · ${zh?'生命配置':'Health settings'}: ${row.health.consumption}/${row.health.supply}<br>${zh?'可装备':'Equippable'}: ${row.equippable?(zh?'是':'Yes'):(zh?'否':'No')} · ${zh?'可堆叠':'Stackable'}: ${row.stackable?(zh?'是':'Yes'):(zh?'否':'No')} · ${zh?'可丢弃':'Droppable'}: ${row.droppable?(zh?'是':'Yes'):(zh?'否':'No')} · ${zh?'可出售标志':'Sellable flag'}: ${row.sellable?(zh?'是':'Yes'):(zh?'否':'No')}<br>${heldSlots[row.bodySlot][zh?1:0]}${row.disableHoldingAnimation?` · ${zh?'双手持握动画禁用标志开启':'two-hand holding-animation disable flag enabled'}`:''}</p><p class="recipe-muted">${zh?'零值与标志不证明运行时行为、弹药数量、购买途径或真实售价。':'Zero values and flags do not establish runtime behavior, ammunition count, acquisition or price.'}</p></details>` : nativeToolSettings) : '';
    const requirement = (recipe ? materials(recipe) : `<span class="recipe-muted">${zh ? '配方表未收录' : 'No recipe in the extracted tables'}</span>`) + shopLink + settings + toolLink + farmLink + placeableSettings(placeable);
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
  ${selectedGroups.map(([id, labels]) => `<section data-recipe-group="${id}"><h2 id="recipes-${id}">${labels[zh ? 1 : 0]}</h2>${id==='tools'?`<p class="recipe-boundary">${zh?'工具属性为游戏文件配置。耗能值不是已实测的每次操作消耗，也不是牧场用电；未收录不等于零消耗。堆叠上限未验证。':'Tool attributes are game-file settings. Energy values are not measured per-action costs or ranch electricity use; an absent field is not zero consumption. Stack limits are unverified.'}</p>`:''}${id==='native'?`<p class="recipe-boundary">${zh?'这些条目存在于原生可放置物表，但未匹配到已提取的制作配方。这里仅提供名称与配置检索，不据此断言当前可建造或可购买。':'These entries exist in native placeable tables but have no match in the extracted recipes. This is a name and configuration lookup, not proof that they are currently buildable or purchasable.'}</p>`:''}<div class="recipe-table-wrap" role="region" aria-label="${labels[zh ? 1 : 0]}" tabindex="0"><table class="recipe-table"><thead><tr><th scope="col">${zh ? '物品' : 'Item'}</th><th scope="col">${id==='tools'?(zh?'材料、商店与属性':'Materials, shop & settings'):(id==='native'?(zh?'原生配置':'Native settings'):(zh ? '所需材料与配置' : 'Materials & settings'))}</th></tr></thead><tbody>${(id === 'tools' ? [...data.tools, ...miscItems.items] : id === 'native' ? placeables.items.filter(item => !item.recipeId) : data.recipes.filter(r => r.category === id)).map(r => id === 'native' ? renderUnmatchedPlaceable(r) : renderRow(r, id === 'tools')).join('\n')}</tbody></table></div>${id === 'tools' && !compact ? projectileReference : ''}</section>`).join('\n')}
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
