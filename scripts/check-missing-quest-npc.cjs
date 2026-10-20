const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const official = '1842846814456746';
const report = 'https://steamcommunity.com/profiles/76561198282267204/recommended/1501310/';
const recovery = read('problems/failed-quest-replay.html');
const problemHub = read('problems.html');
const tracker = problemHub.match(/<details\b[^>]*data-issue-history[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(tracker && tracker.includes('<table>'), 'the unfiltered reference table must be secondary to symptom results');
assert.ok(!/^<details\b[^>]*\bopen\b/.test(tracker), 'the old tracker must not push one filtered answer below an open reference table');
assert.ok(recovery.includes('id="missing-quest-npc"'), 'the existing recovery guide must separate the missing-NPC symptom');
assert.ok(!recovery.includes('so an escort NPC leaving your side is a state problem, not intended behavior'), 'engine capabilities are not a diagnosis of every missing escort');
for (const file of ['problems.html', 'zh/problems.html']) {
  const html = read(file);
  const card = html.match(/<article\b[^>]*\bid="missing-quest-npc"[^>]*>[\s\S]*?<\/article>/)?.[0];
  assert.ok(card, `${file}: missing NPC needs a discoverable symptom card`);
  assert.ok(card.includes('data-problem-status="reported"'), `${file}: a single report is not a confirmed fix`);
  assert.ok(card.includes('data-search-entry'), `${file}: the answer must be indexable as a dedicated section`);
  assert.ok(card.includes(official) && card.includes(report), `${file}: historical fix and later report need separate direct sources`);
  assert.ok(card.includes('0.8.10.858') && card.includes('2026-10-03'), `${file}: keep the fix scope and report date visible`);
}
console.log('PASS: missing quest NPC is separated from a failed quest, with scoped bilingual evidence and no blanket escort diagnosis.');
const search = require('../assets/js/search-core.js').searchDocuments;
for (const [index, queries, expected] of [
  ['search-index.json', ['quest person disappeared', 'missing quest NPC'], ['/problems#missing-quest-npc', '/problems/failed-quest-replay#missing-quest-npc']],
  ['zh/search-index.json', ['任务人物不见了', '任务NPC消失'], ['/zh/problems#missing-quest-npc']]
]) {
  const docs = JSON.parse(read(index));
  for (const query of queries) {
    assert.ok(search(docs, query, 3).some(result => expected.includes(result.url)), `${query}: a symptom-only search must reach the dedicated answer, not a generic directory`);
  }
}
console.log('PASS: natural bilingual missing-NPC searches reach a dedicated answer within the top three results.');
