const fs=require('node:fs');
const path=require('node:path');
const data=require('../data/build-consumables.json');
const shops=require('../data/build-shops.json');
const icons=require('../data/item-icons.json').icons;
const root=path.resolve(__dirname,'..');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups={milk:['Milk','奶类'],eggs:['Eggs','蛋类'],meat:['Meat','肉类'],other:['Other consumables','其他消耗品']};
function render(zh) {
  const prefix=zh?'/zh':'';
  function profile(item) {
    const name=zh?item.zhName:item.name;
    const offer=shops.offers.find(o=>o.itemId===item.id);
    const seller=offer?shops.shops.find(s=>s.id===offer.shopId):null;
    const icon=icons.find(i=>i.sourceItemId===item.id);
    const stats=[['energy','restore','Energy restore','能量恢复'],['health','restore','Health restore','生命恢复'],['energy','consumption','Energy use','能量消耗'],['health','consumption','Health use','生命消耗']].filter(([r,f])=>f==='restore'||item[r][f]!==0);
    return `<section class="consumable-profile" id="food-${item.id}" aria-labelledby="food-name-${item.id}" data-search-entry data-search-title="${esc(name)}${item.id==='consumable_chicken_full'?(zh?'（消耗品）':' (consumable)'):''}" data-search-tags="${esc(`${item.name} ${item.zhName} ${groups[item.category].join(' ')} consumable food energy health 食物 消耗品 能量 生命`)}" data-search-status="${zh?'游戏构建配置':'Game-build configuration'}"><div class="consumable-name"><h3 id="food-name-${item.id}">${icon?`<img src="${icon.src}" width="28" height="28" alt="" loading="lazy" decoding="async">`:''}${esc(name)}</h3>${item.isDrink===true?`<span class="consumable-kind">${zh?'饮品':'Drink'}</span>`:''}${offer?`<a class="consumable-shop" href="${prefix}/guides/resources-and-materials#offer-${offer.id}">${zh?'商店条目：':'Shop listing: '}${esc(zh?seller.zhName:seller.name)} →</a>`:''}</div><dl class="consumable-stats">${stats.map(([r,f,en,cn])=>`<div><dt>${zh?cn:en}</dt><dd>${item[r][f]}</dd></div>`).join('')}</dl></section>`;
  }
  return `<!-- BEGIN CONSUMABLE REFERENCE -->
<section class="consumable-reference" aria-label="${zh?'食物与消耗品':'Food & consumables'}">
<h2 id="consumables">${zh?'食物与消耗品':'Food & consumables'}</h2>
<p class="recipe-boundary">${zh?'站长整理 · 游戏文件配置。这里比较能量与生命恢复字段，不是实测食用效果，也不能证明获取方式或动物产量。':'Editor-collected game configuration. Compare energy and health restore fields, not measured eating effects, acquisition methods or animal yields.'}</p>
<nav class="consumable-nav" aria-label="${zh?'消耗品分类':'Consumable categories'}">${Object.entries(groups).map(([id,l])=>`<a href="#consumables-${id}">${l[zh?1:0]}</a>`).join('')}</nav>
${Object.entries(groups).map(([id,l])=>`<h2 id="consumables-${id}">${l[zh?1:0]}</h2><div class="consumable-list">${data.items.filter(i=>i.category===id).map(profile).join('\n')}</div>`).join('\n')}
<details class="consumable-sources"><summary>${zh?'来源与字段说明':'Sources & field definitions'}</summary><p>${zh?'非官方资料。名称逐项匹配原版双语文本，数值来自 Consumables 的 Energy/Health：恢复对应 Restor，消耗对应 Consumption。本表27条的两个消耗字段均为0；不把恢复值换算成百分比。':'Unofficial reference. Names match exact bilingual game text. Values come from Consumables Energy/Health: restore means Restor; use means Consumption. Both use fields are zero for these 27 records. Restore values are not percentages.'}</p><p>${zh?'6种奶有饮品标记，其余21条未收录该字段，不等于否。存在配置不代表可以生食、已开放或会稳定产出；没有匹配商店条目的物品不猜购买路线。':'Six milk records carry a drink flag; the other 21 omit it rather than explicitly setting false. Configuration does not establish raw edibility, availability or reliable production. No purchase route is guessed for unmatched items.'}</p><p>Consumables / resources.assets / 12043 · ${data.build} · Steam ${data.steamBuild}. I2. <a href="${prefix}/methodology">${zh?'验证方法':'Methodology'}</a></p></details>
</section>
<!-- END CONSUMABLE REFERENCE -->`;
}
let stale=false;
for(const zh of [false,true]) {
  const file=path.join(root,zh?'zh':'','guides/resources-and-materials.html');
  const before=fs.readFileSync(file,'utf8');
  if(!before.includes('<!-- BEGIN CONSUMABLE REFERENCE -->'))throw Error(`Missing consumable block: ${file}`);
  const after=before.replace(/<!-- BEGIN CONSUMABLE REFERENCE -->[\s\S]*?<!-- END CONSUMABLE REFERENCE -->/,render(zh));
  if(before!==after) {
    if(process.argv.includes('--check')){stale=true;console.error(`STALE: ${file}`);}
    else fs.writeFileSync(file,after);
  }
}
if(stale)process.exitCode=1;
else console.log('PASS: bilingual consumable profiles match the source-backed data.');
