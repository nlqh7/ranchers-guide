const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = require('../data/build-tutorials.json');
const searchCore = require('../assets/js/search-core.js');
const cashin = data.families.find(entry => entry.id === 'cashin-selling');

assert.ok(cashin, 'CashIn tutorial family must exist');
assert.equal(cashin.evidenceLevel, 'build-observed');
assert.equal(cashin.validity, 'unknown');
assert.deepEqual(cashin.sourceKeys, [
  'GT/CashInBox_OnOpen_DragOneItem',
  'GT/CashInBox_OnOpen_DragOneItem_Joystick',
  'GT/CashInBox_OnOpen_DragToDeposit',
  'GT/CashInBox_OnOpen_DragToDeposit_Joystick',
  'GT/CashInBox_OnOpen_PayNextDay',
  'GT/CashInBox_OnOpen_PriceFluctiation',
  'GT/CashInBox_OnOpen_Title',
]);
assert.deepEqual(cashin.depositActions, ['drag', 'move']);
assert.deepEqual(cashin.quantityChoices, ['single-unit', 'full-stack']);
assert.equal(cashin.payoutTiming, 'next-day');
assert.equal(cashin.qualityRule, 'better-quality-higher-pay');
assert.doesNotMatch(JSON.stringify(cashin), /itemPrice|payoutAmount|fluctuationPercent|acceptedItemList/i);

for (const locale of ['en', 'zh']) {
  const prefix = locale === 'zh' ? 'zh/' : '';
  const money = fs.readFileSync(path.join(root, prefix, 'guides/money-making.html'), 'utf8');
  const coop = fs.readFileSync(path.join(root, prefix, 'guides/multiplayer-coop.html'), 'utf8');
  const beginner = fs.readFileSync(path.join(root, prefix, 'guides/beginners-guide.html'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const block = money.match(/BEGIN CASHIN TUTORIAL REFERENCE -->[\s\S]*?<!-- END CASHIN TUTORIAL REFERENCE/)?.[0] || '';
  assert.match(money, /id="cashin"[^>]*data-search-entry/, `${locale}: CashIn answer needs a searchable section`);
  assert.ok(block, `${locale}: generated CashIn block missing`);
  if (locale === 'en') assert.doesNotMatch(block, /：</, 'English generated copy must use English punctuation');
  else assert.match(block, /在地图中查看 Cash-In 箱子<\/a>。<\/p>/, 'Chinese map sentence must use Chinese punctuation');
  assert.match(block, locale === 'zh' ? /整堆|整组/ : /full stack/i);
  assert.match(block, locale === 'zh' ? /单个/ : /single (?:item|unit)/i);
  assert.match(block, locale === 'zh' ? /第二天/ : /next day/i);
  assert.match(block, locale === 'zh' ? /品质越高|品质更好/ : /better quality/i);
  assert.doesNotMatch(block, /24847725/, `${locale}: internal Steam build must not appear in player copy`);
  assert.doesNotMatch(block, locale === 'zh' ? /(?:单价|打款|收入).{0,12}\d+[C币元]/ : /(?:price|payout|income).{0,12}\d+\s*C/i);
  assert.doesNotMatch(money, locale === 'zh' ? /当天结算时到账/ : /that day(?:'s)? end-of-day settlement/i, `${locale}: obsolete same-day wording must be removed`);
  assert.match(coop, /id="progress-boundary"[^>]*data-search-entry/, `${locale}: co-op progress boundary must be searchable`);
  assert.match(coop, locale === 'zh'
    ? /访客保留自己的钱、经验、背包物品和蓝图/
    : /visitors keep personal money, experience, backpack items, and blueprints/i,
    `${locale}: co-op guidance must list the FAQ-confirmed visitor property`);
  assert.match(coop, locale === 'zh'
    ? /房主拥有这个牧场的世界与任务进度/
    : /world and quest progress in that session stays with the host's save/i,
    `${locale}: co-op guidance must assign ranch and quest progress to the host`);
  assert.match(coop, locale === 'zh'
    ? /CashIn 到账仍没有公开分配规则/
    : /CashIn is the remaining boundary.*does not say whether a visitor's deposit is paid/s,
    `${locale}: CashIn ownership must remain explicitly unknown`);
  assert.doesNotMatch(coop, locale === 'zh'
    ? /当前公开证据不足以把存档归属、访客物品和钱包行为写成通用规则/
    : /does not define guest inventory or ranch-import behavior/i,
    `${locale}: old visitor-ownership disclaimer must not contradict the FAQ-backed retention boundary`);
  const beginnerStart = beginner.match(/id="first-30-minutes"[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(beginnerStart, locale === 'zh' ? /第二天/ : /next day/i, `${locale}: beginner route must use current payout timing`);
  const queries = locale === 'zh'
    ? ['CashIn 第二天打款', 'CashIn 单个物品']
    : ['CashIn next day', 'CashIn full stack'];
  for (const query of queries) {
    assert.equal(
      searchCore.searchDocuments(searchIndex, query, 5)[0]?.url,
      `/${prefix}guides/money-making#cashin`,
      `${locale}: ${query} must open the CashIn action path`,
    );
  }
  const progressQuery = locale === 'zh' ? '访客进度 CashIn' : 'visitor progress CashIn';
  assert.equal(
    searchCore.searchDocuments(searchIndex, progressQuery, 5)[0]?.url,
    `/${prefix}guides/multiplayer-coop#progress-boundary`,
    `${locale}: visitor/CashIn query must open the cross-page boundary`,
  );
  if (locale === 'en') {
    assert.equal(searchCore.searchDocuments(searchIndex, 'how to sell crops', 5)[0]?.url, '/database/crops#how-to-sell', 'broad crop-selling query should keep the crop database answer first');
  }
}

console.log('PASS: current-build CashIn controls, next-day payout and quality rule are source-bounded and directly searchable.');
