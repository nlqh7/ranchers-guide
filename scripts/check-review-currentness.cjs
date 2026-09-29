const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const en = fs.readFileSync(path.join(root, "guides", "review.html"), "utf8");
const zh = fs.readFileSync(path.join(root, "zh", "guides", "review.html"), "utf8");

assert.match(en, /Current official baseline:[^<]*0\.8\.10\.871/i);
assert.match(en, /no (?:new )?hands-on play(?:through|test)/i);
assert.match(zh, /当前官方版本基线：[^<]*0\.8\.10\.871/);
assert.match(zh, /未(?:重新)?实机游玩/);

for (const [locale, html] of [["en", en], ["zh", zh]]) {
  assert.match(html, /id="recent-updates"/, `${locale}: review must explain changes after the prior baseline`);
  assert.match(html, /steamcommunity\.com\/app\/1501310\/announcements/, `${locale}: review must link to official update notes`);
  for (const version of ["0.8.10.858", "0.8.10.868", "0.8.10.871"]) {
    assert.ok(html.includes(version), `${locale}: review is missing player-relevant update ${version}`);
  }
  assert.doesNotMatch(html, /Last reviewed: August 23, 2026|最近复核：2026 年 8 月 23 日/);
}

console.log("PASS: bilingual review baseline, freshness, and update context agree with official 0.8.10.871 sources.");
