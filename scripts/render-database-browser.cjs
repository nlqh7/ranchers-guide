/* Shared static navigation for generated databases. No client-side dependency. */
const itemIcons = require('../data/item-icons.json').icons;
const seedItems = require('../data/build-seeds.json').items;
const produceItems = require('../data/build-produce.json').items;
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}

function renderIcon(kind, id) {
  const icon = itemIcons.find(item => item.kind === kind && item.id === id);
  return icon ? `<img class="database-item-icon" src="${icon.src}" alt="" width="32" height="32" decoding="async">` : '';
}

function decorateEntryHeadings(html, kind) {
  let decorated = html.replace(/(<section[^>]*id="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>)([\s\S]*?)(<\/h2>)/g,
    (match, start, id, title, end) => {
      const icon = renderIcon(kind, id);
      return icon ? `${start}<span class="database-entry-title">${icon}<span>${title}</span></span>${end}` : match;
    });
  if (kind === 'animals') {
    decorated = decorated.replace(/(<section class="evidence-ledger animal-profile"[^>]*>[\s\S]*?<div id="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>)([\s\S]*?)(<\/h2>)/g,
      (match, start, id, title, end) => {
        const icon = renderIcon(kind, id);
        return icon ? `${start}<span class="database-entry-title">${icon}<span>${title}</span></span>${end}` : match;
      });
  }
  return decorated;
}

function renderTabs(locale, current) {
  const zh = locale === 'zh';
  const prefix = zh ? '/zh' : '';
  const categories = [
    ['animals', 'Animals', '动物'], ['crops', 'Crops', '作物'],
    ['materials', 'Materials', '材料'], ['quests', 'Quests', '任务'],
    ['npcs', 'People', '人物'], ['customization', 'Customization', '外观'], ['map', 'Map', '地图'],
  ];
  return `<nav class="database-tabs" aria-label="${zh ? '资料分类' : 'Database categories'}">${categories.map(([id, en, cn]) =>
    `<a href="${prefix}/${id === 'map' ? 'map' : `database/${id}`}"${id === current ? ' aria-current="page"' : ''}>${zh ? cn : en}</a>`).join('')}</nav>`;
}

function renderEntries(data, kind, locale, base = '') {
  const zh = locale === 'zh';
  const link = (id, name) => `<a href="${base}#${escapeHtml(id)}">${renderIcon(kind, id)}<span>${escapeHtml(name)}</span></a>`;
  if (kind === 'animals') {
    const wildlife = data.wildlifeReference?.entries || [];
    const enemies = data.enemyReference?.entries || [];
    return `<div class="database-seasons"><div><h3>${zh ? '牧场动物' : 'Ranch animals'}</h3><div class="database-entry-links">${data.species.map(a => link(a.id, zh ? a.zh.tocLabel : a.name)).join('')}</div></div>${wildlife.length ? `<div><h3>${zh ? '构建内野生生物' : 'Build-defined wildlife'}</h3><div class="database-entry-links">${wildlife.map(a => link(`wildlife-${a.id}`, zh ? a.zhName : a.name)).join('')}</div></div>` : ''}${enemies.length ? `<div><h3>${zh ? '原生 Enemies 表名称' : 'Enemies-table names'}</h3><div class="database-entry-links">${enemies.map(a => link(`enemy-${a.id}`, zh ? a.zhName : a.name)).join('')}</div></div>` : ''}</div>`;
  }
  if (kind !== 'crops') {
    return `<div class="database-entry-links">${data[kind].map(item => {
      let name = kind === 'quests' && item.buildGuide ? (zh ? item.buildGuide.zhName : item.buildGuide.name) : (zh ? item.zhName : item.name);
      if (zh && kind === 'materials' && name.endsWith(` ${item.name}`)) name = name.slice(0, -item.name.length).trim();
      if (kind === 'materials') {
        const native = require('../data/build-resources.json').items.find(i => i.materialId === item.id);
        if (native) name = zh ? native.zhName : native.name;
      }
      return link(item.id, name);
    }).join('')}</div>`;
  }
  const seasons = [...new Set(data.buildRoster.entries.map(c => c.season))];
  return `<div class="database-seasons">${seasons.map(season => {
    const entries = data.buildRoster.entries.filter(c => c.season === season);
    return `<div><h3>${escapeHtml(zh ? entries[0].zhSeason : season)}</h3><div class="database-entry-links">${entries.map(c =>
      link(c.id, zh ? c.zhName : c.name)).join('')}</div></div>`;
  }).join('')}${data.inputs?.some(i => i.buildInput) ? `<div><h3>${zh ? '肥料' : 'Fertilizers'}</h3><div class="database-entry-links">${data.inputs.filter(i => i.buildInput).map(i => link(i.id, zh ? i.buildInput.zhName : i.buildInput.name)).join('')}</div></div>` : ''}<div><h3>${zh ? '未列入当前作物表' : 'Not in current roster'}</h3><div class="database-entry-links">${seedItems.filter(i => i.rosterStatus === 'not-included').map(i => link(`seed-${i.cropId}`, zh ? i.zhName : i.name)).join('')}</div></div></div>`;
}

function renderLookup(data, kind, locale) {
  const zh = locale === 'zh';
  const titles = { animals: ['Choose an animal', '选择动物'], crops: ['Browse crops by season', '按季节查作物'], materials: ['Choose a material', '选择材料'], quests: ['Choose a quest', '选择任务'], npcs: ['Choose a person', '选择人物'] };
  const title = titles[kind][zh ? 1 : 0];
  const notes = {
    animals: ['Look up ranch-animal care and build-defined wildlife names. Wildlife entries do not establish behavior or spawn locations.', '查看牧场动物照料与构建内野生生物名称；野生生物条目不证明行为或生成地点。'],
    crops: ['Seasons come from game-build configuration. Select a crop for details; Marrow and Leek availability is unconfirmed.', '季节来自游戏构建配置；点击查看种植资料。西葫芦、韭葱的购买途径尚未确认。'],
    materials: ['Find how to obtain each material and where it is used.', '查获取途径与用途。'],
    quests: ['Check the steps, preparation and stuck-point guides.', '查任务步骤、准备事项与卡关处理。'],
    npcs: ['Find services, related quests and locations.', '查人物服务、相关任务与地点。'],
  };
  return `${renderTabs(locale, kind)}
    <section class="database-browser" id="browse-entries" aria-labelledby="browse-entries-title">
      <h2 id="browse-entries-title">${title}</h2>
      ${renderEntries(data, kind, locale)}${['materials','animals'].includes(kind)?`<div class="database-guide-links"><a href="${zh?'/zh':''}/guides/resources-and-materials#consumables">${zh?'食物与消耗品配置':'Food & consumable settings'}</a></div>`:''}
      ${kind === 'materials' ? `<div class="database-guide-links"><a href="${zh?'/zh':''}/guides/resources-and-materials#resource-definitions">${zh?'水、能源与燃料罐':'Water, energy & fuel'}</a></div>` : ''}<p class="database-browse-note">${notes[kind][zh ? 1 : 0]}</p>
    </section>`;
}

function decorateReferencePage(html, data, kind, locale) {
  const zh = locale === 'zh';
  const titles = { materials: ['Materials', '材料资料'], quests: ['Quests', '任务资料'], npcs: ['People & services', '人物与服务'] };
  const note = html.match(/<div class="notice (?:warning|info)">[\s\S]*?<\/div>/)?.[0] || '';
  const meta = html.match(/<p class="meta">[\s\S]*?<\/p>/)?.[0] || '';
  const serviceDirectory = html.match(/<details class="database-reference-notes dialogue-service-directory">[\s\S]*?<\/details>/)?.[0] || '';
  return decorateEntryHeadings(html, kind)
    .replace('</head>', '<link rel="stylesheet" href="/assets/css/database-browser.css?v=20260830-8"></head>')
    .replace('<body>', '<body class="database-surface">')
    .replace(/class="article([^"]*)"(?: style="max-width:980px")?/, `class="article$1 database-page database-${kind}"`)
    .replace(/<h1>[\s\S]*?<\/h1>[\s\S]*?(?=<section class="(?:evidence-ledger )?(?:material|entity)-profile\b)/,
      `<h1>${titles[kind][zh ? 1 : 0]}</h1>${renderLookup(data, kind, locale)}${serviceDirectory}<details class="database-reference-notes"><summary>${zh ? '版本与资料说明' : 'Version & reference notes'}</summary>${meta}${note}</details>`)
    .replace(/(<section class="(?:evidence-ledger )?(?:material|entity)-profile\b[^>]*>)/g,
      `$1<a class="database-back" href="#browse-entries">${zh ? '返回条目目录' : 'Back to entries'}</a>`)
    .replace(/[\t ]+$/gm, '');
}

function decoratePage(html, data, kind, locale) {
  const zh = locale === 'zh';
  const cssVersion = '20260830-8';
  return decorateEntryHeadings(html, kind)
    .replace('</head>', `  <link rel="stylesheet" href="/assets/css/database-browser.css?v=${cssVersion}">\n</head>`)
    .replace('<body>', '<body class="database-surface">')
    .replace(/class="article"(?: style="max-width:\s*980px;?")?/, 'class="article database-page"')
    .replace(' / Database / ', ' / <a href="/database">Database</a> / ')
    .replace(/<h1>[\s\S]*?<\/h1>/, `<h1>${kind === 'animals' ? (zh ? '动物资料' : 'Animals') : (zh ? '作物资料' : 'Crops')}</h1>`)
    .replace(/(<h1>[\s\S]*?<\/h1>)/, `$1\n${renderLookup(data, kind, locale)}`)
    .replace(/\s*<figure class="page-banner">[\s\S]*?<\/figure>/g, '')
    .replace(/<div class="entity-decision">[\s\S]*?<\/div>/g, '')
    .replace(/<nav class="toc"[\s\S]*?<\/nav>/g, toc => `<details class="database-outline"><summary>${zh ? '完整目录' : 'Full contents'}</summary>${toc}</details>`)
    .replace(/<p class="meta">([\s\S]*?)<\/p>/, (_, meta) => `<details class="database-reference-notes"><summary>${zh ? '版本与资料说明' : 'Version & reference notes'}</summary><p class="meta">${meta}</p></details>`)
    .replace(/<div class="evidence-status">[\s\S]*?<\/div>/, notice => `<details class="database-outline"><summary>${zh ? '资料来源与验证说明' : 'Sources and verification'}</summary>${notice}</details>`)
    .replace(/(<section class="database-browser"[\s\S]*?<\/section>)([\s\S]*?)(?=<section class="evidence-ledger animal-profile")/, (_, browser, intro) => `${browser}<details class="database-reference-notes"><summary>${zh ? '使用指南与资料说明' : 'Getting started & reference notes'}</summary>${intro}</details>\n`)
    .replace(/(<section class="evidence-ledger animal-profile"[^>]*>)/g, `$1<a class="database-back" href="#browse-entries">${zh ? '返回条目目录' : 'Back to entries'}</a>`)
    .replace(/[\t ]+$/gm, '');
}

function renderProduceSettings(cropId, locale) {
  const zh = locale === 'zh';
  const prefix = zh ? '/zh' : '';
  const items = produceItems.filter(item => item.cropId === cropId);
  if (!items.length) return '';
  const rows = items.map(item => {
    const size = item.size === 'giant' ? (zh ? '巨型配置' : 'Giant configuration') : (zh ? '普通配置' : 'Normal configuration');
    const stats = zh
      ? `${size} · 生命恢复 ${item.health.restore} · 体力恢复 ${item.energy.restore}`
      : `${size} · Health restore ${item.health.restore} · Energy restore ${item.energy.restore}`;
    const links = item.shopOfferIds.map((offerId, index) => `<a href="${prefix}/guides/resources-and-materials#offer-${offerId}">${zh ? `商店配置 ${index + 1}` : `Shop configuration ${index + 1}`}</a>`).join('');
    return `<li data-produce-id="${escapeHtml(item.id)}"><strong>${escapeHtml(zh ? `${item.zhName} · ${item.name}` : item.name)}</strong><span> — ${escapeHtml(stats)}</span>${links ? `<div class="database-guide-links">${links}</div>` : ''}</li>`;
  }).join('');
  return `<details class="database-reference-notes" data-produce-settings><summary>${zh ? '农产品物品配置' : 'Produce item settings'}</summary><p>${zh ? '以下名称来自 I2 原始文本。生命/体力恢复是游戏文件配置，尚未实测是否可安全食用或实际恢复相同数值。' : 'Names come from the original I2 text. Health/Energy restoration values are game-file settings, not tested safe-to-eat or runtime-effect claims.'}</p><ul class="evidence-list">${rows}</ul><p>${zh ? '这些物品均为 Farming、铜级、双手持握，且装备/堆叠/丢弃/出售标志开启。商店引用不保证当前库存；内部价格不作零售价或玩家出售收入。' : 'All use Farming classification, Bronze rarity, a both-hands slot, and enabled equip/stack/drop/sell flags. Shop references do not guarantee current stock; internal prices are not retail or player-sale values.'}</p></details>`;
}

function renderCropFacts(data, id, locale) {
  const entry = data.buildRoster.entries.find(c => c.id === id);
  if (!entry) return '';
  const zh = locale === 'zh';
  const prefix = zh ? '/zh' : '';
  const seed = seedItems.find(item => item.cropId === id && item.rosterStatus === 'current-roster');
  if (!seed) throw new Error(`Missing current-roster seed for ${id}`);
  const days = n => zh ? `${n} 天` : `${n} ${n === 1 ? 'day' : 'days'}`;
  const fields = [
    [zh ? '种子物品' : 'Seed item', zh ? `${seed.zhName} · ${seed.name}` : seed.name],
    [zh ? '季节' : 'Season', zh ? entry.zhSeason : entry.season],
    [zh ? '首次收获' : 'First harvest', days(entry.daysToFirstHarvest)],
    [zh ? '再生间隔' : 'Regrow interval', entry.regrowEveryDays ? days(entry.regrowEveryDays) : (zh ? '不再生' : 'No regrow')],
    [zh ? '断水容忍' : 'Dry tolerance', days(entry.daysWithoutWater)],
  ];
  const shop = seed.shopOfferId
    ? `<a href="${prefix}/guides/resources-and-materials#offer-${seed.shopOfferId}">${zh ? '查看商店配置记录' : 'View shop configuration'}</a>`
    : (zh ? '没有匹配的种子商店记录' : 'No matched seed-shop record');
  return `<div class="database-config" data-seed-id="${escapeHtml(seed.id)}"><p><strong>${zh ? '游戏构建配置' : 'Game-build configuration'}</strong> · ${escapeHtml(entry.build)}</p><dl class="database-facts">${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}<div><dt>${zh ? '种子商店表' : 'Seed-shop table'}</dt><dd>${shop}</dd></div></dl><p class="database-browse-note">${zh ? '以上为文件配置，尚未逐项实测。' : 'File configuration, not individually gameplay-tested.'} ${seed.shopOfferId ? (zh ? '商店表有记录，不保证当前可购买。' : 'A shop-table match does not guarantee current availability.') : (zh ? '购买途径未确认。' : 'The acquisition is unconfirmed.')} <a href="#current-build-crop-roster">${zh ? '查看来源与完整对照表' : 'Source and comparison table'}</a></p><details class="database-reference-notes"><summary>${zh ? '种子物品配置' : 'Seed item settings'}</summary><p>${zh ? '站长从游戏文件整理：分类 Farming、铜级、右手持握，可装备、堆叠、丢弃和出售；体力配置为消耗 1、恢复 0。内部价格未公开，I2 说明栏为空。' : 'Editor-collected game-file settings: Farming classification, Bronze rarity, right-hand slot, equip/stack/drop/sell flags enabled, and Energy consumption 1 / restoration 0. Internal prices are withheld; I2 description slots are empty.'}</p></details>${renderProduceSettings(id, locale)}</div>`;
}

function renderExcludedSeeds(locale) {
  const zh = locale === 'zh';
  const days = n => zh ? `${n} 天` : `${n} ${n === 1 ? 'day' : 'days'}`;
  return seedItems.filter(item => item.rosterStatus === 'not-included').map(item => {
    const fields = [
      [zh ? '来源分组' : 'Source group', zh ? 'NotINCLUDED 表' : 'NotINCLUDED table', true],
      [zh ? '序列化季节' : 'Serialized season', zh ? ({spring:'春季',summer:'夏季'}[item.configuredSeason] || item.configuredSeason) : item.configuredSeason.replace(/^./, c => c.toUpperCase())],
      [zh ? '首次收获配置' : 'First-harvest setting', days(item.daysToFirstHarvest)],
      [zh ? '再生配置' : 'Regrow setting', item.regrowEveryDays ? days(item.regrowEveryDays) : (zh ? '不再生' : 'No regrow')],
      [zh ? '断水配置' : 'Dry-tolerance setting', days(item.daysWithoutWater)],
      [zh ? '体力配置' : 'Energy setting', zh ? '消耗 1 · 恢复 0' : 'Consumption 1 · restoration 0'],
    ];
    const produceAliases = produceItems.filter(produce => produce.cropId === item.cropId).flatMap(produce => [produce.name, produce.zhName, produce.id]).join('|');
    return `<section class="evidence-ledger animal-profile" id="seed-${escapeHtml(item.cropId)}" data-seed-id="${escapeHtml(item.id)}" data-search-entry data-search-title="${escapeHtml(zh ? item.zhName : item.name)}" data-search-aliases="${escapeHtml(produceAliases)}" data-search-tags="${escapeHtml(`${item.name} ${item.zhName} ${item.id}`)}" data-search-status="${zh ? '未列入当前作物表' : 'Not in current roster'}"><div class="section-heading-row"><h2>${escapeHtml(zh ? `${item.zhName} · ${item.name}` : item.name)}</h2><span class="tag historical">${zh ? '未列入当前作物表' : 'Not in current roster'}</span></div><p>${zh ? '此记录来自名称明确为 NotINCLUDED 的源表，只证明文件中保留了配置；不证明当前可以种植、购买或收获。' : 'This record comes from a source table explicitly named NotINCLUDED. It proves retained serialized settings, not current planting, purchase or harvest availability.'}</p><div class="database-config"><dl class="database-facts">${fields.map(([label, value, wide]) => `<div${wide ? ' class="database-fact-wide-mobile"' : ''}><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><p class="database-browse-note">${zh ? '缺失的最低果实配置保持为空；未把内部价格、生成数量或理论产量发布为玩法事实。' : 'The missing minimum-fruit field remains null. Internal prices, spawn counts and theoretical yield are not published as gameplay facts.'}</p><details class="database-reference-notes"><summary>${zh ? '种子物品配置' : 'Seed item settings'}</summary><p>${zh ? '分类 Farming、铜级、右手持握，可装备、堆叠、丢弃和出售；I2 说明栏为空。内部价格不作为零售价公开。' : 'Farming classification, Bronze rarity, right-hand slot, and equip/stack/drop/sell flags enabled. I2 description slots are empty; internal prices are not published as retail prices.'}</p></details>${renderProduceSettings(item.cropId, locale)}</div></section>`;
  }).join('\n');
}

function renderBuildOnlyCrops(data, locale) {
  const zh = locale === 'zh';
  return data.buildRoster.entries.filter(c => !data.crops.some(profile => profile.id === c.id)).map(c => {
    const name = zh ? `${c.zhName} ${c.name}` : c.name;
    const seed = seedItems.find(item => item.cropId === c.id && item.rosterStatus === 'current-roster');
    return `<section class="evidence-ledger animal-profile" id="${c.id}" data-search-entry data-search-title="${escapeHtml(zh ? c.zhName : c.name)}" data-search-aliases="${escapeHtml(`${seed.name}|${seed.zhName}|${seed.id}`)}" data-search-tags="${escapeHtml(`${c.name} ${c.zhName} ${c.season} ${c.zhSeason}`)}" data-search-status="${zh ? '游戏构建配置' : 'Game-build configuration'}"><h2>${escapeHtml(name)}</h2>${renderCropFacts(data, c.id, locale)}<p>${zh ? '当前购买价、出售收入和实际每株产量尚未验证。' : 'Current purchase price, sale income and actual per-plant yield are not verified.'}</p></section>`;
  }).join('\n');
}

module.exports = { renderTabs, renderEntries, decoratePage, decorateReferencePage, renderCropFacts, renderBuildOnlyCrops, renderExcludedSeeds };
