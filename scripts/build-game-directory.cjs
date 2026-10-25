/* Game capabilities belong in data/game-catalog.json, not copied page lists. */
const fs = require('node:fs');
const path = require('node:path');
const { renderSiteFooter } = require('./render-site-footer.cjs');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/game-catalog.json'), 'utf8'));
const check = process.argv.includes('--check');
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const localized = (item, key, zh) => item[zh ? 'zh' + key[0].toUpperCase() + key.slice(1) : key];
const prefix = zh => zh ? '/zh' : '';
function output(file, html) {
  const target = path.join(root, file);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== html.replace(/\r\n/g, '\n')) {
      console.error(`FAIL: ${file} is out of sync. Run node scripts/build-game-directory.cjs`);
      process.exitCode = 1;
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
    console.log(`Wrote ${file}`);
  }
}
function searchForm(zh, scope = 'all') {
  return `<form class="portal-search" action="${prefix(zh)}/search" method="get" role="search"><label for="portal-query">${zh ? '搜索攻略与工具' : 'Search guides and tools'}</label><div class="portal-search-controls"><label class="portal-scope"><span>${zh ? '游戏' : 'Game'}</span><select name="game" aria-label="${zh ? '选择游戏搜索范围' : 'Choose a game to search'}"><option value="all"${scope === 'all' ? ' selected' : ''}>${zh ? '所有游戏' : 'All games'}</option>${catalog.games.map(game => `<option value="${esc(game.searchScope)}"${scope === game.searchScope ? ' selected' : ''}>${esc(localized(game, 'name', zh))}</option>`).join('')}</select></label><input id="portal-query" name="q" type="search" placeholder="${scope === 'ranchers' ? (zh ? '例如：建筑材料、鸡不下蛋' : 'Try building materials or chicken care') : (zh ? '例如：建筑材料、面粉缺口' : 'Try building materials or flour shortage')}"><button class="btn" type="submit">${zh ? '搜索' : 'Search'}</button></div></form>`;
}
function taskCards(game, zh) {
  return game.tasks.map(task => `<article class="portal-task" data-game="${esc(game.searchScope)}"><p class="portal-game-label">${esc(localized(game, 'name', zh))}</p><h3><a href="${esc(localized(task, 'route', zh))}">${esc(localized(task, 'label', zh))}<span aria-hidden="true"> →</span></a></h3><p>${esc(localized(task, 'summary', zh))}</p></article>`).join('\n');
}
function gameCards(zh) {
  return `<div class="portal-game-grid">${catalog.games.map(game => `<article class="portal-game-card"><div class="portal-game-heading"><p class="kicker">${zh ? '游戏专区' : 'Game hub'}</p><h3${game.id === 'fs25' ? ' id="fs25-tools-title"' : ''}><a href="${esc(localized(game, 'hubRoute', zh))}">${esc(localized(game, 'name', zh))}</a></h3><p>${esc(localized(game, 'summary', zh))}</p></div><ul class="portal-task-links">${game.tasks.map(task => `<li><a href="${esc(localized(task, 'route', zh))}">${esc(localized(task, 'label', zh))}<span aria-hidden="true"> →</span></a></li>`).join('')}</ul><a class="portal-hub-link" href="${esc(localized(game, 'hubRoute', zh))}">${zh ? '进入专区' : 'Explore this game'}<span aria-hidden="true"> →</span></a></article>`).join('\n')}</div>`;
}
function page(zh, game) {
  const base = prefix(zh);
  const route = game ? localized(game, 'hubRoute', zh) : `${base}/games/`;
  const en = game ? game.hubRoute : '/games/';
  const cn = game ? game.zhHubRoute : '/zh/games/';
  const title = game ? (zh ? 'The Ranchers 工具与攻略' : 'The Ranchers Tools & Guides') : (zh ? '农场游戏工具与攻略目录' : 'Farming Game Directory — Tools & Guides');
  const summary = game ? localized(game, 'summary', zh) : (zh ? '选择 The Ranchers 或模拟农场 25，查找建筑备料、动物排查、任务追踪和生产规划工具。' : 'Choose The Ranchers or Farming Simulator 25 for building materials, chicken care, quest tracking and production planning.');
  const body = game
    ? `<section class="portal-section"><h2>${zh ? '你想完成什么？' : 'What do you need to do?'}</h2><div class="portal-task-grid">${taskCards(game, zh)}</div></section><section class="portal-section portal-reference"><h2>${zh ? '查资料与走流程' : 'Look up a fact or follow a guide'}</h2><div class="portal-reference-links">${[[`${base}/guides/beginners-guide`, zh ? '新手路线' : 'Beginner route'],[`${base}/database`,zh ? '物品与建筑资料' : 'Items and buildings'],[`${base}/map`,zh ? '地点地图' : 'Location map'],[`${base}/problems`,zh ? '问题排查' : 'Problem center']].map(([url,label]) => `<a href="${url}">${label} →</a>`).join('')}</div></section>`
    : `<h2>${zh ? '选择你的游戏' : 'Choose your game'}</h2>${gameCards(zh)}<section class="portal-section" id="tools"><div class="portal-section-head"><div><p class="kicker">${zh ? '按用途直达' : 'Choose a task'}</p><h2>${zh ? '找到你现在要用的工具' : 'Get straight to a useful tool'}</h2></div></div><div class="portal-task-grid">${catalog.games.map(item => taskCards(item, zh)).join('\n')}</div><p class="portal-boundary">${zh ? 'FS25 生产规划使用工具内注明的社区参考值，可按你的设施修改；这里不提供跨游戏收益排名。' : 'FS25 planning uses the community references identified in the tool and editable facility assumptions. This is not a cross-game profit ranking.'}</p></section>`;
  return `<!DOCTYPE html>
<!-- GENERATED by scripts/build-game-directory.cjs -->
<html lang="${zh ? 'zh-CN' : 'en'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} | The Ranchers Guide</title><meta name="description" content="${esc(summary)}"><link rel="canonical" href="https://theranchersguide.com${route}"><link rel="alternate" hreflang="en" href="https://theranchersguide.com${en}"><link rel="alternate" hreflang="zh-CN" href="https://theranchersguide.com${cn}"><link rel="alternate" hreflang="x-default" href="https://theranchersguide.com${en}"><link rel="icon" href="/assets/img/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css?v=20261003-r15"><link rel="stylesheet" href="/assets/css/game-directory.css?v=20261025-home1"></head>
<body class="portal-page"><a class="portal-skip" href="#main">${zh ? '跳到内容' : 'Skip to content'}</a><header class="site-header"><nav class="nav-inner" aria-label="${zh ? '主导航' : 'Main navigation'}"><a class="logo" href="${base}/"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide</span></a><button class="nav-toggle" aria-expanded="false" aria-label="${zh ? '展开导航' : 'Open navigation'}">☰</button><ul class="nav-links"><li><a href="${base}/games/">${zh ? '游戏' : 'Games'}</a></li><li><a href="${base}/games/#tools">${zh ? '工具' : 'Tools'}</a></li><li><a href="${base}/search?game=${game ? game.searchScope : 'all'}">${zh ? '搜索' : 'Search'}</a></li></ul></nav></header>
<main class="container portal-main" id="main"><nav class="portal-breadcrumb" aria-label="${zh ? '面包屑导航' : 'Breadcrumb'}"><a href="${base}/">${zh ? '首页' : 'Home'}</a> / ${game ? `<a href="${base}/games/">${zh ? '游戏' : 'Games'}</a> / The Ranchers` : (zh ? '游戏' : 'Games')}</nav><div class="portal-intro"><p class="kicker">${zh ? '农场与经营游戏 · 工具优先' : 'Farming games · tools first'}</p><h1>${esc(game ? localized(game, 'name', zh) : (zh ? '游戏与工具' : 'Games & tools'))}</h1><p class="lead">${esc(summary)}</p></div>${game ? body + searchForm(zh, game.searchScope) : searchForm(zh) + body}</main>
${renderSiteFooter(zh ? 'zh' : 'en', {portal:true})}<script src="/assets/js/main.js?v=20261003-r15" defer></script></body></html>\n`;
}

const ids = new Set();
for (const game of catalog.games) {
  if (ids.has(game.id) || !game.tasks?.length || !['ranchers', 'fs25'].includes(game.searchScope)) throw new Error('Invalid or empty supported game');
  ids.add(game.id);
}
for (const zh of [false, true]) {
  const locale = zh ? 'zh/' : '';
  output(`${locale}games/index.html`, page(zh));
  const ranchers = catalog.games.find(game => game.id === 'the-ranchers');
  output(`${locale}games/the-ranchers/index.html`, page(zh, ranchers));
  const homeFile = `${locale}index.html`;
  const home = fs.readFileSync(path.join(root, homeFile), 'utf8');
  const markers = /<!-- GAME-DIRECTORY:START -->[\s\S]*?<!-- GAME-DIRECTORY:END -->/;
  output(homeFile, home.replace(markers, '').replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, renderSiteFooter(zh ? 'zh' : 'en', {portal:true})));
  const searchFile = `${locale}search.html`;
  const search = fs.readFileSync(path.join(root, searchFile), 'utf8');
  output(searchFile, search.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, renderSiteFooter(zh ? 'zh' : 'en', {portal:true})));
}
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const sitemapMarkers = /<!-- GAME-DIRECTORY:START -->[\s\S]*?<!-- GAME-DIRECTORY:END -->/;
if (!sitemapMarkers.test(sitemap)) throw new Error('Sitemap needs game directory markers');
const entries = ['/games/', '/games/the-ranchers/'].flatMap(route => [false, true].map(zh => {
  const current = `${prefix(zh)}${route}`;
  return `<url><loc>https://theranchersguide.com${current}</loc><xhtml:link rel="alternate" hreflang="en" href="https://theranchersguide.com${route}" /><xhtml:link rel="alternate" hreflang="zh-CN" href="https://theranchersguide.com/zh${route}" /><lastmod>2026-10-24</lastmod></url>`;
})).join('\n');
output('sitemap.xml', sitemap.replace(sitemapMarkers, `<!-- GAME-DIRECTORY:START -->\n${entries}\n<!-- GAME-DIRECTORY:END -->`));
if (check && !process.exitCode) console.log('PASS: game directory generated pages are in sync.');
