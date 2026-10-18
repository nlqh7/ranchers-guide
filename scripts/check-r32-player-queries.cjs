const assert = require('node:assert/strict');
const search = require('../assets/js/search-core.js').searchDocuments;
const en = require('../search-index.json');
const zh = require('../zh/search-index.json');

function assertQuest(results, ids, label) {
  assert.ok(results.some(result => ids.some(id => result.url === id || result.url.startsWith(`${id}#`))), `${label}: no exact quest answer route`);
}

assertQuest(search(en, 'Seeds of Success 16 plots', 8), ['/database/quests#seeds-of-success', '/database/quests/seeds-of-success'], 'English planted-plot symptom');
assertQuest(search(en, '10 plots not completing', 3), ['/database/quests#seeds-of-success', '/database/quests/seeds-of-success'], 'English unnamed incomplete-plot symptom');
assertQuest(search(en, 'scarecrow workbench locked ordinary', 8), ['/database/quests#feathered-foes', '/database/quests/feathered-foes'], 'English scarecrow deadlock symptom');
assertQuest(search(zh, '成功的种子 16块', 8), ['/zh/database/quests#seeds-of-success', '/zh/database/quests/seeds-of-success'], 'Chinese planted-plot symptom');
assertQuest(search(zh, '种了10块任务没完成', 3), ['/zh/database/quests#seeds-of-success', '/zh/database/quests/seeds-of-success'], 'Chinese unnamed incomplete-plot symptom');
assertQuest(search(zh, '稻草人 工作台 卡住 普通款', 8), ['/zh/database/quests#feathered-foes', '/zh/database/quests/feathered-foes'], 'Chinese scarecrow deadlock symptom');
console.log('PASS: natural English and Chinese player queries reach the corresponding quest answers.');
