const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const threadUrl = "https://steamcommunity.com/app/1501310/discussions/0/587307906418888142/";
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const readJson = (relative) => JSON.parse(read(relative));

for (const [label, relative, patterns] of [
  ["English", "database/animals.html", [/linked count/i, /enclosed fence/i, /daily report/i, /green dots.*map/i]],
  ["Chinese", "zh/database/animals.html", [/关联数量/, /封闭围栏/, /每日报告/, /(?:绿点.*地图|地图.*绿点)/]],
]) {
  const html = read(relative);
  assert.ok(html.includes(threadUrl), `${label} animal page must expose the exact moderator source`);
  for (const pattern of patterns) assert.match(html, pattern, `${label} animal page is missing ${pattern}`);
}

for (const [label, relative, route, patterns] of [
  ["English", "search-index.json", "/database/animals#chicken", [/daily report/i, /green dots/i]],
  ["Chinese", "zh/search-index.json", "/zh/database/animals#chicken", [/每日报告/, /绿点/]],
]) {
  const result = readJson(relative).find((entry) => entry.url === route);
  assert.ok(result, `${label} chicken search record is missing`);
  for (const pattern of patterns) assert.match(result.description, pattern, `${label} chicken search result is missing ${pattern}`);
}

console.log("PASS: chicken disappearance lookup exposes the official observable checklist in both locales and search.");
