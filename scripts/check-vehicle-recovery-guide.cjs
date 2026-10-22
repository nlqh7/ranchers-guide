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

// Roof/wall answer regression: official 0.8.10.868/.871 corrections in the building guides.
const buildingGuideEn = fs.readFileSync(path.join(root, "guides/building-construction.html"), "utf8");
const buildingGuideZh = fs.readFileSync(path.join(root, "zh/guides/building-construction.html"), "utf8");
const roofQuestEn = fs.readFileSync(path.join(root, "guides/roof-quest-stuck.html"), "utf8");
const roofQuestZh = fs.readFileSync(path.join(root, "zh/guides/roof-quest-stuck.html"), "utf8");

function answerSection(html, id, label) {
  const match = html.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`));
  assert.ok(match, `${label}: section #${id} is missing`);
  return match[0];
}

function assertShortParagraphs(section, label) {
  const paragraphs = section.match(/<p>[\s\S]*?<\/p>/g) || [];
  assert.ok(paragraphs.length >= 3, `${label}: answer should stay scannable`);
  for (const paragraph of paragraphs) {
    const text = paragraph.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    assert.ok(text.length <= 240, `${label}: paragraph exceeds 240 characters (${text.length})`);
  }
}

const enRoofWall = answerSection(buildingGuideEn, "roof-wall-answers", "English building guide");
const zhRoofWall = answerSection(buildingGuideZh, "roof-wall-answers", "Chinese building guide");

for (const [label, html] of [["English building guide", buildingGuideEn], ["Chinese building guide", buildingGuideZh]]) {
  assert.match(html, /href="#roof-wall-answers"/, `${label}: TOC must link the roof/wall answer`);
  assert.match(html, /1843481262701719/, `${label}: cite the official .868 announcement`);
  assert.match(html, /1844115010489002/, `${label}: cite the official .871 announcement`);
}

assert.match(enRoofWall, /data-search-entry/, "English roof/wall answer must be independently searchable");
assert.match(enRoofWall, /Roof Extensions? extend an existing roof/i, "English: distinguish Roof from Roof Extension");
assert.match(enRoofWall, /directly above walls/i, "English: roofs are placed directly above walls");
assert.match(enRoofWall, /Farewell, Nylon and Palace[\s\S]*Wall with Big Window[\s\S]*only an Exterior Wall/i, "English: named quest-only Big Window exception");
assert.match(enRoofWall, /first roof placement/i, "English: .871 first-placement roof tutorial");
assert.match(enRoofWall, /href="\/guides\/roof-quest-stuck"/, "English: link the roof quest checklist");
assert.match(enRoofWall, /href="\/problems\/failed-quest-replay"/, "English: link the failed-quest path");
assert.match(enRoofWall, /[Gg]rid behavior[\s\S]*unverified/, "English: grid compatibility stays explicitly unverified");
assert.doesNotMatch(enRoofWall, /no official part rules exist/i, "English: no blanket denial of official part rules");
assertShortParagraphs(enRoofWall, "English roof/wall answer");

assert.match(zhRoofWall, /data-search-entry/, "Chinese roof/wall answer must be independently searchable");
assert.match(zhRoofWall, /屋顶延伸[\s\S]*现有屋顶/, "Chinese: distinguish roof from extension");
assert.match(zhRoofWall, /墙体正上方/, "Chinese: roofs are placed directly above walls");
assert.match(zhRoofWall, /再见，尼龙帐篷[\s\S]*带大窗户[\s\S]*普通外墙/, "Chinese: named quest-only Big Window exception");
assert.match(zhRoofWall, /第一次放置屋顶|首次放置屋顶/, "Chinese: .871 first-placement roof tutorial");
assert.match(zhRoofWall, /href="\/zh\/guides\/roof-quest-stuck"/, "Chinese: link the roof quest checklist");
assert.match(zhRoofWall, /href="\/problems\/failed-quest-replay"/, "Chinese: link the failed-quest path");
assert.match(zhRoofWall, /网格[\s\S]*未确认|未确认[\s\S]*网格/, "Chinese: grid compatibility stays explicitly unverified");
assertShortParagraphs(zhRoofWall, "Chinese roof/wall answer");

for (const [label, html] of [["English roof quest", roofQuestEn], ["Chinese roof quest", roofQuestZh]]) {
  assert.match(html, /<!-- ROOF QUEST CHECKLIST:START -->[\s\S]*<!-- ROOF QUEST CHECKLIST:END -->/, `${label}: generated checklist markers preserved`);
  assert.equal((html.match(/data-roof-objective="\d+"/g) || []).length, 10, `${label}: all 10 original objectives preserved`);
  const checklistEnd = html.indexOf("ROOF QUEST CHECKLIST:END");
  const symptomA = html.indexOf('id="symptom-a"');
  const note = html.indexOf('id="official-roof-updates"');
  assert.ok(note > checklistEnd && (symptomA === -1 || note < symptomA), `${label}: official update note sits beside the generated checklist`);
  assert.match(html, /href="#official-roof-updates"/, `${label}: TOC must link the official update note`);
  assert.match(html, /1843481262701719/, `${label}: cite the official .868 announcement`);
  assert.match(html, /1844115010489002/, `${label}: cite the official .871 announcement`);
  assert.match(html, /0\.8\.10\.842/, `${label}: older recorded configuration stays labeled`);
  assert.match(html, /Wall with Big Window|带大窗户/, `${label}: name the .868 Big Window exception`);
  assert.match(html, /first roof placement|第一次放置屋顶|首次放置屋顶/, `${label}: name the .871 first-placement tutorial`);
  assert.doesNotMatch(html, /demolish your house|abandon the quest|拆掉房子|放弃任务/i, `${label}: no destructive recovery instructions`);
}

for (const [label, relative, url] of [
  ["English", "search-index.json", "/guides/building-construction#roof-wall-answers"],
  ["Chinese", "zh/search-index.json", "/zh/guides/building-construction#roof-wall-answers"],
]) {
  const entries = JSON.parse(fs.readFileSync(path.join(root, relative), "utf8")).filter((entry) => entry.url === url);
  assert.equal(entries.length, 1, `${label}: search index must contain exactly one roof/wall answer`);
}

console.log("PASS: vehicle, transit and quest-replay source boundaries are current and scoped.");
