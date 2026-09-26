const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const searchCore = require("../assets/js/search-core.js");

for (const locale of ["en", "zh"]) {
  const prefix = locale === "zh" ? "zh/" : "";
  const guide = fs.readFileSync(path.join(root, prefix, "guides/electricity-power.html"), "utf8");
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, "search-index.json"), "utf8"));
  const answer = guide.match(/<details\b[^>]*id="finding-victor"[\s\S]*?<\/details>/)?.[0];
  assert.ok(answer, `${locale}: Victor troubleshooting answer must have a searchable stable anchor`);
  const lead = guide.match(/<p class="equipment-lead">[\s\S]*?<\/p>/)?.[0] ?? "";
  const checklist = guide.match(/<section class="answer-box" id="start-power">[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(`${lead}${checklist}`, /href="#finding-victor"/, `${locale}: players sent to Victor must have a direct link to the hours answer before the long reference section`);
  assert.match(answer, /data-search-entry/, `${locale}: Victor troubleshooting answer must be indexed`);
  assert.match(answer, /steamcommunity\.com\/app\/1501310\/discussions\/0\/590686595451177771/, `${locale}: City Hall hours must link to its source thread`);
  const authorCard = guide.match(/<aside class="author-card"[\s\S]*?<\/aside>/)?.[0];
  assert.ok(authorCard, `${locale}: guide author/review information must be present`);
  assert.match(authorCard, locale === "zh" ? /最近复核：2026 年 9 月 \d{1,2} 日/ : /Last reviewed: September \d{1,2}, 2026/, `${locale}: guide review date must match the September 2026 content review`);
    assert.match(answer, locale === "zh" ? /2026 年 8 月 15 日/ : /Aug\. 15, 2026/, `${locale}: answer must date its community-source guidance`);
  if (locale === "en") {
    assert.match(answer, /City Hall closes at 18:00/i, "English answer must state the moderator-confirmed closing time");
    assert.match(answer, /(?:door|entrance).{0,100}(?:opening and closing hours|hours and days)/i, "English answer must tell players where to check open days and hours");
    assert.match(answer, /arrives a little later/i, "English answer must distinguish Victor's arrival from building opening");
    assert.match(answer, /9:30.{0,80}(?:single player|unverified|not a confirmed schedule)/i, "English answer must not present the reported arrival time as official");
    assert.ok(searchCore.searchDocuments(index, "Victor missing City Hall hours", 10).some(result => result.url === "/guides/electricity-power#finding-victor"), "English search must surface the direct Victor-hours answer");
  } else {
    assert.match(answer, /市政厅.{0,25}18:00.{0,10}关闭/, "Chinese answer must state the moderator-confirmed closing time");
    assert.match(answer, /门口.{0,35}(?:开放日期|开放时间|营业时段)/, "Chinese answer must tell players where to check open days and hours");
    assert.match(answer, /Victor.{0,60}(?:开门时间|开放时间).{0,15}(?:稍晚|晚些|之后)/, "Chinese answer must distinguish Victor's arrival from building opening");
    assert.match(answer, /9:30.{0,80}(?:单个玩家|未验证|未经确认)/, "Chinese answer must not present the reported arrival time as official");
    assert.ok(searchCore.searchDocuments(index, "Victor 市政厅 不在 营业时间", 10).some(result => result.url === "/zh/guides/electricity-power#finding-victor"), "Chinese search must surface the direct Victor-hours answer");
  }
}

console.log("PASS: Victor's City Hall availability answer is directly searchable, source-linked, and separates the moderator's 18:00 close from unverified player timing.");
