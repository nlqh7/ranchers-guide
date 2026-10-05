const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const arcs = require('../data/story-arcs.json').arcs;
const scenes = require('../data/dialogue-scenes.json').scenes;
const npcs = require('../data/npcs.json').npcs;
const quests = require('../data/quests.json').quests;
const sceneIds = new Set(scenes.map(item => item.id));
const npcIds = new Set(npcs.map(item => item.id));
const questIds = new Set(quests.map(item => item.id));
assert.ok(arcs.length >= 2, 'story reference needs real arcs');
for (const arc of arcs) {
  for (const id of arc.sceneIds) assert.ok(sceneIds.has(id), `${arc.id}: scene ${id}`);
  for (const id of arc.questIds) assert.ok(questIds.has(id), `${arc.id}: quest ${id}`);
  assert.ok(arc.summary && arc.zhSummary && arc.spoiler && arc.zhSpoiler, `${arc.id}: bilingual copy and spoiler boundary`);
  assert.ok(arc.eventRefs?.length && arc.eventSummary && arc.zhEventSummary, `${arc.id}: event sequence contract`);
}
for (const locale of ['', 'zh/']) {
  const file = path.join(root, locale, 'guides', 'story.html');
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /data-search-entry/);
  assert.match(html, /story-arc-spoiler/);
  assert.match(html, /data-story-event-sequence/);
  assert.match(html, /Source nodes|源节点/);
  assert.match(html, /story-reference\.css\?v=20261005-r21/);
  assert.doesNotMatch(html, /D:\\尝试盈利产品|C:\\Users\\asus|LUA_OnCondition|raw\\b24847725/);
  if (locale === 'zh/') {
    assert.match(html, /本站根据公开人物\/任务记录与已复核的对话场景整理查阅路线；不是官方章节列表。/);
    assert.doesNotMatch(html, /Editorial route assembled from public NPC\/quest records/);
  }
}
const searchJs = fs.readFileSync(path.join(root, 'assets/js/search.js'), 'utf8');
assert.match(searchJs, /\/guides\/story/);
assert.match(searchJs, /\/zh\/guides\/story/);
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.match(sitemap, /<loc>https:\/\/theranchersguide\.com\/guides\/story<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/theranchersguide\.com\/zh\/guides\/story<\/loc>/);
console.log(`PASS: ${arcs.length} bilingual story arcs, spoiler boundaries, search routes and sitemap entries.`);
