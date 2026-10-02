/* Build bilingual, player-facing animal detail routes from data/animals.json. */
const fs = require('node:fs');
const path = require('node:path');
const { renderSiteFooter } = require('./render-site-footer.cjs');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/animals.json'), 'utf8'));
const checkOnly = process.argv.includes('--check');
let activeSlug = 'chicken';
const animal = data.species.find(item => item.id === 'chicken');
if (!animal || !animal.zh) throw new Error('Chicken entry needs existing English and Chinese source records.');

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const sourceLinks = (ids, locale = 'en') => (ids || []).map(id => {
  const source = data.sources[id];
  if (!source) throw new Error(`Unknown chicken source: ${id}`);
  const zhLabels = {
    'owned-build-animals': '游戏文件：动物定义',
    'owned-build-cattle-shop': '游戏文件：牛类商店目录',
    'owned-build-animal-products': '游戏文件：消耗品定义',
    'owned-build-animal-guidance': '游戏文件：双语物品名与畜牧教程',
    'owned-build-animal-diets': '游戏文件：动物饲料配置',
    'owned-build-animal-delivery': '游戏文件：动物取货教程',
    'games-station-video': 'Games Station 游戏实录 V0.8.10.455（本地视频存档，03:15–03:45 货架画面）',
  };
  const title = locale === 'zh' ? (zhLabels[id] || source.title) : source.title;
  return source.url ? `<a href="${escape(source.url)}" rel="noopener noreferrer">${escape(title)}</a>` : escape(title);
}).join(' · ');

const levels = {
  official: ['Official', '官方'],
  'video-observed': ['Video-observed', '视频观测'],
  'community-confirmed': ['Community-confirmed', '社区互证'],
  'unverified-lead': ['Single-source lead', '单一线索'],
  'player-tested': ['Player-tested', '玩家实测'],
  'build-observed': ['Game-build configuration', '游戏构建配置'],
};
const enGroups = [
  { title: 'Get a chicken home', keys: ['acquisition'], omit: [2] },
  { title: 'Housing, feeding & water', keys: ['housing', 'feed', 'water'], omit: { housing: [3], feed: [3, 4] } },
  { title: 'Eggs, products & the Gigi route', keys: ['products', 'quests'], omit: { products: [3], quests: [2] } },
  { title: 'If a chicken is sick or missing', keys: ['sickness', 'bugs'], omit: { sickness: [2, 3], bugs: [0, 2, 5, 6] } },
];
const zhGroups = new Set(['喂食与饮水', '鸡舍与温控', '鸡蛋、大鸡蛋与肉', '生病与兽医', '鸡不见时先检查']);

function enFacts(keys, omit = {}) {
  return keys.flatMap(key => {
    const field = animal.fields.find(item => item.key === key);
    if (!field) throw new Error(`Chicken field missing: ${key}`);
    const indexes = Array.isArray(omit) ? omit : omit[key] || [];
    return field.facts.filter((fact, index) => !indexes.includes(index) && fact.validity !== 'obsolete' && fact.validity !== 'historical');
  });
}

function renderEnFact(fact) {
  const label = levels[fact.evidenceLevel]?.[0];
  if (!label) throw new Error(`Unknown evidence level: ${fact.evidenceLevel}`);
  const validity = fact.validity === 'unknown' ? ' · Unknown' : fact.validity === 'historical' ? ' · Historical' : '';
  const version = fact.build ? ` · ${escape(fact.build)}` : '';
  return `<li>${escape(fact.text)} <span class="tag">${label}${validity}${version}</span>${fact.sourceIds?.length ? `<span class="fact-source">${sourceLinks(fact.sourceIds)}</span>` : ''}</li>`;
}

function renderZhFact(fact) {
  const labels = { official: '官方', 'official-warn': '官方·历史边界', community: '社区互证', video: '视频观测', lead: '单一线索', model: '游戏构建配置', unknown: '未知', historical: '历史资料' };
  const label = labels[fact.badge] || '已记录';
  const version = fact.build ? ` · ${escape(fact.build)}` : '';
  return `<li>${escape(fact.text)} <span class="tag">${label}${version}</span>${fact.sourceIds?.length ? `<span class="fact-source">${sourceLinks(fact.sourceIds)}</span>` : ''}</li>`;
}

function renderConfiguredCare(locale, speciesIds) {
  const ref = data.nativeAnimalCareReference;
  const zh = locale === 'zh';
  if (!ref) return '';
  const foods = new Map(ref.foods.map(item => [item.id, item]));
  const cards = ref.diets.filter(diet => speciesIds.includes(diet.id)).map(diet => {
    const species = data.species.find(item => item.id === diet.speciesId);
    const name = zh ? (species?.zh?.tocLabel || species?.name || diet.id) : (species?.name || diet.id);
    const foodNames = diet.foodIds.map(id => foods.get(id)).filter(Boolean).map(item => escape(zh ? item.zhName : item.name));
    const waterNames = diet.waterIds.map(id => foods.get(id)).filter(Boolean).map(item => escape(zh ? item.zhName : item.name));
    const title = zh ? `${name}：食物与饮水配置` : `${name}: food and water configuration`;
    return `<article class="native-animal-care-card" id="${escape(diet.id)}-diet" data-search-entry data-search-title="${escape(title)}" data-search-tags="${escape(`${name} diet feed food water 饲料 食物 水`)}" data-search-status="${zh ? '游戏构建配置' : 'Game-build configuration'}"><h3>${escape(title)}</h3><p><strong>${zh ? '食物：' : 'Food: '}</strong>${foodNames.join(zh ? '、' : ', ')} · <strong>${zh ? '饮水：' : 'Water: '}</strong>${waterNames.join(zh ? '、' : ', ')}</p><p class="database-browse-note">${zh ? '这是 0.8.10.842 序列化配置，不是当前存档的喂养实测；食量、频率、产量和运行时可用性仍未确认。' : 'This is 0.8.10.842 serialized configuration, not a current-save feeding test; quantity, frequency, output and runtime availability remain unverified.'}</p></article>`;
  }).join('');
  return `<section class="evidence-ledger native-animal-care-reference" data-animal-care-config aria-labelledby="livestock-care-config-title"><div class="section-heading-row"><div><span class="kicker">${zh ? '站长整理 · 游戏构建资料' : 'Editor-collected · game-build reference'}</span><h2 id="livestock-care-config-title">${zh ? '牛与山羊的饲料配置' : 'Cow and goat care configuration'}</h2></div><span class="tag">${escape(ref.build)}</span></div><div class="native-animal-care-grid">${cards}</div><p class="database-browse-note">${zh ? '配置只回答“文件里列了什么”，不替代当前版本的存档验证。' : 'This answers what the file lists; it does not replace a current-build save test.'}</p><details class="database-reference-notes"><summary>${zh ? '资料来源' : 'Reference sources'}</summary><p class="fact-source">${sourceLinks(ref.sourceIds, locale)}</p></details></section>`;
}

function related(locale) {
  const links = locale === 'zh' ? [
    ['/zh/guides/animal-guide#getting', '购买与带回牧场'],
    ['/zh/guides/animal-guide#feeding', '喂水与自动化步骤'],
    ['/zh/database/buildings/coop', '查看鸡舍材料'],
    ['/zh/database/quests#chicken-coop-mission', '鸡舍任务记录'],
    ['/zh/guides/gigi-large-egg-quest', '大鸡蛋任务路线'],
    ['/zh/tools/chicken-troubleshooter', '鸡消失或生病排查'],
    ['/zh/database/npcs#angela', 'Angela 商人条目'],
  ] : [
    ['/guides/animal-guide#getting', 'Buying and bringing chickens home'],
    ['/guides/animal-guide#feeding', 'Feeding, water and automation'],
    ['/database/buildings/coop', 'Coop material list'],
    ['/database/quests#chicken-coop-mission', 'Chicken Coop Mission record'],
    ['/guides/gigi-large-egg-quest', 'Large-egg quest route'],
    ['/tools/chicken-troubleshooter', 'Missing or sick chicken checklist'],
    ['/database/npcs#angela', 'Angela seller profile'],
  ];
  return `<nav class="animal-next-steps" aria-label="${locale === 'zh' ? '下一步' : 'Next steps'}"><h2>${locale === 'zh' ? '继续处理下一步' : 'Continue to the next step'}</h2><ul>${links.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul></nav>`;
}

function renderBody(locale) {
  if (activeSlug === 'livestock') return renderLivestockBody(locale);
  const zh = locale === 'zh';
  const prefix = zh ? '/zh' : '';
  const facts = zh ? animal.zh.groups.filter(group => zhGroups.has(group.heading)).map(group => `<section class="evidence-ledger"><h2>${escape(group.heading)}</h2><ul class="evidence-list">${group.facts.filter(fact => fact.badge !== 'historical').map(renderZhFact).join('')}</ul></section>`).join('') : enGroups.map(group => `<section class="evidence-ledger"><h2>${escape(group.title)}</h2><ul class="evidence-list">${enFacts(group.keys, group.omit).map(renderEnFact).join('')}</ul></section>`).join('');
  const intro = zh
    ? '鸡的购买与照料资料目前最完整：在 Angela 处购买后，到她家后方的围栏区域取鸡并带回牧场；安置进鸡舍，补室内食槽的干草和水。大鸡蛋、繁殖或产出时间都不能保证。'
    : 'The documented route is: buy from Angela, collect the chickens from the fenced area behind her house, bring them to your ranch, and house them in a coop with hay and water in its indoor trough. Egg size, timing and breeding outcomes are not guaranteed.';
  return `<nav class="breadcrumb" aria-label="${zh ? '面包屑' : 'Breadcrumb'}"><a href="${prefix}/">${zh ? '首页' : 'Home'}</a> / <a href="${prefix}/database">${zh ? '资料库' : 'Database'}</a> / <a href="${prefix}/database/animals">${zh ? '动物' : 'Animals'}</a> / ${zh ? '鸡' : 'Chicken'} / <a class="language-switch" href="${zh ? '/database/animals/chicken' : '/zh/database/animals/chicken'}">${zh ? 'English' : '中文'}</a></nav>
    <header class="animal-entry-header" id="chicken-profile" data-search-entry data-search-title="${zh ? '鸡的照料词条' : 'Chicken care profile'}" data-search-aliases="Chicken|Hen|Rooster|Chicken care|Chicken feed|鸡|母鸡|公鸡|鸡舍" data-search-text="${escape(`${animal.summary} ${animal.zh.summary}`)}" data-search-tags="${escape(`${animal.searchTags} ${animal.zh.searchTags}`)}"><p class="kicker">${zh ? '动物词条 · 鸡' : 'Animal profile · Chicken'}</p><h1>${zh ? '鸡：购买、鸡舍照料与鸡蛋' : 'Chicken: buying, coop care and eggs'}</h1><p class="lead">${intro}</p><p class="meta">${zh ? '下方按玩家步骤组织，并标出来源类型与版本；历史和单一线索不会当作当前保证。' : 'Answers follow the player workflow. Source type and build are shown; historical notes and single-source leads are not presented as current guarantees.'}</p></header>
    <section class="animal-entry-answer" aria-labelledby="chicken-start"><h2 id="chicken-start">${zh ? '先按这个顺序操作' : 'Start in this order'}</h2><ol>${zh ? '<li>在 Angela 处完成购买提示，再到她家后方的围栏区域取鸡。</li><li>把鸡带回牧场并安置到鸡舍；先确认鸡舍关联与门口封闭围栏。</li><li>给室内食槽补干草和水；鸡舍专用温控器具不能用住宅装饰款替代。</li><li>需要鸡蛋或任务时，再查看下面的蛋与任务条件；随机产出没有保证时间。</li>' : '<li>Complete the purchase with Angela, then collect the chickens from the fenced area behind her house.</li><li>Bring them to your ranch and place them in a coop; check the coop link and enclosed fence at its door.</li><li>Supply hay and water to the indoor trough. Coop heating equipment is separate from house-decor heaters.</li><li>For eggs or quest delivery, check the recorded conditions below; random outcomes have no guaranteed timing.</li>'}</ol></section>
    ${related(locale)}
    ${facts}`;
}

function renderLivestockBody(locale) {
  const zh = locale === 'zh';
  const prefix = zh ? '/zh' : '';
  const cow = data.species.find(item => item.id === 'cow');
  const goat = data.species.find(item => item.id === 'goat');
  const cowIllness = cow.fields.find(field => field.key === 'sickness').facts.find(fact => fact.sourceIds.includes('update-0-8-10-858'));
  const goatIllness = goat.fields.find(field => field.key === 'sickness').facts.find(fact => fact.sourceIds.includes('update-0-8-10-858'));
  const cowIllnessZh = cow.zh.groups.flatMap(group => group.facts).find(fact => fact.sourceIds?.includes('update-0-8-10-858'));
  const goatIllnessZh = goat.zh.groups.flatMap(group => group.facts).find(fact => fact.sourceIds?.includes('update-0-8-10-858'));
  const careConfig = renderConfiguredCare(locale, ['cow', 'goat']);
  const breeds = cow.buildReference.breeds.map(breed => {
    const variants = breed.sexes.length > 1 ? (zh ? '成年雌牛与雄牛定义' : 'Adult cow and bull definitions') : (zh ? '成年雌牛定义' : 'Adult cow definition');
    return `<li><strong>${escape(zh ? breed.zhName : breed.name)}</strong> — ${variants}</li>`;
  }).join('');
  const goatEntries = goat.buildReference.entries.map(entry => `<tr><th scope="row">${escape(zh ? entry.zhName : entry.name)}</th><td>${entry.stage === 'young' ? (zh ? '幼年定义' : 'Young definition') : (zh ? '成年定义' : 'Adult definition')}</td><td>${entry.shopListed ? (zh ? '列在商店表' : 'Listed in shop table') : (zh ? '未列入商店表' : 'Not listed in shop table')}</td></tr>`).join('');
  const productNote = zh
    ? '这些是已记录的物品名，不代表动物产出周期、数量或牧场收入。中份牛肉 672C 是 Leafy Market 货架购买价，不是玩家出售所得。'
    : 'These are recorded item names, not proof of production timing, yield or ranch income. Cow Meat - Medium at 672C is a Leafy Market shelf purchase price, not player sale value.';
  const lead = zh
    ? '当前文件能区分牛的五个品种名、山羊成年商店引用与幼年定义；0.8.10.842 饲料表还列出牛的干草/水和山羊的干草、绿叶生菜、绿色沙拉菜、胡萝卜/水。卖家、售价、食量、频率、产量与确切解锁仍未验证。官方 0.8.10.858 更新记录牛 7 天、山羊 8 天病程——这是生病时长，不是喂食间隔。'
    : 'The retained files distinguish five cattle breed names and adult/young goat references. The 0.8.10.842 care table also lists Hay/Water for cows and Hay, Green Lettuce, Green Salad, Carotte/Water for goats. Seller, price, quantity, frequency, output and exact unlock remain unverified. The official 0.8.10.858 update lists 7 days of illness for cows and 8 for goats—not feeding intervals.';
  const links = zh ? [
    ['/zh/guides/animal-guide', '动物照料与症状指南'],
    ['/zh/database/npcs', '已记录的人物与服务'],
    ['/zh/database/animals', '返回动物目录'],
  ] : [
    ['/guides/animal-guide', 'Animal care and symptom guide'],
    ['/database/npcs', 'Recorded people and services'],
    ['/database/animals', 'Back to the animal directory'],
  ];
  const next = `<nav class="animal-next-steps"><h2>${zh ? '继续查找' : 'Continue looking'}</h2><ul>${links.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul></nav>`;
  const cowSummary = zh
    ? '0.8.10.842 的商店目录引用五个牛品种。Bretonne Pie Noire、Maine-Anjou 含成年雌雄定义；Angeln、Deutsche Rotbunte、Gascon 仅列成年雌牛定义。该目录不能证明当前存档可购买。'
    : 'The 0.8.10.842 shop directory references five cattle breeds. Bretonne Pie Noire and Maine-Anjou have adult cow and bull definitions; Angeln, Deutsche Rotbunte and Gascon have adult cow definitions. The directory does not prove purchase in a current save.';
  const goatSummary = zh
    ? '成年母羊与成年公羊定义出现在商店表，幼年母羊与幼年公羊只出现在动物定义中。幼年定义不等于存在单独购买入口；下方单独列出山羊的构建饲料配置，但它不是当前存档实测。'
    : 'Adult doe and buck definitions appear in a shop table; young doeling and buckling appear only in animal definitions. Young entries do not establish a separate purchase route. The build care configuration is listed below, but it is not a current-save test.';
  const cowSection = `<section class="evidence-ledger" id="cow" data-search-entry data-search-title="${zh ? '牛品种与物品记录' : 'Cow breeds and recorded items'}" data-search-aliases="cattle|牛|奶牛|牛肉" data-search-tags="cow cattle breeds milk meat illness 7 days 牛 品种 牛奶 牛肉 病程 7天"><h2>${zh ? '牛：五个品种名' : 'Cow: five breed names'}</h2><p>${cowSummary}</p><ul>${breeds}</ul><p class="fact-source"><span class="tag">${zh ? '游戏文件配置 · 0.8.10.842' : 'Game-file configuration · 0.8.10.842'}</span> ${sourceLinks(cow.buildReference.sourceIds, locale)}</p></section>`;
  const goatSection = `<section class="evidence-ledger" id="goat" data-search-entry data-search-title="${zh ? '山羊成年与幼年定义' : 'Goat adult and young definitions'}" data-search-aliases="Buck|Doe|山羊|公羊|母羊|幼羊" data-search-tags="goat adult young diet feed illness 8 days 山羊 成年 幼年 饲料 病程 8天"><h2>${zh ? '山羊：成年商店引用与幼年定义' : 'Goat: adult shop references and young definitions'}</h2><p>${goatSummary}</p><div class="data-table-wrap"><table class="data-table"><thead><tr><th>${zh ? '名称' : 'Name'}</th><th>${zh ? '阶段' : 'Stage'}</th><th>${zh ? '商店目录' : 'Shop directory'}</th></tr></thead><tbody>${goatEntries}</tbody></table></div><p class="fact-source"><span class="tag">${zh ? '游戏文件配置 · 0.8.10.842' : 'Game-file configuration · 0.8.10.842'}</span> ${sourceLinks(goat.buildReference.sourceIds, locale)}</p></section>`;
  const illnessFacts = zh ? `${renderZhFact(cowIllnessZh)}${renderZhFact(goatIllnessZh)}` : `${renderEnFact(cowIllness)}${renderEnFact(goatIllness)}`;
  const title = zh ? '牛与山羊：品种、物品和病程' : 'Cows and Goats: Breeds, Items & Sickness';
  return `<nav class="breadcrumb" aria-label="${zh ? '面包屑' : 'Breadcrumb'}"><a href="${prefix}/">${zh ? '首页' : 'Home'}</a> / <a href="${prefix}/database">${zh ? '资料库' : 'Database'}</a> / <a href="${prefix}/database/animals">${zh ? '动物' : 'Animals'}</a> / ${zh ? '牛与山羊' : 'Cows & goats'} / <a class="language-switch" href="${zh ? '/database/animals/livestock' : '/zh/database/animals/livestock'}">${zh ? 'English' : '中文'}</a></nav>
    <header class="animal-entry-header" id="livestock-profile" data-search-entry data-search-title="${title}" data-search-aliases="Cow|cattle|Goat|牛|山羊|牛奶|牛肉|羊奶" data-search-text="${escape(`${cow.summary} ${goat.summary} ${cow.zh.summary} ${goat.zh.summary}`)}" data-search-tags="${escape(`${cow.searchTags} ${goat.searchTags} ${cow.zh.searchTags} ${goat.zh.searchTags}`)}"><p class="kicker">${zh ? '动物词条 · 牛与山羊' : 'Animal profiles · Cows and goats'}</p><h1>${zh ? '牛与山羊：品种、物品和生病时间' : 'Cows and Goats: Breeds, Items & Sickness'}</h1><p class="lead">${lead}</p><p class="meta">${zh ? '配置用于识别名称与目录关联，不当作当前存档中的购买、解锁或饲养实测。' : 'Configuration identifies names and directory references; it is not gameplay proof of purchase, unlocks or husbandry.'}</p></header>
    ${next}<section class="animal-entry-answer"><h2>${zh ? '先看能确定的结论' : 'What the current evidence can answer'}</h2><ol>${zh ? '<li>牛的品种与山羊成年/幼年定义可以区分。</li><li>山羊成年动物出现在一份商店表里，但这不能确认卖家或解锁。</li><li>0.8.10.842 配置列出牛的干草/水，以及山羊的干草、绿叶生菜、绿色沙拉菜、胡萝卜/水；这是文件配置，不是当前存档实测。</li><li>牛病程 7 天、山羊 8 天；这是官方更新所述生病时长，不是喂食间隔。</li>' : '<li>Cattle breed names and adult/young goat definitions can be distinguished.</li><li>Adult goats appear in one shop table, but this does not confirm a seller or unlock.</li><li>The 0.8.10.842 configuration lists Hay/Water for cows and Hay, Green Lettuce, Green Salad, Carotte/Water for goats; this is file configuration, not a current-save test.</li><li>Cow illness is listed as 7 days and goat illness as 8 days; these are official sickness durations, not feeding intervals.</li>'}</ol></section>
    ${careConfig}
    ${cowSection}${goatSection}<section class="evidence-ledger"><h2>${zh ? '已记录的牛奶与肉类名称' : 'Recorded milk and meat names'}</h2><p><strong>${zh ? '牛：' : 'Cow: '}</strong>${cow.buildReference.products.map(item => escape(zh ? item.zhName : item.name)).join(zh ? '、' : ', ')}</p><p><strong>${zh ? '山羊：' : 'Goat: '}</strong>${goat.buildReference.products.map(item => escape(zh ? item.zhName : item.name)).join(zh ? '、' : ', ')}</p><p>${productNote}</p><p class="fact-source">${sourceLinks(['owned-build-animal-products', 'games-station-video'], locale)}</p></section>
    <section class="evidence-ledger"><h2>${zh ? '生病提醒与病程' : 'Sickness alerts and duration'}</h2><ul class="evidence-list">${illnessFacts}</ul><p>${zh ? '日终报告会提示生病。遇到症状时按动物照料指南处理，并记录当前版本。' : 'The end-of-day report flags sickness. Use the animal care guide for symptom handling and record the current game version.'}</p><a href="${prefix}/guides/animal-guide">${zh ? '打开动物照料指南' : 'Open the animal care guide'}</a></section>`;
}

function shell(locale, slug = 'chicken') {
  activeSlug = slug;
  const zh = locale === 'zh';
  const route = `${zh ? '/zh' : ''}/database/animals/${slug}`;
  const englishRoute = `/database/animals/${slug}`;
  const chineseRoute = `/zh/database/animals/${slug}`;
  const title = slug === 'chicken' ? (zh ? '鸡的照料指南：购买、喂养与鸡蛋 | The Ranchers Guide' : 'Chicken Care: Buying, Feeding & Eggs | The Ranchers Guide') : (zh ? '牛与山羊：品种、物品与病程 | The Ranchers Guide' : 'Cow and Goat Records: Breeds, Items & Sickness | The Ranchers Guide');
  const description = slug === 'chicken' ? (zh ? '从 Angela 购买并运回鸡，了解鸡舍、干草与饮水、大鸡蛋任务和鸡只排查。' : 'Follow the documented chicken route from Angela to coop care, hay and water, eggs, quests, and missing or sick bird checks.') : (zh ? '查看牛的五个品种名、山羊成年与幼年定义，以及 0.8.10.842 饲料配置、已记录物品和官方病程；不把配置当作当前实测。' : 'Compare cattle breed names, adult and young goat definitions, the 0.8.10.842 care configuration, recorded items and official sickness durations without treating configuration as a current-save test.');
  const body = slug === 'chicken' ? renderBody(locale) : renderLivestockBody(locale);
  const html = `<!doctype html>
<!-- GENERATED by scripts/build-animal-entries.cjs from data/animals.json — do not edit directly. -->
<html lang="${zh ? 'zh-CN' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="https://theranchersguide.com${route}"><link rel="alternate" hreflang="en" href="https://theranchersguide.com${englishRoute}"><link rel="alternate" hreflang="zh-CN" href="https://theranchersguide.com${chineseRoute}"><link rel="alternate" hreflang="x-default" href="https://theranchersguide.com${englishRoute}"><meta property="og:type" content="article"><meta property="og:site_name" content="The Ranchers Guide"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="https://theranchersguide.com${route}"><link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css?v=20261003-r15"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4804883741146501" crossorigin="anonymous"></script></head><body><header class="site-header"><nav class="nav-inner" aria-label="${zh ? '主导航' : 'Main navigation'}"><a class="logo" href="${zh ? '/zh/' : '/'}"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide</span></a><button class="nav-toggle" aria-expanded="false" aria-label="${zh ? '展开导航' : 'Toggle navigation'}">☰</button><ul class="nav-links"><li><a href="${zh ? '/zh/guides/beginners-guide' : '/guides/beginners-guide'}">${zh ? '攻略' : 'Guides'}</a></li><li><a class="active" href="${zh ? '/zh/database' : '/database'}">${zh ? '资料库' : 'Database'}</a></li><li><a href="${zh ? '/zh/map' : '/map'}">${zh ? '地图' : 'Map'}</a></li><li><a href="${zh ? '/zh/problems' : '/problems'}">${zh ? '问题' : 'Problems'}</a></li><li><a href="${zh ? '/zh/search' : '/search'}">${zh ? '搜索' : 'Search'}</a></li></ul></nav></header><main><article class="article database-page animal-detail-page" style="max-width:980px">${renderBody(locale)}</article></main>${renderSiteFooter(locale, { en: 'Sources and game versions are shown with each fact', zh: '来源边界与游戏版本随事实标注' })}<script src="/assets/js/main.js?v=20261003-r15" defer></script></body></html>`;
  return html.replace(`<li><a href="${zh ? '/zh/search' : '/search'}">${zh ? '搜索' : 'Search'}</a></li></ul>`, `<li><a href="${zh ? '/zh/search' : '/search'}">${zh ? '搜索' : 'Search'}</a></li><li><a href="/research">${zh ? '研究' : 'Research'}</a></li><li><a href="/contribute">${zh ? '投稿' : 'Contribute'}</a></li></ul>`);
}

const outputs = [
  ['database/animals/chicken.html', shell('en')],
  ['zh/database/animals/chicken.html', shell('zh')],
  ['database/animals/livestock.html', shell('en', 'livestock')],
  ['zh/database/animals/livestock.html', shell('zh', 'livestock')],
];
let failed = false;
for (const [relative, expected] of outputs) {
  const target = path.join(root, relative);
  if (checkOnly) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== expected) {
      console.error(`FAIL: ${relative} is missing or out of sync. Re-run node scripts/build-animal-entries.cjs`);
      failed = true;
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, expected);
  }
}
if (failed) process.exit(1);
console.log(`${checkOnly ? 'PASS' : 'Wrote'}: bilingual chicken detail routes from data/animals.json.`);
