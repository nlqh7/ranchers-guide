const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const entryData = JSON.parse(fs.readFileSync(path.join(root, 'data/building-entries.json'), 'utf8'));
const files = [
  'database/buildings.html', 'database/buildings/coop.html',
  'zh/database/buildings.html', 'zh/database/buildings/coop.html',
];
let failed = false;
for (const relative of files) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) { console.error(`FAIL: missing ${relative}`); failed = true; continue; }
  const html = fs.readFileSync(file, 'utf8');
  const prefix = relative.startsWith('zh/') ? 'zh/' : '';
  const required = relative.endsWith('buildings.html')
    ? [`${prefix}database/buildings/coop`]
    : [`${prefix}tools/ranch-checklist?building=building-store-allthetime-Custum_Barn_Weak_Small&amp;return=%2F${prefix ? 'zh%2F' : ''}database%2Fbuildings%2Fcoop#recipe-material-plan`, `${prefix}database/materials#stone`, `${prefix}database/materials#wood-log`, `${prefix}database/materials#hay`];
  for (const fragment of required) {
    if (!html.includes(fragment)) { console.error(`FAIL: ${relative} missing ${fragment}`); failed = true; }
  }
  for (const route of ['/research', '/contribute']) {
    if (!html.includes(`href="${route}`)) { console.error(`FAIL: ${relative} missing shared route ${route}`); failed = true; }
  }
  if (!entryData.liveBuild || entryData.liveBuild === entryData.build) {
    console.error('FAIL: building data must separate the recorded local build from the live official patch');
    failed = true;
  }
  const searchableHtml = html.toLowerCase();
  const versionBoundary = relative.startsWith('zh/')
    ? [`已记录的本地数据版本 ${entryData.build}`, `官方最新补丁 ${entryData.liveBuild}`]
    : [`recorded local data build ${entryData.build}`, `official live patch ${entryData.liveBuild}`];
  if (!versionBoundary.every(fragment => searchableHtml.includes(fragment.toLowerCase()))) {
    console.error(`FAIL: ${relative} missing explicit recorded/live build boundary`);
    failed = true;
  }
  if (html.includes('Current-build Coop material conditions') || html.includes('A current-build reference') || html.includes('当前构建鸡舍材料条件') || html.includes('当前构建建筑商店鸡舍商品')) {
    console.error(`FAIL: ${relative} presents the recorded .842 data as the current build`);
    failed = true;
  }
  if (relative.startsWith('zh/') && (html.includes('href="/zh/research') || html.includes('href="/zh/contribute'))) {
    console.error(`FAIL: ${relative} contains an unserved localized research/contribute route`);
    failed = true;
  }
  if (!html.includes('data-search-entry') || !html.includes('hreflang="zh-CN"')) { console.error(`FAIL: ${relative} missing search or hreflang contract`); failed = true; }
  if (relative.endsWith('/buildings/coop.html')) {
    const tableCss = fs.readFileSync(path.join(root, 'assets/css/database-browser.css'), 'utf8');
    const tableSelector = '.database-page .building-material-conditions .data-table';
    if (!html.includes('class="data-table-wrap building-material-conditions"')) {
      console.error(`FAIL: ${relative} missing the scoped material-condition table wrapper`);
      failed = true;
    }
    if (!tableCss.includes(tableSelector) || !/table-layout:\s*fixed/.test(tableCss) || !/white-space:\s*normal/.test(tableCss) || !/overflow-wrap:\s*anywhere/.test(tableCss)) {
      console.error(`FAIL: ${relative} material-condition table cells must wrap long source notes`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log('PASS: bilingual building routes contain directory, material and planner links.');
