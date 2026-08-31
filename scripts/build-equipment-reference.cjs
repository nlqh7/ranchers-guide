const fs = require('node:fs');
const path = require('node:path');
const data = require('../data/build-equipment.json');
const shops = require('../data/build-shops.json');
const icons = require('../data/item-icons.json').icons;
const root = path.resolve(__dirname, '..');
const esc = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(zh) {
  const prefix = zh ? '/zh' : '';
  const seasons = zh ? ['春','夏','秋','冬'] : ['Spring','Summer','Autumn','Winter'];
  const metrics = [
    ['electricity','supply','Power supply','供电'],['electricity','consumption','Power use','耗电'],
    ['water','supply','Water supply','供水'],['water','consumption','Water use','耗水']
  ];
  const title = zh ? '设备季节配置表' : 'Seasonal equipment reference';
  const profile = entry => {
    const name = zh ? entry.zhName : entry.name;
    const icon = icons.find(i=>i.sourceItemId===entry.id);
    const offer = shops.offers.find(o=>o.itemId===entry.id);
    if(!offer) throw new Error(`Missing shop link for ${entry.id}`);
    const seller = shops.shops.find(s=>s.id===offer.shopId);
    const fields = metrics.filter(([r,f])=>entry[r][f].some(n=>n!==0));
    const shared=data.sharedConfiguration;
    const building={defaultHealth:data.buildingConfiguration.defaultHealthByGroup[entry.group],buildSteps:data.buildingConfiguration.buildStepExceptions[entry.id]??data.buildingConfiguration.defaultBuildStepsByGroup[entry.group]};
    const sourceNote=data.sourceNotes[entry.id];
    const nativeSettings=`<details class="database-reference-notes" data-equipment-native-settings><summary>${zh?'原生物品配置':'Native item settings'}</summary><p class="database-browse-note">${zh?'默认健康字段':'Default-health field'}: ${building.defaultHealth} · ${zh?'建造步数字段':'Build-step field'}: ${building.buildSteps}<br>${zh?'可堆叠':'Stackable'}: ${shared.stackableByGroup[entry.group]?(zh?'是':'Yes'):(zh?'否':'No')} · ${zh?'可丢弃':'Droppable'}: ${zh?'是':'Yes'} · ${zh?'可出售标志':'Sellable flag'}: ${zh?'是':'Yes'}</p><p class="database-browse-note">${shared.type} · ${shared.classification} · ${shared.rarity} · ${zh?'不可装备；无内部功能标志。':'not equippable; interior-feature flags are off.'}</p>${sourceNote?`<p class="database-browse-note">${esc(zh?sourceNote.zh:sourceNote.en)} <strong>${zh?'异常来源备注，不是已验证功能':'Anomalous source note, not a verified feature'}</strong></p>`:''}<p class="database-browse-note">${zh?'健康与建造步数字段不是已实测耐久或施工次数；物品标志不证明设备功能、可获得性、售价或运行时行为。':'Health and build-step fields are not measured durability or construction actions; item flags do not establish device features, acquisition, price or runtime behavior.'}</p></details>`;
    return `<section class="equipment-profile" id="equipment-${entry.id}" aria-labelledby="equipment-name-${entry.id}" data-search-entry data-search-title="${esc(name)}" data-search-tags="${esc(`${entry.name} ${entry.zhName} seasonal electricity water 季节 耗电 供电 耗水 供水`)}" data-search-status="${zh?'游戏构建配置':'Game-build configuration'}"><h3 id="equipment-name-${entry.id}">${icon?`<img src="${icon.src}" width="28" height="28" alt="" loading="lazy" decoding="async">`:''}${esc(name)}</h3><div class="equipment-table-wrap" role="region" tabindex="0" aria-label="${esc(name)} — ${title}"><table><thead><tr><th scope="col">${zh?'配置值':'Config value'}</th>${seasons.map(s=>`<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${fields.map(([r,f,en,cn])=>`<tr><th scope="row">${zh?cn:en}</th>${entry[r][f].map(n=>`<td>${n}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${nativeSettings}<a class="equipment-shop" href="${prefix}/guides/resources-and-materials#offer-${offer.id}">${zh?'商店条目：':'Shop listing: '}${esc(zh?seller.zhName:seller.name)} →</a></section>`;
  };
  return `<!-- BEGIN EQUIPMENT REFERENCE -->
<section class="equipment-reference" aria-label="${title}">
<h2 id="equipment">${title}</h2>
<p class="equipment-boundary">${zh?'站长整理 · 游戏文件配置。数值用于比较四季差异，单位与结算周期未验证，不代表每日产量或账单金额。未列出的水电项在源表中均为 0。':'Editor-collected game configuration. Compare seasonal values; units and settlement intervals are unverified, so these are not daily outputs or bills. Unlisted water/power fields are zero in the source.'}</p>
<nav class="equipment-nav" aria-label="${zh?'设备与合同':'Equipment and contracts'}"><a href="#equipment-generators">${zh?'供电与供水设备':'Power & water supply'}</a><a href="#equipment-devices">${zh?'用电设备':'Appliances'}</a><a href="#two-paths">${zh?'水电合同':'Utility contracts'}</a></nav>
${['generators','devices'].map(group=>`<h2 id="equipment-${group}">${group==='generators'?(zh?'供电与供水设备':'Power & water supply'):(zh?'用电设备':'Appliances')}</h2><div class="equipment-grid">${data.equipment.filter(e=>e.group===group).map(profile).join('\n')}</div>`).join('\n')}
<details class="equipment-sources"><summary>${zh?'资料来源与数值含义':'Sources & value definitions'}</summary><p>${zh?'非官方资料。名称按游戏双语文本精确匹配；供给对应原字段 Restor，消耗对应 Consumption，保留春夏秋冬顺序。':'Unofficial reference. Names match exact bilingual game text. Supply corresponds to the native Restor field and use to Consumption, in spring–summer–autumn–winter order.'}</p><p>${zh?'这些记录不能证明设备当前可购买、实际效率、工作频率、内部功能或电价。不将内部价格和占位描述写成玩法事实。':'These records do not establish current availability, effective output, operating frequency, device features or tariffs. Internal prices and placeholder descriptions are not treated as gameplay facts.'} ${data.build} · Steam ${data.steamBuild}. PLC_EnergyGenerators / PLC_Devices / I2. <a href="${prefix}/methodology">${zh?'验证方法':'Methodology'}</a></p></details>
</section>
<!-- END EQUIPMENT REFERENCE -->`;
}
let stale=false;
for(const zh of [false,true]) {
  const file=path.join(root,zh?'zh':'','guides/electricity-power.html');
  const before=fs.readFileSync(file,'utf8');
  if(!before.includes('<!-- BEGIN EQUIPMENT REFERENCE -->'))throw new Error(`Missing equipment block: ${file}`);
  const after=before.replace(/<!-- BEGIN EQUIPMENT REFERENCE -->[\s\S]*?<!-- END EQUIPMENT REFERENCE -->/,render(zh));
  if(before!==after) {
    if(process.argv.includes('--check')){stale=true;console.error(`STALE: ${file}`);}
    else fs.writeFileSync(file,after);
  }
}
if(stale)process.exitCode=1;
else console.log('PASS: bilingual equipment profiles match seasonal source configuration.');
