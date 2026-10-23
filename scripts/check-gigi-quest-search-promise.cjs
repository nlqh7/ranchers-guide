const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const questData = JSON.parse(fs.readFileSync(path.join(root, "data/quests.json"), "utf8"));
const gigiQuestIds = ["next-door-neighbors", "a-ride-and-a-revelation", "real-eggs-real-evidence"];
const npcData=JSON.parse(fs.readFileSync(path.join(root,'data/npcs.json'),'utf8'));
for(const record of [questData.quests.find(entry=>entry.id==='real-eggs-real-evidence'),npcData.npcs.find(entry=>entry.id==='gigi')]){
 const endpoint=record.facts.find(fact=>fact.sourceIds.includes('gigi-official-end-thread'));
 assert.ok(/post-hand-in events/.test(endpoint.text)&&/交付后的事件/.test(endpoint.zhText),'The moderator described the egg quest and its aftermath,not the hand-in alone');
 assert.equal(endpoint.validity,'unknown','A dated unnamed-build endpoint reply is not current runtime verification');
}

for (const id of gigiQuestIds) {
  const quest = questData.quests.find((entry) => entry.id === id);
  assert.ok(quest, `missing recorded Gigi quest: ${id}`);
  assert.match(`${quest.summary} ${quest.zhSummary}`, /Gigi|吉吉/i, `${id} must be supported by the current quest data`);
}

for (const [prefix, titlePattern, scopePattern] of [
  ["", /<title>[^<]*Gigi Quests/i, /This walkthrough covers (?:only .*|.* only)/i],
  ["zh/", /<title>[^<]*Gigi[^<]*任务/i, /本页\s*只讲|本攻略\s*只讲/],
]) {
  const page = fs.readFileSync(path.join(root, prefix, "guides/gigi-large-egg-quest.html"), "utf8");
  const after=page.match(/<section\b[^>]*id="after"[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(after,prefix+': the existing after-quest hash needs a dedicated state-based answer');
  assert.ok(after.includes('590686908802417907'),prefix+': include the dated moderator reply rather than only player waiting reports');
  assert.ok(after.includes(`/${prefix}database/quests/real-eggs-real-evidence`),prefix+': active quests must reach the actual completion objectives');
  const visibleText = page.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
  const index=JSON.parse(fs.readFileSync(path.join(root,prefix,'search-index.json'),'utf8'));
  const results=require('../assets/js/search-core.js').searchDocuments(index,prefix?'Gigi交蛋后没任务':'after handing eggs to Gigi',12);
  assert.equal(results[0]?.url,`/${prefix}guides/gigi-large-egg-quest#after`,'A post-hand-in question must reach the exact state-based answer first');
  assert.ok((prefix?/结束对话/:/final conversation/i).test(results[0].snippet),'The search excerpt must include the unfinished final-conversation check');
  assert.ok(titlePattern.test(page), `${prefix || "en/"} title must reflect Gigi-quests search intent`);
  assert.ok(scopePattern.test(visibleText), `${prefix || "en/"} page must scope the walkthrough to the large-egg quest`);
  if (prefix === "") {
    assert.match(visibleText, /Deposit chicks inside the coop\s*, not in the enclosure\./, "English chicken-care instructions must consistently say coop");
    assert.doesNotMatch(visibleText, /Deposit chicks inside the barn/, "English chicken-care instructions must not call the coop a barn");
  } else {
    assert.match(visibleText, /把小鸡放进鸡舍里面\s*，不是放在围栏里/, "Chinese chicken-care instructions must consistently say 鸡舍");
    assert.doesNotMatch(visibleText, /把小鸡放进畜棚/, "Chinese chicken-care instructions must not call the coop 畜棚");
  }
  for (const id of gigiQuestIds) {
    assert.ok(page.includes(`/${prefix}database/quests#${id}`), `${prefix || "en/"} page must link the recorded Gigi quest ${id}`);
  }
}

console.log("PASS: Gigi quest pages match the plural search intent, scope the walkthrough honestly, and link all three source-backed quest records.");
