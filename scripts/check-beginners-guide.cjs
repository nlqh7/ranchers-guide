const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const crops = require('../data/crops.json').buildRoster.entries;

assert.equal(crops.length, 11);
assert.equal(crops.filter(crop => crop.townSeedVendor === 'listed').length, 9);

for (const prefix of ['', 'zh/']) {
  const beginner = fs.readFileSync(path.join(root, prefix, 'guides/beginners-guide.html'), 'utf8');
  const crafting = fs.readFileSync(path.join(root, prefix, 'guides/crafting-guide.html'), 'utf8');

  assert.doesNotMatch(beginner, /data-backpack-reference/, `${prefix || 'en/'} beginner flow must not contain the backpack configuration lookup`);
  assert.match(crafting, /data-backpack-reference/, `${prefix || 'en/'} crafting guide must retain the backpack configuration lookup`);
  assert.ok(beginner.indexOf('id="first-30-minutes"') < beginner.indexOf('class="page-banner"'), `${prefix || 'en/'} must show the immediate route before the decorative banner`);
  assert.ok(beginner.indexOf('id="first-30-minutes"') < beginner.indexOf('class="toc"'), `${prefix || 'en/'} must show the immediate route before long-form navigation`);
  assert.doesNotMatch(beginner, /class="evidence-status"/, `${prefix || 'en/'} must not lead with implementation-style evidence counts`);
  assert.match(beginner, /href="\/(?:zh\/)?map#cash-in-box"/, `${prefix || 'en/'} must link beginners to the Cash-In map entry`);
  assert.match(beginner, /href="\/(?:zh\/)?guides\/crafting-guide#recipe-prop_Scarecrow_00"/, `${prefix || 'en/'} must link the ordinary Scarecrow recipe`);
  assert.match(beginner, prefix ? /普通稻草人不需要工作台/ : /ordinary Scarecrow does not require a workbench/i);
  assert.match(beginner, prefix ? /11 个季节配置.*9 个.*种子商店/ : /11 seasonal configurations.*9.*Town Seed Vendor/is);
  assert.match(beginner, prefix ? /href="\/zh\/tools\/quest-tracker"/ : /href="\/tools\/quest-tracker"/);
  assert.match(beginner, prefix ? /<details class="faq-item">\s*<summary>展开旧版/ : /<details class="faq-item">\s*<summary>Older 0\.8\.10\.455/);
  assert.match(beginner, prefix ? /2026-09-26 (?:更新|复核)/ : /September 26, 2026/, `${prefix || 'en/'} review date must reflect the latest patch-guidance review`);
  assert.match(beginner, /href="\/guides\/controls-camera-settings#camera"/, `${prefix || 'en/'} newcomers must be able to jump from the beginner route to the published camera guide`);
  assert.match(beginner, prefix ? /href="\/zh\/guides\/farming-fields#crop-loss"/ : /href="\/guides\/farming-fields#crop-loss"/, `${prefix || 'en/'} crop-loss answer must link to the actionable current diagnostic`);
  assert.match(beginner, prefix ? /日终.*(?:提示|报告).{0,120}(?:田块|信息弹窗)|(?:田块|信息弹窗).{0,120}日终/ : /End.of.Day.{0,180}(?:Plantation Info Popup|popup)|(?:Plantation Info Popup|popup).{0,180}End.of.Day/i, `${prefix || 'en/'} crop-loss answer must direct players to both in-game reason displays`);
  assert.match(beginner, prefix ? /(?:首次|第一次).{0,120}(?:屋顶|屋顶板).{0,100}(?:教程|支持|放置)/ : /first.*roof.{0,150}(?:tutorial|support|placement)/i, `${prefix || 'en/'} building FAQ must explain the first-roof tutorial`);
  assert.match(beginner, /href="\/(?:zh\/)?database\/buildings\/coop#first-coop-route"/, `${prefix || 'en/'} quest milestones must link directly to the first-Coop walkthrough`);
  assert.match(beginner, /1844115010489002/, `${prefix || 'en/'} new roof/camera guidance must link to the official 0.8.10.871 announcement`);

  /* Opening-route slice: current quest name → check now → recorded steps → next goal. */
  const openIdx = beginner.indexOf('id="opening-route"');
  assert.ok(openIdx !== -1, `${prefix || 'en/'} must include the opening-route section`);
  assert.ok(openIdx < beginner.indexOf('class="page-banner"'), `${prefix || 'en/'} opening route must appear before the decorative banner`);
  const first30 = beginner.slice(beginner.indexOf('id="first-30-minutes"'), openIdx);
  assert.ok(first30.includes('href="#opening-route"'), `${prefix || 'en/'} generic opening-quest bullet must link the opening-route section`);
  const openSection = beginner.slice(openIdx, beginner.indexOf('</section>', openIdx));
  assert.equal((openSection.match(/data-search-entry/g) || []).length, 1, `${prefix || 'en/'} opening route keeps exactly one search-entry boundary`);
  const stageUrls = ['meet-meriem', 'a-new-beginning', 'from-blueprint-to-bed']
    .map(slug => openSection.indexOf(`href="/${prefix}database/quests/${slug}"`));
  assert.ok(stageUrls.every(idx => idx !== -1), `${prefix || 'en/'} opening route must link all three existing quest profiles`);
  assert.ok(stageUrls[0] < stageUrls[1] && stageUrls[1] < stageUrls[2], `${prefix || 'en/'} opening route stages must follow the recorded quest order`);
  assert.ok(openSection.includes('class="opening-route-link"'), `${prefix || 'en/'} stage links need the 44px tap-target class`);
  assert.match(openSection, prefix ? /与玛丽阿姆见面/ : /Meet Meriem/, `${prefix || 'en/'} stage names match the existing profiles`);
  assert.match(openSection, prefix ? /新的开始！/ : /A new begining!/, `${prefix || 'en/'} stage names keep the exact recorded quest name, typo included`);
  assert.match(openSection, prefix ? /从蓝图到床铺/ : /From Blueprint to Bed/);
  assert.match(openSection, prefix ? /下车/ : /leave the quest car/i, `${prefix || 'en/'} ranch-drive check must mention both leaving the quest car`);
  assert.match(openSection, prefix ? /完成条件，不是/ : /completion condition, not/i, `${prefix || 'en/'} inventory check stays a recorded condition, not a reward or shopping list`);
  assert.match(openSection, /0\.8\.10\.842/, `${prefix || 'en/'} section must attribute steps to the recorded build`);
  assert.match(openSection, /0\.8\.10\.871/, `${prefix || 'en/'} section must keep the current-runtime distinction`);
  assert.doesNotMatch(openSection, prefix ? /取消任务|重新读档|必买|保证修复/ : /cancel the quest|reload your save|guaranteed fix|must buy/i, `${prefix || 'en/'} no guaranteed workarounds or shopping instructions`);
  for (const paragraph of openSection.match(/<p>[\s\S]*?<\/p>/g) || []) {
    const text = paragraph.replace(/<[^>]+>/g, '');
    assert.ok(text.length <= 240, `${prefix || 'en/'} opening-route paragraphs stay within 240 characters: ${text.slice(0, 60)}…`);
  }
  assert.doesNotMatch(beginner, /profit per day for every known crop|Scarecrow recipes live in the workbench|稻草人配方在工地制作菜单/);
  assert.match(beginner, /href="[^"]*assets\/css\/beginner-opening\.css\?v=20261022-opening1"/, `${prefix || 'en/'} page must load the small opening-route stylesheet`);
  if (!prefix) assert.match(openSection, /data-search-tags="[^"]*\ba new beginning\b/i, 'en/ correct-spelling alias is allowed without renaming the raw quest');
}

const openingCss = fs.readFileSync(path.join(root, 'assets/css/beginner-opening.css'), 'utf8');
assert.match(openingCss, /\.opening-route-link\s*\{[^}]*min-height:\s*44px/, 'stage links keep a 44px tap target');

const beginnerZh = fs.readFileSync(path.join(root, 'zh/guides/beginners-guide.html'), 'utf8');
assert.match(beginnerZh, /href="\/zh\/guides\/building-construction"/);
assert.match(beginnerZh, /href="\/zh\/guides\/multiplayer-coop"/);

console.log('PASS: bilingual beginner flows stay focused while backpack data remains available in crafting references.');
