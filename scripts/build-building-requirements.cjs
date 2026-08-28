const fs = require('node:fs');
const path = require('node:path');
const data = require('../data/building-checklists.json');
const icons = require('../data/item-icons.json').icons;
const root = path.resolve(__dirname, '..');
const start = '<!-- BEGIN BUILDING REQUIREMENTS -->';
const end = '<!-- END BUILDING REQUIREMENTS -->';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

function render(locale) {
  const zh = locale === 'zh';
  const rows = data.targets.map(target => {
    const name = zh ? target.zhName.replace(/\s+[A-Za-z].*$/, '') : target.name;
    const ingredients = target.materials.map(material => {
      // Alpha records use Wood / Rock, not the later Wood Log / Stone labels.
      const oldName = target.build === 'alpha-2023' && {'wood-log': ['Wood', '木材'], stone: ['Rock', '岩石']}[material.id];
      const label = oldName ? oldName[zh ? 1 : 0] : (zh ? material.zhName.replace(/\s+[A-Za-z].*$/, '') : material.name);
      const icon = !oldName && icons.find(icon => icon.kind === 'materials' && icon.id === material.id);
      return `<li data-ingredient="${esc(material.id)}" data-quantity="${material.required}"><a href="${esc(zh ? material.routeZh : material.route)}">${icon ? `<img src="${icon.src}" alt="" width="28" height="28" decoding="async">` : ''}<span>${esc(label)}</span><strong>× ${material.required}</strong></a></li>`;
    }).join('');
    return `<tr id="building-${esc(target.id)}"><th scope="row">${esc(name)}${zh ? `<small lang="en">${esc(target.name)}</small>` : ''}</th><td><ul class="building-ingredients">${ingredients}</ul></td></tr>`;
  });
  const sources = Object.values(data.sources).map(source => `<li>${source.url ? `<a href="${esc(source.url)}" rel="noopener noreferrer">${esc(source.title)}</a>` : esc(source.title)} · ${esc(source.build)}</li>`).join('');
  const timeline = zh
    ? `当前资料基线：${esc(data.meta.currentBuild)}；首发视频来自 0.8.10.455，不代表现版本配方。`
    : `Current official version: ${esc(data.meta.currentBuild)}. Footage: July 30, 2026 Early Access build (launch/video baseline <strong>0.8.10.455</strong>); it does not establish current recipes.`;
  return `${start}
<div class="building-requirements" data-building-requirements>
  <div class="building-table-wrap" role="region" aria-label="${zh ? '建筑材料需求表' : 'Building material requirements'}" tabindex="0">
    <table class="building-requirements-table">
      <caption>${zh ? '旧版本材料记录，当前配方待复核。每行仅列该条目记录，不代表累计升级费用。' : 'Historical requirements; current recipes need rechecking. Each row is one recorded recipe, not a cumulative upgrade cost.'}</caption>
      <thead><tr><th scope="col">${zh ? '建筑' : 'Building'}</th><th scope="col">${zh ? '所需材料' : 'Materials needed'}</th></tr></thead>
      <tbody><tr class="building-source-group"><th colspan="2" scope="rowgroup">${zh ? '首发视频记录' : 'Launch footage'} · 0.8.10.455</th></tr>${rows.filter((_, i) => data.targets[i].build !== 'alpha-2023').join('\n')}</tbody>
      <tbody><tr class="building-source-group"><th colspan="2" scope="rowgroup">${zh ? '官方 Wiki 历史记录' : 'Historical Official Wiki'} · Alpha</th></tr>${rows.filter((_, i) => data.targets[i].build === 'alpha-2023').join('\n')}</tbody>
    </table>
  </div>
  <details class="building-sources"><summary>${zh ? '配方来源与旧名称' : 'Recipe sources and older names'}</summary><p>${timeline}</p><p>${zh ? 'Alpha 原文使用 Wood / Rock，表中保留旧名称；材料链接指向现有条目，不证明旧配方仍然适用。' : 'Alpha entries use Wood / Rock. These original names are retained; links to present material entries do not establish current recipe validity.'}</p><ul>${sources}</ul></details>
</div>
${end}`;
}

let stale = false;
for (const locale of ['en', 'zh']) {
  for (const route of ['guides/building-construction.html', 'tools/ranch-checklist.html']) {
    const file = path.join(root, locale === 'zh' ? 'zh' : '', route);
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes(start) || !html.includes(end)) throw new Error(`Missing generated block: ${file}`);
    const next = html.replace(/<!-- BEGIN BUILDING REQUIREMENTS -->[\s\S]*?<!-- END BUILDING REQUIREMENTS -->/, render(locale));
    if (next !== html) {
      if (process.argv.includes('--check')) { console.error(`STALE: ${file}`); stale = true; }
      else fs.writeFileSync(file, next);
    }
  }
}
if (stale) process.exitCode = 1;
else console.log('PASS: bilingual building requirement tables match the source data.');
