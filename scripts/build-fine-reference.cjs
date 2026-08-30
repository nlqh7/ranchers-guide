const fs = require('node:fs');
const path = require('node:path');
const data = require('../data/build-fines.json');
const policeDrone = require('../data/build-police-drone.json');

const root = path.resolve(__dirname, '..');
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const groups = {
  'services-custody': ['Custody and services', '拘留与服务'],
  'property-resources': ['Property and resources', '财产与资源'],
  'animals-civilians': ['Animals and civilians', '动物与平民'],
  vehicles: ['Vehicles', '车辆'],
};

function render(locale) {
  const zh = locale === 'zh';
  const drone = policeDrone.items[0];
  const rows = Object.entries(groups).map(([id, labels]) => {
    const items = data.items.filter(item => item.category === id).map(item => {
      const title = zh ? item.zhName : item.name;
      const tags = `${item.name} ${item.zhName} fine service offence police 罚款 违法 警察`;
      return `<tr id="fine-${item.id}" data-search-entry data-search-title="${esc(title)}" data-search-tags="${esc(tags)}" data-search-status="${zh ? '构建资料（未实测）' : 'Build data (not gameplay-tested)'}"><th scope="row"><a href="#fine-${item.id}">${esc(title)}</a></th><td>${labels[zh ? 1 : 0]}</td></tr>`;
    }).join('\n');
    return `<h3>${labels[zh ? 1 : 0]}</h3><div class="data-table-wrap" role="region" aria-label="${labels[zh ? 1 : 0]}" tabindex="0"><table><thead><tr><th>${zh ? '项目名称' : 'Entry name'}</th><th>${zh ? '整理分组' : 'Editorial group'}</th></tr></thead><tbody>${items}</tbody></table></div>`;
  }).join('\n');
  return `<!-- BEGIN FINE REFERENCE -->
<section id="build-fine-index" data-fine-reference>
  <h2>${zh ? '当前构建里有哪些罚款与服务名称？' : 'Which fine and service names exist in this build?'}</h2>
  <p>${zh ? '下面是站长从 build 0.8.10.842 整理的 20 个双语名称。它适合核对界面文字，不等于每一项当前都能触发。' : 'This editor-collected index lists 20 bilingual names from build 0.8.10.842. Use it to identify UI wording, not as proof that every entry currently triggers.'}</p>
  <aside data-police-drone-reference id="police-drone-${esc(drone.id)}" class="notice info" data-search-entry data-search-title="${esc(zh ? drone.zhName : drone.name)}" data-search-tags="${esc(`${drone.name} ${drone.zhName} police drone 警察 无人机 追捕`)}" data-search-status="${zh ? '构建资料（未实测）' : 'Build data (not gameplay-tested)'}"><strong>${zh ? '构建内名称：' : 'Build-defined name: '}${esc(zh ? drone.zhName : drone.name)}</strong><p>${zh ? '该名称与空 I2 说明栏来自自购 build 24847725。源表名、Enemies 类型与四个物品标志不证明出现条件、攻击行为、危险度、掉落或警星变化，也不证明当前实际生成。' : 'The name and empty I2 description slot come from owned build 24847725. The source table, Enemies type and four item flags do not establish appearance conditions, attacks, danger, drops or wanted-level changes, nor current runtime spawning.'}</p><a href="${zh ? '/zh' : ''}/guides/gigi-large-egg-quest#police">${zh ? '查看 Gigi 任务中的玩家追捕路线' : 'Open the player-reported chase route in the Gigi quest'} →</a></aside>
  <details class="faq-item"><summary>${zh ? '查看 20 个构建定义' : 'Show 20 build definitions'}</summary><div class="faq-body">${rows}<p><strong>${zh ? '资料边界：' : 'Data boundary:'}</strong> ${zh ? '不公开内部金额；名称和表成员关系不证明当前触发条件、处罚流程、收费金额或警星变化。' : 'Internal amounts are not published. Names and table membership do not establish current triggers, penalty flow, charges or wanted-level changes.'}</p></div></details>
</section>
<!-- END FINE REFERENCE -->`.replace(/[ \t]+$/gm, '');
}

let stale = false;
for (const locale of ['en', 'zh']) {
  const file = path.join(root, locale === 'zh' ? 'zh' : '', 'guides/police-wanted-levels.html');
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes('<!-- BEGIN FINE REFERENCE -->')) throw new Error(`Missing fine reference block: ${file}`);
  const after = before.replace(/<!-- BEGIN FINE REFERENCE -->[\s\S]*?<!-- END FINE REFERENCE -->/, render(locale));
  if (before !== after) {
    if (process.argv.includes('--check')) { console.error(`STALE: ${file}`); stale = true; }
    else fs.writeFileSync(file, after);
  }
}
if (stale) process.exitCode = 1;
else console.log('PASS: bilingual fine/service index is synchronized.');
