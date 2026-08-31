const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const threadUrl = "https://steamcommunity.com/app/1501310/discussions/0/797837596195642212/";

const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const readJson = (relative) => JSON.parse(read(relative));

const quests = readJson("data/quests.json");
const quest = quests.quests.find((entry) => entry.id === "feathered-foes");
assert.ok(quest, "Feathered Foes quest is missing");
assert.equal(quests.sources["scarecrow-workbench-official-thread"]?.url, threadUrl, "official moderator source is missing");
assert.equal(quests.sources["owned-build-plantations-recipes"]?.build, "0.8.10.842", "current-build recipe source is missing");

const officialFact = quest.facts.find((fact) => fact.sourceIds.includes("scarecrow-workbench-official-thread"));
const buildFact = quest.facts.find((fact) => fact.sourceIds.includes("owned-build-plantations-recipes"));
assert.ok(officialFact, "quest needs the official ordinary-Scarecrow answer");
assert.ok(buildFact, "quest needs separate current-build corroboration");
assert.deepEqual(officialFact.sourceIds, ["scarecrow-workbench-official-thread"], "historical official guidance must keep its own source boundary");
assert.equal(officialFact.build, "pre-EA-2026-03", "official guidance must retain its historical build context");
assert.equal(officialFact.validity, "historical", "official guidance must not inherit current-build validity");
assert.deepEqual(buildFact.sourceIds, ["owned-build-plantations-recipes"], "current-build recipe fact must keep its own source boundary");
assert.equal(buildFact.build, "0.8.10.842");
assert.match(buildFact.text, /does not require a workbench/i, "current-build fact must explain why the ordinary variant breaks the deadlock");
assert.match(buildFact.text, /does not establish.*unlock timing/i, "current-build fact must not invent an unlock moment");
assert.match(buildFact.zhText, /普通稻草人.*不需要工作台/, "Chinese current-build answer is missing");

const guideNote = quest.buildGuide.notes.find((note) => /ordinary Scarecrow.*not Bob/i.test(note.text));
assert.ok(guideNote, "quest steps need the workbench deadlock note");

for (const [label, relative, textPattern, recipeRoute] of [
  ["English", "database/quests.html", /ordinary Scarecrow, not Bob the Scarecrow/i, "/guides/crafting-guide#recipe-prop_Scarecrow_00"],
  ["Chinese", "zh/database/quests.html", /普通稻草人，不要制作稻草人鲍勃/, "/zh/guides/crafting-guide#recipe-prop_Scarecrow_00"],
]) {
  const html = read(relative);
  assert.match(html, textPattern, `${label} quest page is missing the workbench answer`);
  assert.ok(html.includes(threadUrl), `${label} quest page must expose the exact official source`);
  assert.ok(html.includes(`href="${recipeRoute}"`), `${label} quest page must link the ordinary Scarecrow recipe`);
}

for (const [label, relative, route, textPattern] of [
  ["English", "search-index.json", "/database/quests#feathered-foes", /does not require a workbench/i],
  ["Chinese", "zh/search-index.json", "/zh/database/quests#feathered-foes", /不需要工作台/],
]) {
  const result = readJson(relative).find((entry) => entry.url === route);
  assert.ok(result, `${label} search result for Feathered Foes is missing`);
  assert.match(result.description, textPattern, `${label} search result must include the direct workbench answer`);
}

console.log("PASS: Feathered Foes explains the ordinary Scarecrow workbench route with current-build corroboration.");
