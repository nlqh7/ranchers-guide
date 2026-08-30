/* Generate the bilingual character-customization catalogue from retained build data. */
const fs = require('node:fs');
const path = require('node:path');
const { renderTabs } = require('./render-database-browser.cjs');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-customization.json');
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const anchorFor = item => `customization-${item.sourceName.toLowerCase().replace(/_/g, '-')}-${item.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const bool = (value, zh) => value === null ? (zh ? '未设置' : 'Not set') : value ? (zh ? '是' : 'Yes') : (zh ? '否' : 'No');

function renderDirectory(locale) {
  const zh = locale === 'zh';
  return data.categories.map((category, index) => {
    const items = data.items.filter(item => item.category === category.id);
    return `<details class="customization-directory-group" data-customization-category-group="${category.id}"${index === 0 ? ' open' : ''}><summary>${escapeHtml(zh ? category.zhName : category.name)} <span>${items.length}</span></summary><div class="customization-directory-list">${items.map(item => `<a class="customization-directory-link" href="#${anchorFor(item)}" data-customization-directory-link data-category="${item.category}" data-settings="${[item.acceptsColorCustomization?'color':'',item.includedInCharacterCreator?'creator':'',item.dropExclusive?'drop':''].filter(Boolean).join(' ')}" data-filter-text="${escapeHtml(`${item.name} ${item.zhName} ${item.id} ${item.sourceName}`.toLowerCase())}"><span>${escapeHtml(zh ? item.zhName : item.name)}</span><code>${escapeHtml(item.id)}</code></a>`).join('')}</div></details>`;
  }).join('');
}

function renderProfiles(locale) {
  const zh = locale === 'zh';
  return data.items.map(item => {
    const title = zh ? `${item.zhName} · ${item.name}` : item.name;
    const settings = [item.acceptsColorCustomization?'color':'',item.includedInCharacterCreator?'creator':'',item.dropExclusive?'drop':''].filter(Boolean).join(' ');
    const facts = [
      [zh ? '来源表' : 'Source table', item.sourceName],
      [zh ? '源 ID' : 'Source ID', item.id],
      [zh ? '装备槽' : 'Body slot', item.bodySlot],
      [zh ? '颜色自定义标志' : 'Color customization flag', bool(item.acceptsColorCustomization, zh)],
      [zh ? '角色创建器收录标志' : 'Character-creator inclusion flag', bool(item.includedInCharacterCreator, zh)],
      [zh ? '掉落限定标志' : 'Drop-exclusive flag', bool(item.dropExclusive, zh)],
      [zh ? '性别限制配置' : 'Gender restriction setting', item.genderRestriction ? (zh ? (item.genderRestriction === 'female' ? '女性' : '男性') : item.genderRestriction) : (zh ? '未设置' : 'Not set')],
      [zh ? 'Demo 配置标志' : 'Demo configuration flag', bool(item.demoFlag, zh)],
    ];
    const variants = [item.femaleVariant && `${zh ? '女性变体' : 'Female variant'}: ${item.femaleVariant}`, item.maleVariant && `${zh ? '男性变体' : 'Male variant'}: ${item.maleVariant}`, item.switchToHair && `${zh ? '切换发型配置' : 'Hair-switch setting'}: ${item.switchToHair}`].filter(Boolean);
    return `<article class="customization-profile" id="${anchorFor(item)}" data-customization-entry data-search-entry data-search-title="${escapeHtml(title)}" data-search-aliases="${escapeHtml(`${item.id}|${item.name}|${item.zhName}|${item.sourceName}`)}" data-search-tags="${escapeHtml(`${item.categoryName} ${item.categoryZhName} ${item.bodySlot}`)}" data-search-status="${zh ? '构建内角色外观配置' : 'Build-defined customization setting'}" data-category="${item.category}" data-settings="${settings}" data-filter-text="${escapeHtml(`${item.name} ${item.zhName} ${item.id} ${item.sourceName} ${item.bodySlot}`.toLowerCase())}"><a class="database-back" href="#browse-entries">${zh ? '返回外观目录' : 'Back to customization directory'}</a><div class="customization-profile-heading"><h2>${escapeHtml(title)}</h2><code>${escapeHtml(item.id)}</code></div><dl class="customization-facts">${facts.map(([label,value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>${variants.length ? `<details class="database-reference-notes"><summary>${zh ? '变体与切换配置' : 'Variant & switch settings'}</summary><ul>${variants.map(value => `<li><code>${escapeHtml(value)}</code></li>`).join('')}</ul></details>` : ''}</article>`;
  }).join('\n');
}

function renderPage(locale) {
  const zh = locale === 'zh';
  const prefix = zh ? '/zh' : '';
  const canonical = `https://theranchersguide.com${prefix}/database/customization`;
  const title = zh ? 'The Ranchers 角色外观资料库' : 'The Ranchers Character Customization Database';
  const description = zh ? '按类别、名称和原生配置查找 269 条 The Ranchers 角色外观定义。' : 'Browse 269 The Ranchers character-customization definitions by category, name and source configuration.';
  const nav = zh
    ? `<header class="site-header"><nav class="nav-inner" aria-label="主导航"><a class="logo" href="/zh/"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide<small>非官方中文玩家指南</small></span></a><button class="nav-toggle" aria-expanded="false" aria-label="展开导航">☰</button><ul class="nav-links"><li><a href="/zh/guides/beginners-guide">新手</a></li><li><a class="active" href="/zh/database">知识库</a></li><li><a href="/zh/map">地图</a></li><li><a href="/zh/problems">问题</a></li><li><a href="/zh/search">搜索</a></li><li><a href="/contribute">投稿</a></li></ul></nav></header>`
    : `<header class="site-header"><nav class="nav-inner" aria-label="Main navigation"><a class="logo" href="/"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide<small>Unofficial fan resource</small></span></a><button class="nav-toggle" aria-expanded="false" aria-label="Toggle navigation">☰</button><ul class="nav-links"><li><a href="/guides/beginners-guide">Guides</a></li><li><a class="active" href="/database">Database</a></li><li><a href="/map">Map</a></li><li><a href="/problems">Problems</a></li><li><a href="/research">Research</a></li><li><a href="/search">Search</a></li><li><a href="/contribute">Contribute</a></li></ul></nav></header>`;
  return `<!DOCTYPE html>\n<!-- GENERATED by scripts/build-customization.cjs from data/build-customization.json — do not edit directly. -->\n<html lang="${zh ? 'zh-CN' : 'en'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="en" href="https://theranchersguide.com/database/customization"><link rel="alternate" hreflang="zh-CN" href="https://theranchersguide.com/zh/database/customization"><link rel="alternate" hreflang="x-default" href="https://theranchersguide.com/database/customization"><meta property="og:type" content="website"><meta property="og:site_name" content="The Ranchers Guide"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://theranchersguide.com/assets/img/guide-barn.webp"><link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css?v=20260821-ui1"><link rel="stylesheet" href="/assets/css/database-browser.css?v=20260830-8"></head><body class="database-surface">${nav}<main><article class="article database-page database-customization"><nav class="breadcrumb" aria-label="${zh ? '面包屑' : 'Breadcrumb'}"><a href="${prefix}/">${zh ? '首页' : 'Home'}</a> / <a href="${prefix}/database">${zh ? '知识库' : 'Database'}</a> / ${zh ? '角色外观' : 'Customization'}</nav><h1>${zh ? '角色外观资料库' : 'Character customization'}</h1>${renderTabs(locale, 'customization')}<section class="database-browser customization-browser" id="browse-entries" aria-labelledby="browse-entries-title"><div class="customization-browser-heading"><div><h2 id="browse-entries-title">${zh ? '按名称或类别查找' : 'Find by name or category'}</h2><p class="database-browse-note">${zh ? '每条记录均保留原始源 ID；同名外观不会合并。' : 'Every entry keeps its source ID, so same-name definitions stay distinct.'}</p></div><output data-customization-count aria-live="polite">269</output></div><div class="customization-controls"><label>${zh ? '搜索名称或源 ID' : 'Search name or source ID'}<input type="search" data-customization-search autocomplete="off"></label><label>${zh ? '类别 / 来源表' : 'Category / source table'}<select data-customization-category><option value="all">${zh ? '全部类别' : 'All categories'}</option>${data.categories.map(category => `<option value="${category.id}">${escapeHtml(zh ? category.zhName : category.name)} · ${category.count}</option>`).join('')}</select></label><label>${zh ? '原生配置' : 'Source setting'}<select data-customization-setting><option value="all">${zh ? '全部配置' : 'All settings'}</option><option value="color">${zh ? '允许颜色自定义' : 'Color customization enabled'}</option><option value="creator">${zh ? '角色创建器收录' : 'Character creator included'}</option><option value="drop">${zh ? '掉落限定标志' : 'Drop-exclusive flag'}</option></select></label></div><div data-customization-directory>${renderDirectory(locale)}</div><p class="customization-empty" data-customization-empty hidden>${zh ? '没有匹配记录。' : 'No matching definitions.'}</p></section><details class="database-reference-notes"><summary>${zh ? '版本与资料边界' : 'Version & evidence boundary'}</summary><p>${zh ? '站长从自有 Steam 构建 24847725（游戏基线 0.8.10.842）整理。269 个 I2 名称与 269 个空说明槽均逐字节核验。' : 'Editor-collected from owned Steam build 24847725 (game baseline 0.8.10.842). All 269 I2 names and 269 empty description slots were byte-checked.'}</p><p>${zh ? '这些字段只证明文件内配置，不证明当前衣柜可用、商店库存、价格、获取方式、掉率、性别限制实际效果或运行时外观。' : 'These fields prove serialized configuration only—not current wardrobe availability, shop stock, prices, acquisition, drop rates, gender behavior or runtime appearance.'}</p></details><section class="customization-results" aria-label="${zh ? '外观条目详情' : 'Customization details'}">${renderProfiles(locale)}</section></article></main><footer class="site-footer"><div class="container"><div class="footer-bottom"><span>&copy; <span data-year></span> The Ranchers Guide</span><span>${zh ? '非官方玩家资料' : 'Unofficial fan reference'}</span></div></div></footer><script src="/assets/js/main.js?v=20260810-nav1" defer></script><script src="/assets/js/customization-filter.js?v=20260830-1" defer></script></body></html>\n`;
}

let failed = false;
for (const locale of ['en', 'zh']) {
  const file = path.join(root, locale === 'zh' ? 'zh/database/customization.html' : 'database/customization.html');
  const output = renderPage(locale);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output) {
      console.error(`FAIL: ${file} is out of sync`);
      failed = true;
    }
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, output, 'utf8');
  }
}
if (failed) process.exit(1);
console.log('PASS: bilingual customization database is synchronized.');
