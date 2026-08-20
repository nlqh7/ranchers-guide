const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const data = JSON.parse(read("data/chicken-troubleshooter.json"));
const core = require("../assets/js/chicken-troubleshooter-core.js");

for (const source of Object.values(data.sources)) {
  assert.ok(source.url === null || /^https:\/\//.test(source.url), "Source URLs must be verifiable or explicitly unknown");
}

const oldMissing = core.buildPlan(data, { build: "older", symptom: "missing" }, "en");
assert.equal(oldMissing.steps[0].id, "update-first");
assert.match(oldMissing.steps[0].text, /update/i);
assert.doesNotMatch(oldMissing.steps.map((step) => step.text).join(" "), /demolish.*first/i);

const currentAutomation = core.buildPlan(data, { build: "current", symptom: "automation" }, "en");
assert.match(currentAutomation.steps.map((step) => step.text).join(" "), /water contract/i);
assert.match(currentAutomation.steps.map((step) => step.text).join(" "), /green light/i);

const chineseLargeEgg = core.buildPlan(data, { build: "current", symptom: "large-eggs" }, "zh");
assert.match(chineseLargeEgg.summary, /随机|保证/);
assert.ok(chineseLargeEgg.sourceIds.length > 0);

for (const relativePath of ["tools/chicken-troubleshooter.html", "zh/tools/chicken-troubleshooter.html"]) {
  const html = read(relativePath);
  assert.match(html, /data-chicken-tool/);
  assert.match(html, /chicken-troubleshooter-core\.js/);
  assert.match(html, /chicken-troubleshooter\.js/);
  assert.match(html, /data-chicken-results/);
}

const english = read("tools/chicken-troubleshooter.html");
const chinese = read("zh/tools/chicken-troubleshooter.html");
assert.match(english, /hreflang="zh-CN" href="https:\/\/theranchersguide\.com\/zh\/tools\/chicken-troubleshooter"/);
assert.match(chinese, /hreflang="en" href="https:\/\/theranchersguide\.com\/tools\/chicken-troubleshooter"/);

console.log("PASS: bilingual chicken troubleshooter returns evidence-linked, version-aware checklists.");
