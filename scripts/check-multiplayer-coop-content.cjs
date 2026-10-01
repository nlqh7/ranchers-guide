const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const english = fs.readFileSync(path.join(root, "guides/multiplayer-coop.html"), "utf8");
const chinese = fs.readFileSync(path.join(root, "zh/guides/multiplayer-coop.html"), "utf8");

function section(html, id) {
  return html.match(new RegExp(`<section[^>]*\\bid=["']${id}["'][\\s\\S]*?<\\/section>`, "i"))?.[0] || "";
}

function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function assertIncludesAll(value, patterns, label) {
  for (const pattern of patterns) assert.match(value, pattern, `${label}: missing ${pattern}`);
}

function hasUnqualifiedEffectPromise(html, locale) {
  const sentences = visibleText(html).split(/[.!?。！？]/);
  const effect = locale === "zh"
    ? /零丢失|丢失|浪费.{0,12}(?:一天|整天)|损失.{0,12}(?:一天|整天)/
    : /zero lost items?|lost items?|wast(?:e|ing).{0,20}(?:day|energy)|entire day/i;
  const promise = locale === "zh" ? /保证|确保|防止|避免|不会/ : /prevents?|guarantees?|ensures?|zero lost items?/i;
  const caveat = locale === "zh" ? /不能|不保证|无法|未证实|未知|建议|只是|不要把/ : /does not|doesn't|cannot|can't|not guaranteed|unknown|unverified|suggest(?:ion|ed)|do not assume/i;
  return sentences.some(sentence => effect.test(sentence) && promise.test(sentence) && !caveat.test(sentence));
}

const enText = visibleText(english);
const zhText = visibleText(chinese);
const enMode = section(english, "session-mode");
const zhMode = section(chinese, "session-mode");
const enProgress = section(english, "progress-boundary");
const zhProgress = section(chinese, "progress-boundary");
const enCashin = section(english, "cashin-coop");
const zhCashin = section(chinese, "cashin-coop");

assert.ok(enMode && zhMode, "both pages must expose the session-mode decision section");
assert.ok(enProgress && zhProgress, "both pages must expose the progress-boundary section");
assert.ok(enCashin && zhCashin, "both pages must expose the cashin-coop boundary section");

assertIncludesAll(enMode, [/PLAY SOLO/i, /OPEN TO FRIENDS/i, /visit|visiting/i], "English mode choice");
assertIncludesAll(zhMode, [/PLAY SOLO/i, /OPEN TO FRIENDS/i, /拜访|朋友家/], "Chinese mode choice");
assertIncludesAll(enProgress, [/visitor/i, /money/i, /experience/i, /backpack items?/i, /blueprints?/i], "English visitor property");
assertIncludesAll(zhProgress, [/访客/, /钱|钱款|金钱/, /经验/, /背包物品/, /蓝图/], "Chinese visitor property");
assertIncludesAll(enProgress, [/host/i, /world|ranch/i, /quest progress|world progression/i, /host(?:'s)? (?:save|world)/i], "English host progress");
assertIncludesAll(zhProgress, [/房主/, /世界|牧场/, /任务|进度/, /房主(?:拥有|的)?(?:这个牧场的)?(?:世界|任务|进度)/], "Chinese host progress");
assertIncludesAll(enProgress, [/CashIn/i, /(?:does not|doesn't|not specify|unknown|unresolved)/i, /visitor|host|shared/i, /(?:payout|payment|settlement|paid|receives)/i], "English CashIn boundary");
assertIncludesAll(zhProgress, [/CashIn/i, /没有说明|未说明|未知|归属仍/, /访客|房主|共享/, /结算|到账|分配规则/], "Chinese CashIn boundary");
assertIncludesAll(enText, [/introductory|introduction/i, /compatible versions?/i, /same The Ranchers server region/i, /Steam/i, /OPEN TO FRIENDS/i, /stay online|online/i], "English join prerequisites");
assertIncludesAll(zhText, [/序章/, /兼容版本/, /同一 The Ranchers 服务器区域/, /Steam/, /OPEN TO FRIENDS/, /保持在线|在线/], "Chinese join prerequisites");
assertIncludesAll(enCashin, [/single|one basic|only that one/i, /stop all other|no other|isolation/i, /next[- ]day/i, /wallet|settlement records?|income lines?/i], "English CashIn isolation plan");
assertIncludesAll(zhCashin, [/一件|单个|只选/, /停止其他|隔离|不使用混合/, /第二天|次日/, /钱包|结算单|收入行/], "Chinese CashIn isolation plan");
assert.doesNotMatch(enText, /visitor(?:s)? (?:money|items|property).{0,80}(?:unknown|unverified|not confirmed)/i, "English page must not relabel FAQ-confirmed visitor property as unknown");
assert.doesNotMatch(zhText, /访客(?:的钱|物品|进度).{0,30}(?:未知|未确认|没有证据)/, "Chinese page must not relabel FAQ-confirmed visitor property as unknown");
assert.equal(hasUnqualifiedEffectPromise(english, "en"), false, "English page must not promise zero lost items or guaranteed schedule outcomes");
assert.equal(hasUnqualifiedEffectPromise(chinese, "zh"), false, "Chinese page must not promise zero lost items or guaranteed schedule outcomes");
assert.match(english, /Last reviewed: September 26, 2026\./, "English review date must match the latest FAQ review");
assert.match(chinese, /最近复核：2026 年 9 月 26 日。/, "Chinese review date must match the latest FAQ review");
const enHeading = english.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
const zhHeading = chinese.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
assertIncludesAll(visibleText(enHeading), [/Ranchers/i, /multiplayer/i, /join/i, /visitor/i, /progress/i], "English heading");
assertIncludesAll(visibleText(zhHeading), [/Ranchers/, /联机/, /加入/, /访客/, /进度/], "Chinese heading");
assertIncludesAll(english, [/unlock co-op|unlock multiplayer/i, /server region/i, /compatible versions?/i, /CashIn/i], "English search description");
assertIncludesAll(chinese, [/加入条件|解锁多人/, /服务器区域/, /兼容版本/, /CashIn/], "Chinese search description");

console.log("PASS: co-op guidance covers mode choice, host/visitor progress, join prerequisites, CashIn limits and evidence-bounded schedule guidance.");
