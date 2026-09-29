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
  assert.doesNotMatch(beginner, /profit per day for every known crop|Scarecrow recipes live in the workbench|稻草人配方在工地制作菜单/);
}

const beginnerZh = fs.readFileSync(path.join(root, 'zh/guides/beginners-guide.html'), 'utf8');
assert.match(beginnerZh, /href="\/zh\/guides\/building-construction"/);
assert.match(beginnerZh, /href="\/zh\/guides\/multiplayer-coop"/);

console.log('PASS: bilingual beginner flows stay focused while backpack data remains available in crafting references.');
