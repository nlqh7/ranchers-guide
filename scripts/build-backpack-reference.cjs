const fs = require('node:fs');
const path = require('node:path');
const data = require('../data/build-backpacks.json');

const root = path.resolve(__dirname, '..');
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));

function render(locale) {
  const zh = locale === 'zh';
  const rows = data.items.map(item => {
    const title = zh ? `${item.zhName} · 容量配置 ${item.storageCapacity}` : `${item.name} · Capacity setting ${item.storageCapacity}`;
    return `<li id="backpack-${esc(item.id)}" data-search-entry data-search-title="${esc(title)}" data-search-tags="${esc(`${item.name} ${item.zhName} ${item.id} backpack storage capacity 背包 容量 收纳`)}" data-search-status="${zh ? '构建配置（未实测）' : 'Build configuration (not gameplay-tested)'}"><strong><a href="#backpack-${esc(item.id)}">${esc(title)}</a></strong><br><span class="recipe-muted">${zh ? '源记录' : 'Source record'}: ${esc(item.id)} · ${zh ? '可装备' : 'Equippable'}: ${zh ? '是' : 'Yes'} · ${zh ? '支持颜色自定义标志' : 'Color-customization flag'}: ${zh ? '是' : 'Yes'}</span></li>`;
  }).join('');
  return `<!-- BEGIN BACKPACK REFERENCE -->
<details class="database-reference-notes" data-backpack-reference><summary>${zh ? '背包容量构建配置' : 'Backpack capacity settings from the build'}</summary><p>${zh ? '站长从自购 build 24847725 核对了 4 个双语背包名称和空 I2 说明栏。两条“中号背包”使用不同源 ID 与容量配置，因此分开显示。' : 'Four bilingual backpack names and empty I2 description slots were checked against owned build 24847725. The two medium records have different source IDs and capacity settings, so they remain separate.'}</p><ul class="evidence-list">${rows}</ul><p class="recipe-muted"><code>storageCapacity</code> ${zh ? '仅是序列化配置。Demo、Legend、颜色自定义与装备标志不证明当前可获得、实际可用槽位、扩容效果、价格、商店或任务解锁。' : 'is serialized configuration only. Demo, Legend, color-customization and equip flags do not establish current availability, usable slots, expansion effects, price, shop or quest unlocks.'}</p><p class="recipe-muted">${zh ? '非官方站长整理；原始游戏文件不提供下载。' : 'Unofficial editor-collected reference; raw game files are not distributed.'} ${esc(data.build)} · Steam ${esc(data.steamBuild)}.</p></details>
<!-- END BACKPACK REFERENCE -->`.replace(/[ \t]+$/gm, '');
}

let stale = false;
for (const locale of ['en', 'zh']) {
  const file = path.join(root, locale === 'zh' ? 'zh' : '', 'guides/beginners-guide.html');
  const before = fs.readFileSync(file, 'utf8');
  const withoutBlock = before.replace(/\s*<!-- BEGIN BACKPACK REFERENCE -->[\s\S]*?<!-- END BACKPACK REFERENCE -->\s*/g, '\n');
  const anchor = locale === 'zh' ? '<section id="systems"' : '<h2 id="expand"';
  if (!withoutBlock.includes(anchor)) throw new Error(`Missing backpack insertion anchor: ${file}`);
  const after = withoutBlock.replace(anchor, `${locale === 'zh' ? '    ' : '      '}${render(locale).replace(/\n/g, `\n${locale === 'zh' ? '    ' : '      '}`)}\n\n${anchor}`);
  if (before !== after) {
    if (process.argv.includes('--check')) { console.error(`STALE: ${file}`); stale = true; }
    else fs.writeFileSync(file, after);
  }
}
if (stale) process.exitCode = 1;
else console.log('PASS: bilingual backpack capacity reference is synchronized.');
