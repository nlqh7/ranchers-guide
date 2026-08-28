const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

// Version semantics: the site's current baseline build and the build on which
// evidence was observed are different fields and must never be merged again.

const BASELINE = "0.8.10.842";
const VIDEO_BUILD = "0.8.10.455";

// Historical hotfixes may appear in a dated fix list, but never as the
// current page baseline. Keep this guard broad enough to catch a future
// stale label without rejecting legitimate historical evidence paragraphs.
const indexablePages = [
  "index.html",
  "guides/building-construction.html",
  "guides/resources-and-materials.html",
  "guides/money-making.html",
  "guides/beginner-mistakes.html",
  "guides/release-time-checklist.html",
  "updates.html",
  "zh/index.html",
  "zh/guides/building-construction.html",
  "zh/guides/resources-and-materials.html",
  "zh/guides/money-making.html",
  "zh/updates.html",
];
for (const page of indexablePages) {
  const html = read(page);
  assert.doesNotMatch(
    html,
    /(?:Current (?:page )?baseline|Current version(?: reviewed)?|当前(?:页面)?基线|当前(?:复核)?版本)[^<\n]{0,80}0\.8\.10\.562/i,
    `${page} must not label historical 0.8.10.562 as current`
  );
}

// 1. Data layers declare the two builds separately.
for (const dataFile of ["data/crops.json", "data/animals.json"]) {
  const meta = JSON.parse(read(dataFile)).meta;
  assert.equal(meta.build, BASELINE, `${dataFile} meta.build is the current page baseline`);
  assert.equal(meta.videoBuild, VIDEO_BUILD, `${dataFile} meta.videoBuild is the observation build`);
}

// 2. Generated database pages: video evidence must be attached to the
//    observation build, never to the current baseline.
const cropsPage = read("database/crops.html");
const animalsPage = read("database/animals.html");
const zhCropsPage = read("zh/database/crops.html");
const zhAnimalsPage = read("zh/database/animals.html");

for (const [name, html] of [["database/crops.html", cropsPage], ["database/animals.html", animalsPage]]) {
  assert.match(html, new RegExp(`recorded on build ${VIDEO_BUILD.replaceAll(".", "\\.")}`), `${name} labels video evidence with the observation build`);
  assert.doesNotMatch(html, new RegExp(`[Vv]ideo-[Oo]bserved [a-z ]+\\(build ${BASELINE.replaceAll(".", "\\.")}\\)`), `${name} must not label a video section with the baseline build`);
  assert.doesNotMatch(html, new RegExp(`video footage (recorded on|from) (build )?${BASELINE.replaceAll(".", "\\.")}`), `${name} must not claim footage was recorded on the baseline build`);
  assert.doesNotMatch(html, new RegExp(`${BASELINE.replaceAll(".", "\\.")} video footage`), `${name} must not claim baseline-build footage`);
  assert.match(html, new RegExp(`Current page baseline ${BASELINE.replaceAll(".", "\\.")}`), `${name} states the current baseline`);
}
for (const [name, html] of [["zh/database/crops.html", zhCropsPage], ["zh/database/animals.html", zhAnimalsPage]]) {
  assert.match(html, new RegExp(`视频证据录制于 ${VIDEO_BUILD.replaceAll(".", "\\.")}`), `${name} labels video evidence with the observation build`);
  assert.match(html, new RegExp(`页面基线 ${BASELINE.replaceAll(".", "\\.")}`), `${name} states the current baseline`);
  assert.doesNotMatch(html, new RegExp(`视频证据录制于 ${BASELINE.replaceAll(".", "\\.")}`), `${name} must not tie video evidence to the baseline build`);
  assert.doesNotMatch(html, new RegExp(`${BASELINE.replaceAll(".", "\\.")}[^<]{0,20}(画面|实况| footage)`), `${name} must not claim baseline-build footage`);
}
assert.doesNotMatch(cropsPage, /current-build 0\.8\.10\.842 video footage/, "crops conflict note must not claim 0.8.10.842 footage");

// 3. problems.html tracker keeps the build in which each issue was reported.
const problemsHub = read("problems.html");
const roofRow = problemsHub.match(/<tr><td><a href="\/guides\/roof-quest-stuck"[\s\S]*?<\/tr>/);
assert.ok(roofRow, "roof quest row exists in the problems tracker");
assert.match(roofRow[0], /<td>0\.8\.10\.455<\/td>/, "roof quest was reported on 0.8.10.455, not the current baseline");
const animalFixRow = problemsHub.match(/<tr><td><a href="\/guides\/animal-guide#troubleshooting"[\s\S]*?<\/tr>/);
assert.ok(animalFixRow, "animal disappearance fix row exists");
assert.match(animalFixRow[0], /Fixed in 0\.8\.10\.562/, "officially fixed animal row keeps its historical 0.8.10.562 fix marker");

// 4. field-notes client script must not resurrect the old build literal.
const fieldNotesScript = read("assets/js/field-notes.js");
assert.doesNotMatch(fieldNotesScript, /0\.8\.10\.455/, "field-notes.js must not contain the old build literal");
assert.match(fieldNotesScript, /0\.8\.10\.842/, "field-notes.js defaults to the current build");

// 5. Farming advice must stay inside the exact scope of its evidence.
const farmingEnglish = read("guides/farming-fields.html");
const farmingChinese = read("zh/guides/farming-fields.html");
const moneyEnglish = read("guides/money-making.html");
const moneyChinese = read("zh/guides/money-making.html");
assert.match(moneyEnglish, /Current version reviewed: <strong>0\.8\.10\.842<\/strong>/, "English money guide must use the current baseline");
assert.doesNotMatch(moneyEnglish, /Current version reviewed: <strong>0\.8\.10\.562<\/strong>/, "English money guide must not present the historical hotfix as current");
assert.match(moneyChinese, /当前复核版本：<strong>0\.8\.10\.842<\/strong>/, "Chinese money guide must use the current baseline");
assert.match(farmingEnglish, /watering interval for a planted crop is still unverified/i, "English farming guide must not infer planted-crop watering from empty plots");
assert.doesNotMatch(farmingEnglish, /watering is a "every few days|Water every few days/i, "English farming guide must not publish an unsupported watering schedule");
assert.match(farmingChinese, /已种作物多久浇一次仍未验证/, "Chinese farming guide must not infer planted-crop watering from empty plots");
assert.doesNotMatch(farmingChinese, /不用每天浇水|几天浇一次即可/, "Chinese farming guide must not publish an unsupported watering schedule");
assert.match(farmingEnglish, /exact cutoff as a reported rule until it is reproduced/i, "English farming guide must keep the day-30 cutoff at reported status");
assert.match(farmingChinese, /30 号最后收、1 号换季.*尚未独立复现/, "Chinese farming guide must keep the day-30 cutoff at reported status");
assert.match(farmingEnglish, /omission from patch notes is not proof/i, "English fertilizer advice must distinguish patch-note omission from a verified current result");
assert.match(farmingChinese, /补丁说明没写不能证明行为一定没变/, "Chinese fertilizer advice must distinguish patch-note omission from a verified current result");
assert.doesNotMatch(problemsHub, /0\.8\.10\.455\+/, "problem report builds must not imply unverified forward compatibility");

// 6. Launch-vs-current timeline on utility guides: launch baseline plus a
//    separate current-version statement.
for (const page of ["guides/building-construction.html"]) {
  const html = read(page);
  assert.match(html, /July 30, 2026 Early Access build \(launch\/video baseline <strong>0\.8\.10\.455<\/strong>\)/, `${page} keeps the launch/video baseline`);
  assert.match(html, /Current official version:[\s\S]{0,120}0\.8\.10\.842/, `${page} states the current official version separately`);
}
for (const [page, current, historical] of [
  ['guides/electricity-power.html', /Current official version:[\s\S]{0,60}0\.8\.10\.842/, /Historical contract[\s\S]{0,130}0\.8\.10\.455[\s\S]{0,80}not retested/],
  ['zh/guides/electricity-power.html', /当前官方版本：[\s\S]{0,60}0\.8\.10\.842/, /历史观测基准[\s\S]{0,60}0\.8\.10\.455[\s\S]{0,60}不代表已在当前版本重新实测/]
]) {
  const note = read(page).split('id="utility-version-notes"')[1]?.split('</p>')[0];
  assert.ok(note, `${page} keeps source-version context outside the lookup`);
  assert.match(note, current);
  assert.match(note, historical);
}

// 7. Gigi quest: door-delivery bug is not claimed as officially fixed.
for (const [page, fixedBadge] of [["guides/gigi-large-egg-quest.html", /Fixed in 0\.8\.10\.562 · Official[\s\S]{0,200}coop door/], ["zh/guides/gigi-large-egg-quest.html", /0\.8\.10\.562 已修复 · 官方[\s\S]{0,200}门口/]]) {
  assert.doesNotMatch(read(page), fixedBadge, `${page} must not claim the coop-door delivery path is officially fixed`);
}
assert.match(read("guides/gigi-large-egg-quest.html"), /do <strong>not<\/strong> explicitly say whether the door-delivery path/, "English Gigi page scopes the official fix to chick growth");
assert.match(read("zh/guides/gigi-large-egg-quest.html"), /并未明确下面这条"门口交付"路径是否也被涵盖/, "Chinese Gigi page scopes the official fix to chick growth");

console.log("PASS: version semantics — baseline build and observed-evidence build stay separate.");
