const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-tutorials.json');
const searchCore = require('../assets/js/search-core.js');
const phone = data.families.find(entry => entry.id === 'smartphone-apps');

assert.ok(phone, 'smartphone tutorial family must exist');
assert.equal(phone.evidenceLevel, 'build-observed');
assert.equal(phone.validity, 'unknown');
assert.deepEqual(phone.sourceKeys, [
  'GT/SmartPhone_HowToOpen',
  'GT/SmartPhone_MoreAppsInFuture',
  'GT/SmartPhone_Title',
  'GT/SmartPhone_UseApps',
]);
assert.equal(phone.openControl, 'bottom-left-icon');
assert.deepEqual(phone.appUses, ['messages', 'map-navigation', 'pause', 'exit']);
assert.deepEqual(phone.unlockProgress, ['settle-in-ranchers-country', 'explore-world']);
for (const field of ['completeAppList', 'unlockOrder', 'unlockTiming', 'buttonBindings', 'runtimeAvailability']) {
  assert.equal(phone[field], undefined, `unsupported ${field} fact must not be published`);
}

for (const locale of ['en', 'zh']) {
  const prefix = locale === 'zh' ? 'zh/' : '';
  const guide = fs.readFileSync(path.join(root, prefix, 'guides/beginners-guide.html'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const block = guide.match(/BEGIN SMARTPHONE TUTORIAL REFERENCE -->[\s\S]*?<!-- END SMARTPHONE TUTORIAL REFERENCE/)?.[0] || '';

  assert.ok(block, `${locale}: generated smartphone block missing`);
  assert.match(block, /id="smartphone-apps"[^>]*data-search-entry/, `${locale}: smartphone path needs a searchable deep link`);
  assert.equal((block.match(/<li>/g) || []).length, 4, `${locale}: smartphone path should stay at four scannable steps`);
  assert.match(block, locale === 'zh' ? /左下角[\s\S]*图标[\s\S]*打开/ : /icon[\s\S]*bottom left[\s\S]*open/i);
  assert.match(block, locale === 'zh' ? /消息[\s\S]*地图[\s\S]*导航/ : /messages[\s\S]*map[\s\S]*navigat/i);
  assert.match(block, locale === 'zh' ? /暂停[\s\S]*退出/ : /pause[\s\S]*exit/i);
  assert.match(block, locale === 'zh' ? /安顿[\s\S]*探索[\s\S]*新.*应用/ : /new apps[\s\S]*settle[\s\S]*explore/i);
  assert.doesNotMatch(block, /24847725/, `${locale}: internal Steam build must not appear in player copy`);
  assert.match(block, locale === 'zh' ? /没有给出[^。]*完整应用清单/ : /does not provide[^.]*complete app list/i);
  assert.doesNotMatch(block, locale === 'zh' ? /第\s*\d+\s*天解锁|按下.{0,8}键/ : /unlocks? on day \d+|press the .{0,12} key/i);

  assert.match(guide, /<a href="#smartphone-apps">/, `${locale}: table of contents must link to the smartphone path`);
  assert.match(guide, /first-30-minutes[\s\S]*?<a href="#smartphone-apps">/, `${locale}: quick-start answer must expose the smartphone path`);

  const queries = locale === 'zh'
    ? ['怎么打开手机', '手机地图导航', '手机应用暂停退出']
    : ['how to open smartphone', 'smartphone map navigation', 'phone apps pause exit'];
  for (const query of queries) {
    assert.equal(
      searchCore.searchDocuments(searchIndex, query, 5)[0]?.url,
      `/${prefix}guides/beginners-guide#smartphone-apps`,
      `${locale}: ${query} must open the smartphone path`,
    );
  }
}

console.log('PASS: current-build smartphone opening, app uses and unlock guidance is source-bounded and directly searchable.');
