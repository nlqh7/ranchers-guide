const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "player-report.json"), "utf8"));
const english = fs.readFileSync(path.join(root, "tools", "player-report.html"), "utf8");
const chinese = fs.readFileSync(path.join(root, "zh", "tools", "player-report.html"), "utf8");
const script = fs.readFileSync(path.join(root, "assets", "js", "player-report.js"), "utf8");

assert.equal(data.length, 7, "player report must cover the seven supported topics");
assert.ok(data.every((topic) => topic.route && topic.routeZh && topic.checks.length >= 3 && topic.checksZh.length >= 3), "every topic needs answer routes and a minimum evidence checklist");
for (const page of [english, chinese]) {
  assert.match(page, /noindex,follow/);
  assert.match(page, /data-player-report-form/);
  assert.match(page, /data-report-route/);
  assert.match(page, /data-report-copy/);
  assert.match(page, /data-report-steam/);
  assert.match(page, /data-report-email/);
  assert.doesNotMatch(page, /pagead2\.googlesyndication\.com/);
}
assert.match(script, /Nothing is uploaded|not sent to a server|contribute@theranchersguide\.com/);
assert.match(script, /steamcommunity\.com\/app\/1501310\/discussions/);
console.log(`PASS: player report builder covers ${data.length} topics with local-only export actions.`);
