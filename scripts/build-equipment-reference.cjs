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
    return `<section class="equipment-profile" id="equipment-${entry.id}" aria-labelledby="equipment-name-${entry.id}" data-search-entry data-search-title="${esc(name)}" data-search-tags="${esc(`${entry.name} ${entry.zhName} seasonal electricity water 季节 耗电 供电 耗水 供水`)}" data-search-status="${zh?'游戏构建配置':'Game-build configuration'}"><h3 id="equipment-name-${entry.id}">${icon?`<img src="${icon.src}" width="28" height="28" alt="" loading="lazy" decoding="async">`:''}${esc(name)}</h3><div class="equipment-table-wrap" role="region" tabindex="0" aria-label="${esc(name)} — ${title}"><table><thead><tr><th scope="col">${zh?'配置值':'Config value'}</th>${seasons.map(s=>`<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${fields.map(([r,f,en,cn])=>`<tr><th scope="row">${zh?cn:en}</th>${entry[r][f].map(n=>`<td>${n}</td>`).join('')}</tr>`).join('')}</tbody></table></div><a class="equipment-shop" href="${prefix}/guides/resources-and-materials#offer-${offer.id}">${zh?'商店条目：':'Shop listing: '}${esc(zh?seller.zhName:seller.name)} →</a></section>`;
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
