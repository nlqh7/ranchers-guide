const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const search = require('../assets/js/search-core.js');
const main = require('../assets/js/main.js');
const root = path.resolve(__dirname, '..');
const english = fs.readFileSync(path.join(root, 'guides/controls-camera-settings.html'), 'utf8');
const chinese = fs.readFileSync(path.join(root, 'zh/guides/beginners-guide.html'), 'utf8');

assert.ok(english.includes('id="keyboard-remapping"'), 'English controls guide needs a direct keyboard-remapping answer');
assert.match(english, /No current source confirms[^.]*keyboard remapping|keyboard remapping[^.]*is not confirmed/i, 'Do not present a planned feature as currently available');
assert.ok(english.includes('https://steamcommunity.com/app/1501310/eventcomments/587307627624695975/#c587307627624739829'), 'Link the moderator response about the planned-but-not-yet-available feature');
assert.ok(english.includes('https://steamcommunity.com/app/1501310/discussions/0/3203744999892138506/'), 'Link the September developer FAQ for the current support boundary');
assert.ok(english.includes('https://steamcommunity.com/app/1501310/announcements/detail/1844115010489002'), 'Link the latest camera update rather than implying it added key remapping');
assert.ok(english.includes('main.js?v=20261003-r15'), 'The keyboard-remapping deep link must load the updated shared hash behavior');

assert.ok(chinese.includes('id="keyboard-remapping"'), 'Chinese beginner FAQ needs the same direct keyboard-remapping answer');
assert.match(chinese, /尚不能确认[^。]*键位重设|当前版本[^。]*键位重设[^。]*尚未确认/, 'Chinese copy must preserve the current availability uncertainty');
assert.ok(chinese.includes('改键') && chinese.includes('左手'), 'Chinese search terms should cover the player need');
assert.ok(chinese.includes('https://steamcommunity.com/app/1501310/eventcomments/587307627624695975/#c587307627624739829'), 'Link the same dated moderator response in Chinese');
assert.ok(chinese.includes('https://steamcommunity.com/app/1501310/discussions/0/3203744999892138506/'), 'Link the current developer FAQ in Chinese');
assert.ok(chinese.includes('https://steamcommunity.com/app/1501310/announcements/detail/1844115010489002'), 'Link the latest official update in Chinese');
assert.ok(chinese.includes('main.js?v=20261003-r15'), 'The Chinese search result must load the updated shared hash behavior');

const englishIndex = JSON.parse(fs.readFileSync(path.join(root, 'search-index.json'), 'utf8'));
const chineseIndex = JSON.parse(fs.readFileSync(path.join(root, 'zh/search-index.json'), 'utf8'));
for (const query of ['keyboard remapping', 'left hand keyboard', 'arrow keys instead of WASD']) {
  assert.equal(search.searchDocuments(englishIndex, query, 5)[0]?.url, '/guides/controls-camera-settings#keyboard-remapping', `${query}: English search should open the exact remapping answer`);
}
assert.equal(search.searchDocuments(chineseIndex, '左手改键', 5)[0]?.url, '/zh/guides/beginners-guide#keyboard-remapping', 'Chinese search should open the exact remapping answer');

assert.equal(typeof main.openDetailsForHashTarget, 'function', 'Deep links into collapsed answers need a public reveal behavior');
const outerDetails = { tagName: 'DETAILS', open: false, parentElement: null };
const faq = { tagName: 'DETAILS', open: false, parentElement: outerDetails };
main.openDetailsForHashTarget(faq);
assert.equal(faq.open, true, 'Open the details element that is the hash target');
assert.equal(outerDetails.open, true, 'Open any collapsed details ancestors so nested targets become visible');

console.log('PASS: keyboard-remapping answer is bilingual, actionable, and does not mistake a planned feature for a current one.');
