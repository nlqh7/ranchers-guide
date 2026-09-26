const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const english = fs.readFileSync(path.join(root, "guides/multiplayer-coop.html"), "utf8");
const chinese = fs.readFileSync(path.join(root, "zh/guides/multiplayer-coop.html"), "utf8");

assert.match(english, /Visitors keep money, experience, backpack items, and blueprints/, "English co-op guidance must state confirmed visitor property");
assert.match(
  english,
  /The FAQ does not say whether a visitor's deposit is paid to the visitor, the host, or a shared settlement/i,
  "English co-op guidance must keep CashIn payout ownership explicitly unresolved",
);
assert.match(
  chinese,
  /访客保留自己的钱[\s\S]{0,180}CashIn[\s\S]{0,60}(?:仍未说明|没有说明|未说明)/,
  "Chinese co-op guidance must separate confirmed visitor property from the unresolved CashIn payout owner",
);
assert.doesNotMatch(
  english,
  /visitor items and shared wallet.*(?:do not|don't) (?:draw|make) conclusions/i,
  "English introduction must not call FAQ-confirmed visitor property unverified",
);
assert.doesNotMatch(
  chinese,
  /访客物品和共享钱包等细节不要在没有测试时下结论/,
  "Chinese introduction must not call FAQ-confirmed visitor property unverified",
);
assert.match(english, /Every player has their own ranch and world progression/i, "English guidance must explain separate ranch saves");
assert.match(chinese, /每位玩家都有自己的牧场和世界进度/, "Chinese guidance must explain separate ranch saves");
assert.match(english, /same The Ranchers server region/i, "English join troubleshooting must include the matching server region");
assert.match(chinese, /选择同一 The Ranchers 服务器区域/, "Chinese join troubleshooting must include the matching server region");
assert.match(english, /finish the introductory progression to unlock multiplayer/i, "English join troubleshooting must include the progression unlock");
assert.match(chinese, /完成序章并解锁多人模式/, "Chinese join troubleshooting must include the progression unlock");
assert.match(english, /Last reviewed: September 26, 2026\./, "English review date must match the latest FAQ review");
assert.match(chinese, /最近复核：2026 年 9 月 26 日。/, "Chinese review date must match the latest FAQ review");
assert.doesNotMatch(english, /Save ownership and transfer behavior should be tested/i, "English page must not label FAQ-defined save ownership unknown");
assert.doesNotMatch(chinese, /弄清当前版本如何保留世界和访客进度/, "Chinese page must not label FAQ-defined save ownership unknown");
assert.match(english, /<h1>The Ranchers Multiplayer Guide: Join, Host, and Visitor Progress<\/h1>/, "English heading must describe the page's player tasks, not imply a permanent shared ranch");
assert.match(chinese, /<h1>The Ranchers 联机攻略：加入好友、房主设置与访客进度<\/h1>/, "Chinese heading must describe the page's player tasks, not imply a permanent shared ranch");
assert.match(english, /name="description" content="The Ranchers multiplayer guide: unlock co-op, check server region and compatible versions/i, "English search description must advertise the actionable co-op answers");
assert.match(chinese, /name="description" content="本攻略整理 The Ranchers 在线合作的加入条件和步骤：先完成序章，再匹配服务器区域与兼容版本/i, "Chinese search description must advertise the actionable co-op answers");

console.log("PASS: co-op guidance matches the FAQ on separate ranches, join prerequisites, visitor property, CashIn limits, and review date.");
