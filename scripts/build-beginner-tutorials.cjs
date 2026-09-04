const fs = require('node:fs');
const path = require('node:path');
const data = require('../data/build-tutorials.json');
const smartphoneApps = require('../data/build-smartphone-apps.json');

const root = path.resolve(__dirname, '..');
const sleepFamily = data.families.find(entry => entry.id === 'sleep-save-fainting');
const cashinFamily = data.families.find(entry => entry.id === 'cashin-selling');
const hoeFamily = data.families.find(entry => entry.id === 'hoe-planting');
const blueprintFamily = data.families.find(entry => entry.id === 'blueprint-building');
const pursuitFamily = data.families.find(entry => entry.id === 'police-pursuit');
const phoneFamily = data.families.find(entry => entry.id === 'smartphone-apps');
const vehicleOperationFamily = data.families.find(entry => entry.id === 'vehicle-operation');
const esc = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

function renderSleep(zh) {
  const copy = sleepFamily.content[zh ? 'zh' : 'en'];
  const tags = zh
    ? '怎么保存游戏 睡觉 保存点 帐篷 床 汽车旅馆 房车 凌晨3点 晕倒 死亡 医院 复活 体力 生命'
    : 'how to save game sleep save point tent bed motel motorhome 3am faint death hospital respawn energy health';
  return `<!-- BEGIN SLEEP TUTORIAL REFERENCE -->
<section class="answer-box tutorial-reference" id="saving-sleep-fainting" aria-labelledby="saving-sleep-fainting-title" data-search-entry data-search-title="${esc(copy.title)}" data-search-tags="${esc(tags)}" data-search-status="${zh ? '游戏构建提示' : 'Game-build guidance'}">
  <h2 id="saving-sleep-fainting-title">${esc(copy.title)}</h2>
  <p><strong>${zh ? '直接答案：' : 'Short answer: '}</strong>${esc(copy.summary)}</p>
  <ol>
    ${copy.steps.map(step => `<li><strong>${esc(step.label)}${zh ? '：' : ':'}</strong> ${esc(step.text)}</li>`).join('\n    ')}
  </ol>
  <p class="recipe-boundary"><span class="evidence-badge evidence-build">${zh ? '游戏文件' : 'Game files'}</span> ${esc(copy.boundary)} ${zh ? `核对版本 ${data.build}。` : `Checked against ${data.build}.`}</p>
</section>
<!-- END SLEEP TUTORIAL REFERENCE -->`;
}

function renderCashin(zh) {
  const copy = cashinFamily.content[zh ? 'zh' : 'en'];
  const prefix = zh ? '/zh' : '';
  const tags = zh
    ? 'CashIn 现金兑换箱 怎么卖作物 出售物品 拖动 移动 拿1个 单个 整堆 第二天打款 品质 价格'
    : 'CashIn how to sell crops items drag move take 1 single item full stack next day payout quality price';
  return `<!-- BEGIN CASHIN TUTORIAL REFERENCE -->
<section class="answer-box tutorial-reference" id="cashin" aria-labelledby="cashin-title" data-search-entry data-search-title="${esc(copy.title)}" data-search-tags="${esc(tags)}" data-search-status="${zh ? '游戏构建提示' : 'Game-build guidance'}">
  <h2 id="cashin-title">${esc(copy.title)}</h2>
  <p><strong>${zh ? '直接答案：' : 'Short answer: '}</strong>${esc(copy.summary)}</p>
  <ol>
    ${copy.steps.map(step => `<li><strong>${esc(step.label)}${zh ? '：' : ':'}</strong> ${esc(step.text)}</li>`).join('\n    ')}
  </ol>
  <p>${zh ? '旧版结算画面只把最终作物收入显示为合并的 Farming 总额，不能据此反推单种作物售价。' : 'An older settlement-screen observation showed the eventual crop payout as one combined Farming total, so it cannot establish a per-crop sell price.'}</p>
  <p class="source-note">${zh ? '位置：' : 'Location: '}<a href="${prefix}/map#cash-in-box">${zh ? '在地图中查看 Cash-In 箱子' : 'Open the Cash-In box on the map'}</a>${zh ? '。' : '.'}</p>
  <p class="recipe-boundary"><span class="evidence-badge evidence-build">${zh ? '游戏文件' : 'Game files'}</span> ${esc(copy.boundary)} ${zh ? `核对版本 ${data.build}。` : `Checked against ${data.build}.`}</p>
</section>
<!-- END CASHIN TUTORIAL REFERENCE -->`;
}

function renderHoe(zh) {
  const copy = hoeFamily.content[zh ? 'zh' : 'en'];
  const tags = zh
    ? '怎么开田 第一块种植地 锄头 翻地 松土 红色 白色 障碍 自己的土地 播种 使用键 洒水壶 每天浇水 除草 小鸟 季节'
    : 'how to start first plantation hoe till soil red white obstacle owned land plant seed use button watering can water every day weeds birds season';
  return `<!-- BEGIN HOE TUTORIAL REFERENCE -->
<section class="answer-box tutorial-reference" id="start-farming" aria-labelledby="start-farming-title" data-search-entry data-search-title="${esc(copy.title)}" data-search-tags="${esc(tags)}" data-search-status="${zh ? '游戏构建提示' : 'Game-build guidance'}">
  <h2 id="start-farming-title">${esc(copy.title)}</h2>
  <p><strong>${zh ? '直接答案：' : 'Short answer: '}</strong>${esc(copy.summary)}</p>
  <ol>
    ${copy.steps.map(step => `<li><strong>${esc(step.label)}${zh ? '：' : ':'}</strong> ${esc(step.text)}</li>`).join('\n    ')}
  </ol>
  <p class="recipe-boundary"><span class="evidence-badge evidence-build">${zh ? '游戏文件' : 'Game files'}</span> ${esc(copy.boundary)} ${zh ? `核对版本 ${data.build}。` : `Checked against ${data.build}.`}</p>
</section>
<!-- END HOE TUTORIAL REFERENCE -->`;
}

function renderBlueprint(zh) {
  const copy = blueprintFamily.content[zh ? 'zh' : 'en'];
  const tags = zh
    ? '蓝图怎么建造 放置蓝图 移动 旋转 确认 锤子 对准 手柄 长按选择 反复建造 编辑 拆除 体力 建造步骤 锤子质量'
    : 'how to build blueprint place move rotate confirm hammer aim controller hold selection repeat build edit demolish energy build steps hammer quality';
  return `<!-- BEGIN BLUEPRINT TUTORIAL REFERENCE -->
<section class="answer-box tutorial-reference" id="blueprint-building" aria-labelledby="blueprint-building-title" data-search-entry data-search-title="${esc(copy.title)}" data-search-tags="${esc(tags)}" data-search-status="${zh ? '游戏构建提示' : 'Game-build guidance'}">
  <h2 id="blueprint-building-title">${esc(copy.title)}</h2>
  <p><strong>${zh ? '直接答案：' : 'Short answer: '}</strong>${esc(copy.summary)}</p>
  <ol>
    ${copy.steps.map(step => `<li><strong>${esc(step.label)}${zh ? '：' : ':'}</strong> ${esc(step.text)}</li>`).join('\n    ')}
  </ol>
  <p class="recipe-boundary"><span class="evidence-badge evidence-build">${zh ? '游戏文件' : 'Game files'}</span> ${esc(copy.boundary)} ${zh ? `核对版本 ${data.build}。` : `Checked against ${data.build}.`}</p>
</section>
<!-- END BLUEPRINT TUTORIAL REFERENCE -->`;
}

function renderPolicePursuit(zh) {
  const copy = pursuitFamily.content[zh ? 'zh' : 'en'];
  const tags = zh
    ? '警方追捕 怎么触发 偷车 农场动物 攻击 杀死角色 HUD 通缉等级 一星 1星 交罚款 自首 逃跑 拘留 警车 无人机'
    : 'police pursuit how starts trigger steal vehicle farm animal kill character HUD wanted level one star 1 star pay fine surrender escape custody police car drone';
  return `<!-- BEGIN POLICE PURSUIT TUTORIAL REFERENCE -->
<section class="answer-box tutorial-reference" id="police-pursuit-current-build" aria-labelledby="police-pursuit-current-build-title" data-search-entry data-search-title="${esc(copy.title)}" data-search-tags="${esc(tags)}" data-search-status="${zh ? '游戏构建提示' : 'Game-build guidance'}">
  <h2 id="police-pursuit-current-build-title">${esc(copy.title)}</h2>
  <p><strong>${zh ? '直接答案：' : 'Short answer: '}</strong>${esc(copy.summary)}</p>
  <ol>
    ${copy.steps.map(step => `<li><strong>${esc(step.label)}${zh ? '：' : ':'}</strong> ${esc(step.text)}</li>`).join('\n    ')}
  </ol>
  <p class="recipe-boundary"><span class="evidence-badge evidence-build">${zh ? '游戏文件' : 'Game files'}</span> ${esc(copy.boundary)} ${zh ? `核对版本 ${data.build}。` : `Checked against ${data.build}.`}</p>
</section>
<!-- END POLICE PURSUIT TUTORIAL REFERENCE -->`;
}

function renderSmartphone(zh) {
  const copy = phoneFamily.content[zh ? 'zh' : 'en'];
  const groupOrder = ['communication', 'navigation-planning', 'ranch-tools', 'system-controls'];
  const groupNames = zh
    ? { communication: '消息', 'navigation-planning': '导航与计划', 'ranch-tools': '牧场工具', 'system-controls': '系统操作' }
    : { communication: 'Messages', 'navigation-planning': 'Navigation & planning', 'ranch-tools': 'Ranch tools', 'system-controls': 'System controls' };
  const groups = groupOrder.map(group => {
    const apps = smartphoneApps.confirmedApps.filter(app => app.group === group);
    return `<section class="smartphone-app-group" aria-labelledby="smartphone-app-${group}">
      <h3 id="smartphone-app-${group}">${esc(groupNames[group])}</h3>
      <div class="smartphone-app-names">${apps.map(app => `<span class="smartphone-app-name">${esc(zh ? app.zhName : app.name)}</span>`).join('')}</div>
    </section>`;
  }).join('\n    ');
  const controls = smartphoneApps.mapControls.filter(control => control.disposition !== 'weak-gps-status');
  const weakGps = smartphoneApps.mapControls.find(control => control.disposition === 'weak-gps-status');
  const tags = zh
    ? `手机怎么打开 左下角 图标 手机应用 消息 当地人 地图 导航 暂停 退出 解锁 新应用 探索 ${smartphoneApps.confirmedApps.map(app => app.zhName).join(' ')}`
    : `how to open smartphone bottom left icon phone apps messages locals map navigation pause exit unlock new apps explore ${smartphoneApps.confirmedApps.map(app => app.name).join(' ')}`;
  return `<!-- BEGIN SMARTPHONE TUTORIAL REFERENCE -->
<section class="answer-box tutorial-reference" id="smartphone-apps" aria-labelledby="smartphone-apps-title" data-search-entry data-search-title="${esc(copy.title)}" data-search-tags="${esc(tags)}" data-search-status="${zh ? '游戏构建提示' : 'Game-build guidance'}">
  <h2 id="smartphone-apps-title">${esc(copy.title)}</h2>
  <p><strong>${zh ? '直接答案：' : 'Short answer: '}</strong>${esc(copy.summary)}</p>
  <ol>
    ${copy.steps.map(step => `<li><strong>${esc(step.label)}${zh ? '：' : ':'}</strong> ${esc(step.text)}</li>`).join('\n    ')}
  </ol>
  <h3 class="smartphone-app-list-title">${zh ? '当前构建中可与启用图标匹配的应用' : 'Apps matched to active icons in this build'}</h3>
  <div class="smartphone-app-groups">${groups}</div>
  <p class="smartphone-map-controls"><strong>${zh ? '地图操作：' : 'Map controls: '}</strong>${controls.map(control => esc(zh ? control.zhName : control.name)).join(zh ? '、' : ' · ')}${zh ? `。${esc(weakGps.zhName)}` : `. ${esc(weakGps.name)}`}</p>
  <p class="recipe-boundary"><span class="evidence-badge evidence-build">${zh ? '游戏文件' : 'Game files'}</span> ${esc(copy.boundary)} ${esc(smartphoneApps.boundary[zh ? 'zh' : 'en'])} ${zh ? `核对版本 ${data.build}。` : `Checked against ${data.build}.`}</p>
</section>
<!-- END SMARTPHONE TUTORIAL REFERENCE -->`;
}

function renderVehicleOperation(zh) {
  const copy = vehicleOperationFamily.content[zh ? 'zh' : 'en'];
  const tags = zh
    ? '车辆油表在哪里 左上角 燃油 加油站 24小时 损坏 碰撞 速度 稳定 转弯 QuickFix 修理 维修 警方追捕 玩家体力 能效 吃东西 休息 睡觉'
    : 'where vehicle fuel gauge top left petrol gas station 24/7 damage crash impact speed stability turning QuickFix repair police chase player energy efficiency eating resting sleeping';
  return `<!-- BEGIN VEHICLE OPERATION TUTORIAL REFERENCE -->
<section class="answer-box tutorial-reference" id="vehicle-operation-current-build" aria-labelledby="vehicle-operation-current-build-title" data-search-entry data-search-title="${esc(copy.title)}" data-search-tags="${esc(tags)}" data-search-status="${zh ? '游戏构建提示' : 'Game-build guidance'}">
  <h2 id="vehicle-operation-current-build-title">${esc(copy.title)}</h2>
  <p><strong>${zh ? '直接答案：' : 'Short answer: '}</strong>${esc(copy.summary)}</p>
  <ol>
    ${copy.steps.map(step => `<li><strong>${esc(step.label)}${zh ? '：' : ':'}</strong> ${esc(step.text)}</li>`).join('\n    ')}
  </ol>
  <p class="recipe-boundary"><span class="evidence-badge evidence-build">${zh ? '游戏文件' : 'Game files'}</span> ${esc(copy.boundary)} ${zh ? `核对版本 ${data.build}。` : `Checked against ${data.build}.`}</p>
</section>
<!-- END VEHICLE OPERATION TUTORIAL REFERENCE -->`;
}

let stale = false;
function upsertReference(before, markerPattern, rendered, legacyPattern = null) {
  const clean = value => value.replace(/[ \t]+$/gm, '');
  if (markerPattern.test(before)) return clean(before.replace(markerPattern, rendered));
  if (legacyPattern?.test(before)) return clean(before.replace(legacyPattern, rendered));
  const articleEnd = before.lastIndexOf('</article>');
  if (articleEnd === -1) throw new Error('Missing article insertion target');
  return clean(`${before.slice(0, articleEnd)}${rendered}\n${before.slice(articleEnd)}`);
}

function ensureTocLink(html, id, label) {
  if (html.includes(`href="#${id}"`)) return html;
  return html.replace(/(<nav class="toc"[\s\S]*?<ul>)([\s\S]*?)(<\/ul>[\s\S]*?<\/nav>)/,
    (_, start, items, end) => `${start}${items}\n          <li><a href="#${id}">${label}</a></li>${end}`);
}

for (const zh of [false, true]) {
  const file = path.join(root, zh ? 'zh' : '', 'guides/beginners-guide.html');
  const before = fs.readFileSync(file, 'utf8');
  const markerPattern = /<!-- BEGIN SLEEP TUTORIAL REFERENCE -->[\s\S]*?<!-- END SLEEP TUTORIAL REFERENCE -->/;
  const after = upsertReference(before, markerPattern, renderSleep(zh));
  if (before === after) continue;
  if (process.argv.includes('--check')) {
    stale = true;
    console.error(`STALE: ${file}`);
  } else {
    fs.writeFileSync(file, after);
  }
}

for (const zh of [false, true]) {
  const file = path.join(root, zh ? 'zh' : '', 'guides/beginners-guide.html');
  const before = fs.readFileSync(file, 'utf8');
  const markerPattern = /<!-- BEGIN SMARTPHONE TUTORIAL REFERENCE -->[\s\S]*?<!-- END SMARTPHONE TUTORIAL REFERENCE -->/;
  const after = upsertReference(before, markerPattern, renderSmartphone(zh));
  if (before === after) continue;
  if (process.argv.includes('--check')) {
    stale = true;
    console.error(`STALE: ${file}`);
  } else {
    fs.writeFileSync(file, after);
  }
}

for (const zh of [false, true]) {
  const file = path.join(root, zh ? 'zh' : '', 'guides/money-making.html');
  const before = fs.readFileSync(file, 'utf8');
  const markerPattern = /<!-- BEGIN CASHIN TUTORIAL REFERENCE -->[\s\S]*?<!-- END CASHIN TUTORIAL REFERENCE -->/;
  const legacyPattern = zh
    ? /<section id="cashin"[^>]*>[\s\S]*?<\/section>/
    : /<h2 id="cashin">[\s\S]*?(?=<h2 id="energy">)/;
  let cashinBase = before;
  if (legacyPattern.test(cashinBase)) cashinBase = cashinBase.replace(markerPattern, '');
  const after = upsertReference(cashinBase, markerPattern, renderCashin(zh), legacyPattern);
  if (before === after) continue;
  if (process.argv.includes('--check')) {
    stale = true;
    console.error(`STALE: ${file}`);
  } else {
    fs.writeFileSync(file, after);
  }
}

for (const zh of [false, true]) {
  const file = path.join(root, zh ? 'zh' : '', 'guides/farming-fields.html');
  const before = fs.readFileSync(file, 'utf8');
  const markerPattern = /<!-- BEGIN HOE TUTORIAL REFERENCE -->[\s\S]*?<!-- END HOE TUTORIAL REFERENCE -->/;
  const legacyPattern = /<section class="answer-box" id="start-farming">[\s\S]*?<\/section>/;
  const after = upsertReference(before, markerPattern, renderHoe(zh), legacyPattern);
  if (before === after) continue;
  if (process.argv.includes('--check')) {
    stale = true;
    console.error(`STALE: ${file}`);
  } else {
    fs.writeFileSync(file, after);
  }
}

for (const zh of [false, true]) {
  const file = path.join(root, zh ? 'zh' : '', 'guides/building-construction.html');
  const before = fs.readFileSync(file, 'utf8');
  const markerPattern = /<!-- BEGIN BLUEPRINT TUTORIAL REFERENCE -->[\s\S]*?<!-- END BLUEPRINT TUTORIAL REFERENCE -->/;
  const withReference = upsertReference(before, markerPattern, renderBlueprint(zh));
  const after = ensureTocLink(withReference, 'blueprint-building', zh ? '蓝图建造步骤' : 'Blueprint building steps');
  if (before === after) continue;
  if (process.argv.includes('--check')) {
    stale = true;
    console.error(`STALE: ${file}`);
  } else {
    fs.writeFileSync(file, after);
  }
}

for (const zh of [false, true]) {
  const file = path.join(root, zh ? 'zh' : '', 'guides/police-wanted-levels.html');
  const before = fs.readFileSync(file, 'utf8');
  const markerPattern = /<!-- BEGIN POLICE PURSUIT TUTORIAL REFERENCE -->[\s\S]*?<!-- END POLICE PURSUIT TUTORIAL REFERENCE -->/;
  const withReference = upsertReference(before, markerPattern, renderPolicePursuit(zh));
  const after = ensureTocLink(withReference, 'police-pursuit-current-build', zh ? '当前版本追捕与投降路线' : 'Current-build pursuit and surrender path');
  if (before === after) continue;
  if (process.argv.includes('--check')) {
    stale = true;
    console.error(`STALE: ${file}`);
  } else {
    fs.writeFileSync(file, after);
  }
}

for (const zh of [false, true]) {
  const file = path.join(root, zh ? 'zh' : '', 'guides/vehicles-transport.html');
  const before = fs.readFileSync(file, 'utf8');
  const markerPattern = /<!-- BEGIN VEHICLE OPERATION TUTORIAL REFERENCE -->[\s\S]*?<!-- END VEHICLE OPERATION TUTORIAL REFERENCE -->/;
  const withReference = upsertReference(before, markerPattern, renderVehicleOperation(zh));
  const after = ensureTocLink(withReference, 'vehicle-operation-current-build', zh ? '当前版本车辆操作' : 'Current-build vehicle operation');
  if (before === after) continue;
  if (process.argv.includes('--check')) {
    stale = true;
    console.error(`STALE: ${file}`);
  } else {
    fs.writeFileSync(file, after);
  }
}

if (stale) process.exitCode = 1;
else console.log('PASS: bilingual sleep, CashIn, hoe, blueprint, police-pursuit, smartphone and vehicle guidance matches source-backed tutorial data.');
