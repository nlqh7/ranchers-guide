/* Shared static navigation for generated databases. No client-side dependency. */
const itemIcons = require('../data/item-icons.json').icons;
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}

function renderIcon(kind, id) {
  const icon = itemIcons.find(item => item.kind === kind && item.id === id);
  return icon ? `<img class="database-item-icon" src="${icon.src}" alt="" width="32" height="32" decoding="async">` : '';
}

function decorateEntryHeadings(html, kind) {
  return html.replace(/(<section[^>]*id="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>)([\s\S]*?)(<\/h2>)/g,
    (match, start, id, title, end) => {
      const icon = renderIcon(kind, id);
      return icon ? `${start}<span class="database-entry-title">${icon}<span>${title}</span></span>${end}` : match;
    });
}

function renderTabs(locale, current) {
  const zh = locale === 'zh';
  const prefix = zh ? '/zh' : '';
  const categories = [
    ['animals', 'Animals', '动物'], ['crops', 'Crops', '作物'],
    ['materials', 'Materials', '材料'], ['quests', 'Quests', '任务'],
    ['npcs', 'People', '人物'], ['map', 'Map', '地图'],
  ];
  return `<nav class="database-tabs" aria-label="${zh ? '资料分类' : 'Database categories'}">${categories.map(([id, en, cn]) =>
    `<a href="${prefix}/${id === 'map' ? 'map' : `database/${id}`}"${id === current ? ' aria-current="page"' : ''}>${zh ? cn : en}</a>`).join('')}</nav>`;
}

function renderEntries(data, kind, locale, base = '') {
  const zh = locale === 'zh';
  const link = (id, name) => `<a href="${base}#${escapeHtml(id)}">${renderIcon(kind, id)}<span>${escapeHtml(name)}</span></a>`;
  if (kind === 'animals') {
    return `<div class="database-entry-links">${data.species.map(a => link(a.id, zh ? a.zh.tocLabel : a.name)).join('')}</div>`;
  }
  if (kind !== 'crops') {
    return `<div class="database-entry-links">${data[kind].map(item => {
      let name = kind === 'quests' && item.buildGuide ? (zh ? item.buildGuide.zhName : item.buildGuide.name) : (zh ? item.zhName : item.name);
      if (zh && kind === 'materials' && name.endsWith(` ${item.name}`)) name = name.slice(0, -item.name.length).trim();
      return link(item.id, name);
    }).join('')}</div>`;
  }
  const seasons = [...new Set(data.buildRoster.entries.map(c => c.season))];
  return `<div class="database-seasons">${seasons.map(season => {
    const entries = data.buildRoster.entries.filter(c => c.season === season);
    return `<div><h3>${escapeHtml(zh ? entries[0].zhSeason : season)}</h3><div class="database-entry-links">${entries.map(c =>
      link(c.id, zh ? c.zhName : c.name)).join('')}</div></div>`;
  }).join('')}${data.inputs?.some(i => i.buildInput) ? `<div><h3>${zh ? '肥料' : 'Fertilizers'}</h3><div class="database-entry-links">${data.inputs.filter(i => i.buildInput).map(i => link(i.id, zh ? i.buildInput.zhName : i.buildInput.name)).join('')}</div></div>` : ''}</div>`;
}

function renderLookup(data, kind, locale) {
  const zh = locale === 'zh';
  const titles = { animals: ['Choose an animal', '选择动物'], crops: ['Browse crops by season', '按季节查作物'], materials: ['Choose a material', '选择材料'], quests: ['Choose a quest', '选择任务'], npcs: ['Choose a person', '选择人物'] };
  const title = titles[kind][zh ? 1 : 0];
  const notes = {
    animals: ['Look up chicken care, cattle breeds and goat names and products. Rabbit details are still being collected.', '查看鸡的照料、牛的品种、山羊名称与产物；兔的详细资料仍在收集。'],
    crops: ['Seasons come from game-build configuration. Select a crop for details; Marrow and Leek availability is unconfirmed.', '季节来自游戏构建配置；点击查看种植资料。西葫芦、韭葱的购买途径尚未确认。'],
    materials: ['Find how to obtain each material and where it is used.', '查获取途径与用途。'],
    quests: ['Check the steps, preparation and stuck-point guides.', '查任务步骤、准备事项与卡关处理。'],
    npcs: ['Find services, related quests and locations.', '查人物服务、相关任务与地点。'],
  };
  return `${renderTabs(locale, kind)}
    <section class="database-browser" id="browse-entries" aria-labelledby="browse-entries-title">
      <h2 id="browse-entries-title">${title}</h2>
      ${renderEntries(data, kind, locale)}${['materials','animals'].includes(kind)?`<div class="database-guide-links"><a href="${zh?'/zh':''}/guides/resources-and-materials#consumables">${zh?'食物与消耗品配置':'Food & consumable settings'}</a></div>`:''}
      <p class="database-browse-note">${notes[kind][zh ? 1 : 0]}</p>
    </section>`;
}

function decorateReferencePage(html, data, kind, locale) {
  const zh = locale === 'zh';
  const titles = { materials: ['Materials', '材料资料'], quests: ['Quests', '任务资料'], npcs: ['People & services', '人物与服务'] };
  const note = html.match(/<div class="notice (?:warning|info)">[\s\S]*?<\/div>/)?.[0] || '';
  const meta = html.match(/<p class="meta">[\s\S]*?<\/p>/)?.[0] || '';
  return decorateEntryHeadings(html, kind)
    .replace('</head>', '<link rel="stylesheet" href="/assets/css/database-browser.css?v=20260828-4"></head>')
    .replace('<body>', '<body class="database-surface">')
    .replace(/class="article([^"]*)"(?: style="max-width:980px")?/, `class="article$1 database-page database-${kind}"`)
    .replace(/<h1>[\s\S]*?<\/h1>[\s\S]*?(?=<section class="(?:evidence-ledger )?(?:material|entity)-profile\b)/,
      `<h1>${titles[kind][zh ? 1 : 0]}</h1>${renderLookup(data, kind, locale)}<details class="database-reference-notes"><summary>${zh ? '版本与资料说明' : 'Version & reference notes'}</summary>${meta}${note}</details>`)
    .replace(/(<section class="(?:evidence-ledger )?(?:material|entity)-profile\b[^>]*>)/g,
      `$1<a class="database-back" href="#browse-entries">${zh ? '返回条目目录' : 'Back to entries'}</a>`)
    .replace(/[\t ]+$/gm, '');
}

function decoratePage(html, data, kind, locale) {
  const zh = locale === 'zh';
  return decorateEntryHeadings(html, kind)
    .replace('</head>', '  <link rel="stylesheet" href="/assets/css/database-browser.css?v=20260828-4">\n</head>')
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

function renderCropFacts(data, id, locale) {
  const entry = data.buildRoster.entries.find(c => c.id === id);
  if (!entry) return '';
  const zh = locale === 'zh';
  const days = n => zh ? `${n} 天` : `${n} ${n === 1 ? 'day' : 'days'}`;
  const fields = [
    [zh ? '季节' : 'Season', zh ? entry.zhSeason : entry.season],
    [zh ? '首次收获' : 'First harvest', days(entry.daysToFirstHarvest)],
    [zh ? '再生间隔' : 'Regrow interval', entry.regrowEveryDays ? days(entry.regrowEveryDays) : (zh ? '不再生' : 'No regrow')],
    [zh ? '断水容忍' : 'Dry tolerance', days(entry.daysWithoutWater)],
  ];
  return `<div class="database-config"><p><strong>${zh ? '游戏构建配置' : 'Game-build configuration'}</strong> · ${escapeHtml(entry.build)}</p><dl class="database-facts">${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><p class="database-browse-note">${zh ? '以上为文件配置，尚未逐项实测。' : 'File configuration, not individually gameplay-tested.'} ${entry.townSeedVendor === 'listed' ? (zh ? '种子商店表有记录，不保证当前可购买。' : 'Referenced by the seed-shop table; current availability is not guaranteed.') : (zh ? '种子商店表没有引用，购买途径未确认。' : 'Not referenced by the seed-shop table; acquisition is unconfirmed.')} <a href="#current-build-crop-roster">${zh ? '查看来源与完整对照表' : 'Source and comparison table'}</a></p></div>`;
}

function renderBuildOnlyCrops(data, locale) {
  const zh = locale === 'zh';
  return data.buildRoster.entries.filter(c => !data.crops.some(profile => profile.id === c.id)).map(c => {
    const name = zh ? `${c.zhName} ${c.name}` : c.name;
    return `<section class="evidence-ledger animal-profile" id="${c.id}" data-search-entry data-search-title="${escapeHtml(zh ? c.zhName : c.name)}" data-search-tags="${escapeHtml(`${c.name} ${c.zhName} ${c.season} ${c.zhSeason}`)}" data-search-status="${zh ? '游戏构建配置' : 'Game-build configuration'}"><h2>${escapeHtml(name)}</h2>${renderCropFacts(data, c.id, locale)}<p>${zh ? '当前购买价、出售收入和实际每株产量尚未验证。' : 'Current purchase price, sale income and actual per-plant yield are not verified.'}</p></section>`;
  }).join('\n');
}

module.exports = { renderTabs, renderEntries, decoratePage, decorateReferencePage, renderCropFacts, renderBuildOnlyCrops };
