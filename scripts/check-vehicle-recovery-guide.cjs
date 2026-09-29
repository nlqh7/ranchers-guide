const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const english = fs.readFileSync(path.join(root, "problems/vehicle-recovery.html"), "utf8");
const chinese = fs.readFileSync(path.join(root, "zh/problems/vehicle-recovery.html"), "utf8");
const fastTravelEn = fs.readFileSync(path.join(root, "problems/fast-travel-subway.html"), "utf8");
const fastTravelZh = fs.readFileSync(path.join(root, "zh/problems/fast-travel-subway.html"), "utf8");
const failedQuestEn = fs.readFileSync(path.join(root, "problems/failed-quest-replay.html"), "utf8");

for (const [language, html] of [["English", english], ["Chinese", chinese]]) {
  assert.match(html, /1840310314352719/, `${language}: retain the scoped .562 AutoHue fix source`);
  assert.match(html, /1844115010489002/, `${language}: cite the official .871 update index`);
  assert.match(html, /0\.8\.10\.871/, `${language}: show the latest checked source boundary`);
  assert.doesNotMatch(html, /Build 0\.8\.10\.842 baseline|基线 0\.8\.10\.842/);
  assert.match(html, /does not identify|does not specify|未说明|没有说明/, `${language}: do not overstate the generic vehicle-fix summary`);
  assert.match(html, /City Hall|市政厅/, `${language}: retain the unresolved parking-loss boundary`);
}

for (const [language, html] of [["English fast-travel", fastTravelEn], ["Chinese fast-travel", fastTravelZh]]) {
  assert.match(html, /1840310314352719/, `${language}: cite the .562 subway-animal fix`);
  assert.match(html, /0\.8\.10\.871/, `${language}: show the latest checked source boundary`);
  assert.doesNotMatch(html, /Build 0\.8\.10\.842 baseline|基线 0\.8\.10\.842/);
  assert.match(html, /not live-tested|并非当前版本实机测试/, `${language}: distinguish source review from gameplay testing`);
}

assert.match(failedQuestEn, /0\.8\.10\.871/);
assert.match(failedQuestEn, /1843481262701719/);
assert.match(failedQuestEn, /does not list which quests|没有列出具体任务/);
assert.match(failedQuestEn, /Farewell, Nylon and Palace[\s\S]*Wall with Big Window/);
assert.doesNotMatch(failedQuestEn, /Build 0\.8\.10\.842 baseline/);

console.log("PASS: vehicle, transit and quest-replay source boundaries are current and scoped.");
