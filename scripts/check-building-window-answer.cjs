const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourceUrl = "https://steamcommunity.com/app/1501310/discussions/0/590686908802160454/";

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function readJson(relative) {
  return JSON.parse(read(relative));
}

function section(html, id) {
  const match = html.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`));
  assert.ok(match, `${id} answer section is missing`);
  return match[0];
}

const english = read("guides/building-construction.html");
const chinese = read("zh/guides/building-construction.html");
const enAnswer = section(english, "find-windows");
const zhAnswer = section(chinese, "find-windows");

for (const [label, page, answer] of [
  ["English", english, enAnswer],
  ["Chinese", chinese, zhAnswer],
]) {
  assert.match(page, /href="#find-windows"/, `${label} table of contents must link the answer`);
  assert.match(answer, /data-search-entry/, `${label} answer must be independently searchable`);
  assert.match(answer, /data-search-status="(?:Official answer|官方答复)"/, `${label} search result must retain official evidence status`);
  assert.match(answer, /href="#recipe-House_Window_01"/, `${label} answer must link the current-build Window recipe`);
  assert.ok(page.includes(sourceUrl), `${label} page must cite the exact moderator discussion`);
}

assert.match(enAnswer, /workbench/i, "English answer must identify the workbench");
assert.match(enAnswer, /scroll (?:horizontally|across)/i, "English answer must explain horizontal scrolling");
assert.match(enAnswer, /red blinds/i, "English answer must include the moderator's visual cue");
assert.match(enAnswer, /does not confirm[^.]*unlock[^.]*placement/i, "English answer must bound what the source proves");

assert.match(zhAnswer, /工作台/, "Chinese answer must identify the workbench");
assert.match(zhAnswer, /横向滚动/, "Chinese answer must explain horizontal scrolling");
assert.match(zhAnswer, /红色百叶窗/, "Chinese answer must include the moderator's visual cue");
assert.match(zhAnswer, /不能证明[^。]*解锁[^。]*放置/, "Chinese answer must bound what the source proves");

for (const [label, relative, url] of [
  ["English", "search-index.json", "/guides/building-construction#find-windows"],
  ["Chinese", "zh/search-index.json", "/zh/guides/building-construction#find-windows"],
]) {
  const matches = readJson(relative).filter((entry) => entry.url === url);
  assert.equal(matches.length, 1, `${label} search index must contain exactly one window answer`);
}

console.log("PASS: bilingual workbench window answer is searchable, source-linked and bounded.");
