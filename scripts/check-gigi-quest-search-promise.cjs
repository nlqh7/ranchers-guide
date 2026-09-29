const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const questData = JSON.parse(fs.readFileSync(path.join(root, "data/quests.json"), "utf8"));
const gigiQuestIds = ["next-door-neighbors", "a-ride-and-a-revelation", "real-eggs-real-evidence"];

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
  const visibleText = page.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
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
