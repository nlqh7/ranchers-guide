/* Generate the bilingual database landing-page main blocks from existing records. */
const fs = require('node:fs');
const path = require('node:path');
const { renderTabs, renderEntries } = require('./render-database-browser.cjs');
const root = path.resolve(__dirname, '..');
const read = kind => JSON.parse(fs.readFileSync(path.join(root, 'data', `${kind}.json`), 'utf8'));
const animals = read('animals');
const crops = read('crops');
const customization = JSON.parse(fs.readFileSync(path.join(root, 'data/build-customization.json'), 'utf8'));
const vehicles = JSON.parse(fs.readFileSync(path.join(root, 'data/build-vehicles.json'), 'utf8'));
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

function render(locale) {
  const zh = locale === 'zh';
  const prefix = zh ? '/zh' : '';
  const labels = { animals: ['Animals', '动物'], crops: ['Crops', '作物'], materials: ['Materials', '材料'], quests: ['Quests', '任务'], npcs: ['People & services', '人物与服务'], vehicles: ['Vehicles', '车辆'], customization: ['Character customization', '角色外观'] };
  const descriptions = {
    animals: ['Breeds, care & products', '品种、照料与产物'],
    crops: ['Seasons & growing times', '种植季节与生长时间'],
    materials: ['Sources & building uses', '获取途径与建造用途'],
    quests: ['Objectives & preparation', '任务步骤与准备事项'],
    npcs: ['Shops, services & quests', '商店、服务与相关任务'],
    vehicles: ['Names, dealer links & source settings', '名称、经销商记录与原生配置'],
    customization: ['Names & source settings', '名称与原生配置'],
  };
  const guideLinks = {
    materials: [['crafting-guide', 'Recipes & tools', '制作配方与工具'], ['building-construction#shop-building-materials', 'Building requirements', '建筑材料需求'], ['resources-and-materials#shops', 'Shop item lookup', '商店商品查阅'], ['electricity-power#equipment', 'Power & water equipment', '水电设备'], ['resources-and-materials#resource-definitions','Water, energy & fuel','水、能源与燃料']],
    animals: [['animal-guide#feeding', 'Feed and water', '喂食与饮水'], ['resources-and-materials#consumables', 'Milk, eggs & meat', '奶、蛋与肉类资料']],
    crops: [['farming-fields', 'Planting guide', '种植指南'], ['farming-fields#farm-equipment', 'Sprinklers & farm equipment', '洒水器与农用设施'], ['money-making', 'Selling crops', '出售与收益']],
    quests: [['gigi-large-egg-quest', 'Gigi’s large eggs', 'Gigi 大鸡蛋攻略']],
  };
  const cards = Object.keys(labels).map(kind => {
    const route = kind === 'vehicles' ? `${prefix}/guides/vehicles-transport` : `${prefix}/database/${kind}`;
    const entries = kind === 'customization'
      ? `<div class="database-entry-links">${customization.categories.map(category => `<a href="${route}#browse-entries"><span>${escapeHtml(zh ? category.zhName : category.name)}</span></a>`).join('')}</div>`
      : renderEntries(kind === 'animals' ? animals : kind === 'crops' ? crops : kind === 'vehicles' ? vehicles : read(kind), kind, locale, route);
    const guides = (guideLinks[kind] || []).map(([id, en, cn]) => `<a href="${prefix}/guides/${id}">${zh ? cn : en}</a>`).join('');
    return `<section class="database-hub-card database-hub-${kind}"><div class="database-hub-heading"><h2><a href="${route}">${labels[kind][zh ? 1 : 0]} <span aria-hidden="true">›</span></a></h2><p>${descriptions[kind][zh ? 1 : 0]}</p></div><div class="database-hub-content">${entries}${guides ? `<div class="database-guide-links">${guides}</div>` : ''}</div></section>`;
  }).join('\n');
  return `<main>
<!-- DATABASE BROWSER START -->
  <div class="container database-hub">
    <nav class="breadcrumb" aria-label="${zh ? '面包屑' : 'Breadcrumb'}"><a href="${prefix}/">${zh ? '首页' : 'Home'}</a> / ${zh ? '知识库' : 'Database'}</nav>
    <div class="database-hub-intro"><div><h1>${zh ? '游戏资料库' : 'Game database'}</h1><p>${zh ? '从一个名称开始，找到你需要的资料。' : 'Find a name. Get the details.'}</p></div>
    <form class="knowledge-search" action="${prefix}/search" method="get" role="search">
      <label class="visually-hidden" for="knowledge-query">${zh ? '搜索知识库' : 'Search the database'}</label>
      <div class="knowledge-search-control"><input id="knowledge-query" name="q" type="search" placeholder="${zh ? '搜索动物、作物、物品、车辆或任务' : 'Search animals, crops, items, vehicles or quests'}"><button type="submit">${zh ? '搜索' : 'Search'}</button></div>
    </form></div>
    ${renderTabs(locale)}
    <div class="database-hub-grid">${cards}
      <section class="database-hub-card"><div class="database-hub-heading"><h2><a href="${prefix}/map">${zh ? '地点与地图' : 'Places & map'} <span aria-hidden="true">›</span></a></h2><p>${zh ? '查地点，找路线' : 'Places & directions'}</p></div><div class="database-hub-content"><div class="database-entry-links"><a href="${prefix}/map">${zh ? '互动地图' : 'Interactive map'}</a><a href="${prefix}/problems">${zh ? '故障与卡关' : 'Troubleshooting'}</a></div></div></section>
    </div>
    <p class="database-browse-note">${zh ? '非官方玩家资料。来源和未验证项标在各条目内。' : 'Unofficial fan reference. Sources and unverified details are labeled within each entry.'} <a href="${prefix}/methodology">${zh ? '验证方法' : 'Verification method'}</a></p>
  </div>
<!-- DATABASE BROWSER END -->
</main>`;
}

let failed = false;
for (const locale of ['en', 'zh']) {
  const file = path.join(root, locale === 'zh' ? 'zh/database.html' : 'database.html');
  const before = fs.readFileSync(file, 'utf8');
  let after = before.replace(/<main>[\s\S]*?<\/main>/, render(locale));
  if (!after.includes('/assets/css/database-browser.css?')) after = after.replace('</head>', '<link rel="stylesheet" href="/assets/css/database-browser.css?v=20260831-1">\n</head>');
  after = after.replace(/database-browser\.css\?v=[^"\s]+/g, 'database-browser.css?v=20260831-1');
  after = after.replace(/<body(?: class="database-surface")?>/, '<body class="database-surface">');
  if (process.argv.includes('--check')) {
    if (before !== after) { console.error(`FAIL: ${file} is out of sync`); failed = true; }
  } else fs.writeFileSync(file, after);
}
if (failed) process.exit(1);
console.log('PASS: bilingual database landing pages are synchronized.');
