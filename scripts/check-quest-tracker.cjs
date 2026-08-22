const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const files = ["tools/quest-tracker.html", "zh/tools/quest-tracker.html"];

for (const relative of files) {
  const html = fs.readFileSync(path.join(root, relative), "utf8");
  assert.match(html, /noindex,follow/i, `${relative}: tracker must remain noindex`);
  assert.doesNotMatch(html, /pagead2\.googlesyndication\.com/i, `${relative}: tracker must not load ads`);
  assert.match(html, /data-quest-tracker/, `${relative}: missing tracker root`);
  assert.match(html, /data-quest-list/, `${relative}: missing dynamic quest list`);
  assert.match(html, /data-quest-filter="category"/, `${relative}: missing category filter`);
  assert.match(html, /data-quest-filter="npc"/, `${relative}: missing NPC filter`);
  assert.match(html, /data-quest-filter="location"/, `${relative}: missing location filter`);
  assert.match(html, /data-quest-overview/, `${relative}: missing completion overview`);
  assert.match(html, /assets\/js\/quest-tracker\.js/, `${relative}: missing tracker script`);
}

const script = fs.readFileSync(path.join(root, "assets/js/quest-tracker.js"), "utf8");
assert.match(script, /data\/quests\.json/, "tracker must use the existing quest data source");
assert.match(script, /localStorage/, "tracker must persist locally");
assert.match(script, /TBD|待验证/, "tracker must expose unresolved facts as TBD");
assert.match(script, /relatedRoutes/, "tracker must expose related routes");
assert.match(script, /relations/, "tracker must expose existing entity relations");
assert.match(script, /recordMatches/, "tracker must filter existing quest records");
assert.match(script, /progressFor/, "tracker must calculate local completion progress");
assert.match(script, /data-quest-overview/, "tracker must expose completion overview");
assert.match(script, /data-quest-next/, "tracker must expose the next unchecked objective");
assert.match(script, /nextObjectiveFor/, "tracker must derive the next objective from existing facts");
assert.match(script, /ranchers-guide-quest-tracker-v1/, "tracker storage key must be versioned");

const quests = JSON.parse(fs.readFileSync(path.join(root, "data/quests.json"), "utf8"));
assert.ok(Array.isArray(quests.quests) && quests.quests.length >= 1, "quest data must contain records");
assert.ok(quests.quests.every((quest) => Array.isArray(quest.facts)), "every quest record must expose facts");
assert.ok(quests.quests.every((quest) => quest.category && quest.zhCategory), "every quest record must expose bilingual editorial category labels");

console.log(`PASS: bilingual quest tracker uses ${quests.quests.length} existing quest records, localStorage and noindex/no-ad boundaries.`);
