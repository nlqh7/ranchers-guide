const fs=require('node:fs');
const path=require('node:path');
const data=require('../data/build-farm-equipment.json');
const recipes=require('../data/build-recipes.json');
const icons=require('../data/item-icons.json').icons;
const root=path.resolve(__dirname,'..');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const materialRoutes={ressource_wood:'wood-log',ressource_rock_simple:'stone',ressource_straw:'hay',ressource_coal:'charcoal',ressource_zerkonite:'zirconite'};
function render(zh) {
  const prefix=zh?'/zh':'';
  const name=i=>zh?i.zhName:i.name;
  const seasons=zh?['春','夏','秋','冬']:data.seasons;
  const ordered=[...data.equipment.filter(i=>i.water),...data.equipment.filter(i=>!i.water)];
  const profiles=ordered.map(item=>{
    const recipe=recipes.recipes.find(r=>r.id===item.id);
    if(!recipe)throw Error(`No recipe match: ${item.id}`);
    const searchText=[
      item.water?`${zh?'春/夏/秋/冬：耗水':'Spring/Summer/Autumn/Winter: water use'} ${item.water.consumption.join('/')} · ${zh?'耗电':'power use'} ${item.electricity.consumption.join('/')}`:(zh?'水电字段未收录':'Water/power fields not listed'),
      `${zh?'材料':'Materials'}: ${recipe.materials.map(m=>`${name(recipes.ingredients.find(i=>i.id===m.id))} × ${m.quantity}`).join(', ')}`,
      recipe.workbench?(zh?'需要工作台':'Workbench required'):(zh?'不要求工作台':'No workbench required')
    ].join(' · ');
    const ingredients=recipe.materials.map(m=>{
      const label=recipes.ingredients.find(i=>i.id===m.id);
      const icon=icons.find(i=>i.sourceItemId===m.id);
      if(!label||!materialRoutes[m.id])throw Error(`Unknown material: ${m.id}`);
      return `<li><a href="${prefix}/database/materials#${materialRoutes[m.id]}">${icon?`<img src="${icon.src}" width="28" height="28" alt="" loading="lazy" decoding="async">`:''}<span>${esc(name(label))}</span><strong>× ${m.quantity}</strong></a></li>`;
    }).join('');
    const metrics=[['water','consumption','Water use','耗水'],['electricity','consumption','Power use','耗电'],['water','supply','Water supply','供水'],['electricity','supply','Power supply','供电']];
    const rows=item.water?metrics.filter(([r,f])=>f==='consumption'||item[r][f].some(n=>n!==0)).map(([r,f,en,cn])=>`<tr><th scope="row">${zh?cn:en}</th>${item[r][f].map(n=>`<td>${n}</td>`).join('')}</tr>`).join(''):'';
    const config=data.sharedConfiguration;
    const nativeSettings=`<details class="database-reference-notes" data-farm-native-settings><summary>${zh?'原生物品配置':'Native item settings'}</summary><p class="database-browse-note">${zh?'来源对象分类':'Source object category'}: ${esc(item.objectCategory||(zh?'未收录':'Not listed'))}<br>${zh?'默认健康字段':'Default-health field'}: ${item.building.defaultHealth} · ${zh?'建造步数字段':'Build-step field'}: ${item.building.buildSteps}${item.grid?`<br>${zh?'显示格网标志：是':'Show-grid flag: Yes'}`:''}</p><p class="database-browse-note">${config.type} · ${config.classification} · ${config.rarity} · ${zh?'不可装备；带可堆叠、可丢弃与可出售标志。':'not equippable; stackable, droppable and sellable flags are set.'}</p><p class="database-browse-note">${zh?'健康与建造步数字段不是已实测耐久或施工次数；物品标志也不证明当前可获取、可出售或实际售价。':'Health and build-step fields are not measured durability or construction actions; item flags also do not prove current acquisition, sale or price.'}</p></details>`;
    return `<section class="farm-profile" id="farm-${item.id}" aria-labelledby="farm-name-${item.id}" data-search-entry data-search-text="${esc(searchText)}" data-search-title="${esc(name(item))}" data-search-tags="${esc(`${item.name} ${item.zhName} sprinkler farm crafting water power 洒水器 农用设施 配方 耗水 耗电`)}" data-search-status="${zh?'游戏构建配置':'Game-build configuration'}"><h3 id="farm-name-${item.id}">${esc(name(item))}</h3><div class="farm-profile-body"><div><h4>${zh?'制作材料':'Crafting materials'}</h4><ul class="farm-materials">${ingredients}</ul><p class="farm-requirement">${recipe.workbench?(zh?'需要工作台':'Workbench required'):(zh?'不要求工作台':'No workbench required')}${recipe.questRequirements.length?` · ${zh?'含任务条件，解锁时机未确认':'Quest condition; unlock timing unverified'}`:''}</p><a class="farm-link" href="${prefix}/guides/crafting-guide#recipe-${item.id}">${zh?'制作表中的此项':'Entry in the crafting table'} →</a></div><div><h4>${zh?'四季水电配置':'Seasonal water & power'}</h4>${rows?`<div class="farm-table-wrap" role="region" tabindex="0" aria-label="${esc(name(item))} — ${zh?'四季水电配置':'Seasonal water & power'}"><table><thead><tr><th scope="col">${zh?'配置值':'Value'}</th>${seasons.map(s=>`<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`:`<p class="farm-missing">${zh?'水电字段未收录；不等于零消耗或零供给。':'Water/power fields not listed; this does not mean zero use or zero supply.'}</p>`}</div></div>${nativeSettings}</section>`;
  }).join('\n');
  return `<!-- BEGIN FARM EQUIPMENT -->
<section class="farm-reference" aria-label="${zh?'农用设施与材料':'Farm equipment & materials'}">
<h2 id="farm-equipment">${zh?'农用设施与材料':'Farm equipment & materials'}</h2>
<p class="farm-boundary">${zh?'站长整理 · 游戏文件配置。查制作材料与四季水电值；单位、运行周期及实际覆盖范围尚未验证。':'Game-file settings, not tested output or coverage. Units and timing are unverified.'}</p>
<nav class="farm-entry-nav" aria-label="${zh?'选择设施':'Choose equipment'}">${ordered.map(i=>`<a href="#farm-${i.id}">${esc(name(i))}</a>`).join('')}</nav>
${profiles}
<details class="farm-sources"><summary>${zh?'来源、配置参数与未验证范围':'Sources, configuration parameters & limits'}</summary><p>${zh?'非官方资料。设施来自 PLC_FarmTools，材料与工作台来自 Plantations_Recipes，名称逐项匹配 I2 双语文本。当前构建':'Unofficial reference. Equipment: PLC_FarmTools; ingredients and workbench: Plantations_Recipes; names: exact I2 bilingual text. Current build'} ${data.build} · Steam ${data.steamBuild}.</p><p>${zh?'三种洒水器的供水、供电字段均为0；页面保留耗电0，但没有把另外四个设施缺失的水电字段补成0。商店表没有匹配这7项的引用，因此没有推测购买地点。Demo标记与任务状态不证明已解锁。':'The three sprinklers have zero supply fields for water and power. Their zero power-use values are shown; missing water/power fields for the other four objects are not filled with zero. No matching shop references exist for these seven IDs, so no purchase location is inferred. Demo flags and quest states do not prove unlocks.'}</p><p>${zh?'以下是源 gridcoverrange 的 X/Y/Z 参数，仅供配置对照，不能当成覆盖半径、长宽或田块数量。未收录该字段的水井、饲料槽不补数值。':'The following native gridcoverrange X/Y/Z parameters are configuration references, not coverage radius, dimensions or tile counts. No values are filled in for the well or trough, which omit this field.'}</p><ul>${data.equipment.filter(i=>i.grid).map(i=>`<li>${esc(name(i))}: X ${i.grid.x} / Y ${i.grid.y} / Z ${i.grid.z}</li>`).join('')}</ul><p>${zh?'视频观测仍保留原版本0.8.10.455，不因配置已提取就视为当前版本实测。':'Video observations retain their original 0.8.10.455 build; extracted settings are not current-build gameplay tests.'} <a href="${prefix}/methodology">${zh?'验证方法':'Verification method'}</a></p></details>
</section>
<!-- END FARM EQUIPMENT -->`;
}
let stale=false;
for(const zh of [false,true]) {
  const file=path.join(root,zh?'zh':'','guides/farming-fields.html');
  const before=fs.readFileSync(file,'utf8');
  if(!before.includes('<!-- BEGIN FARM EQUIPMENT -->'))throw Error(`Missing farm equipment block: ${file}`);
  const after=before.replace(/<!-- BEGIN FARM EQUIPMENT -->[\s\S]*?<!-- END FARM EQUIPMENT -->/,render(zh));
  if(before!==after) {
    if(process.argv.includes('--check')){stale=true;console.error(`STALE: ${file}`);}
    else fs.writeFileSync(file,after);
  }
}
if(stale)process.exitCode=1;
else console.log('PASS: farm equipment profiles and recipes are synchronized.');
