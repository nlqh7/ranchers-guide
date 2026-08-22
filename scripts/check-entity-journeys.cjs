const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const knownRoutes = new Set([
  ...[...sitemap.matchAll(/<loc>https:\/\/theranchersguide\.com([^<]*)<\/loc>/g)].map((match) => match[1] || "/"),
  "/tools/ranch-checklist",
  "/zh/tools/ranch-checklist",
]);

const plans = [
  ["animal:chicken", 5],
  ["location:city-hall", 5],
  ["location:leafy-market", 3],
  ["location:bykii-terminal", 3],
  ["location:vehicle-dealers", 2],
  ["location:quickfix", 2],
  ["location:car-pound", 2],
  ["location:cash-in-box", 2],
  ["location:train-station", 1],
  ["location:transit-posts", 2],
  ["material:hay", 3],
  ["material:stone", 3],
  ["material:wood-log", 3],
  ["material:charcoal", 3],
  ["npc:angela", 4],
  ["npc:victor", 4],
  ["npc:gigi", 4],
  ["quest:chicken-coop-mission", 4],
  ["quest:power-to-the-bench", 4],
  ["material:zirconite", 4],
  ["animal:cow", 3],
  ["animal:goat", 3],
  ["animal:rabbit", 3],
];

const answerCardCoverage = [
  ["animal:chicken", 5],
  ["material:hay", 2],
  ["npc:victor", 3],
  ["location:city-hall", 0],
  ["material:zirconite", 2],
];

const requiredJourneyRoutes = {
  "location:city-hall": [
    "/database/npcs#victor",
    "/database/quests#power-to-the-bench",
    "/guides/electricity-power#two-paths",
    "/database/materials#zirconite",
  ],
  "location:cash-in-box": [
    "/guides/money-making#cashin",
    "/database/crops#cashin",
  ],
};

for (const relative of ["knowledge-index.json", "zh/knowledge-index.json"]) {
  const payload = JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
  const locale = payload.locale;
  for (const [id, minimum] of plans) {
    const entity = payload.entities.find((candidate) => candidate.id === id);
    assert.ok(entity, `${relative} is missing ${id}`);
    if (answerCardCoverage.some(([coverageId]) => coverageId === id)) {
      assert.ok(entity.summary, `${relative} ${id} needs an answer-card summary`);
      assert.ok(entity.sources.length > 0 || id === "location:city-hall", `${relative} ${id} needs a source-backed answer card`);
      const [coverageId, minimumFacts] = answerCardCoverage.find(([coverageId]) => coverageId === id);
      assert.ok(entity.facts.length >= minimumFacts, `${relative} ${coverageId} needs at least ${minimumFacts} answer facts`);
    }
    assert.ok(Array.isArray(entity.journey) && entity.journey.length >= minimum, `${relative} ${id} needs at least ${minimum} journey steps`);
    for (const expectedRoute of requiredJourneyRoutes[id] || []) {
      assert.ok(entity.journey.some((step) => step.href.replace(/^\/zh/, "") === expectedRoute), `${relative} ${id} is missing journey route ${expectedRoute}`);
    }
    for (const step of entity.journey) {
      assert.ok(step.href && step.label && step.reason, `${relative} ${id} has incomplete journey metadata`);
      assert.ok(knownRoutes.has(step.href.split(/[?#]/)[0]), `${relative} ${id} points to missing route ${step.href}`);
      assert.match(step.href, locale === "zh" ? /^\/zh\// : /^\/(?!zh\/)/, `${relative} ${id} has the wrong locale route`);
    }
    assert.equal(new Set(entity.journey.map((step) => step.href)).size, entity.journey.length, `${relative} ${id} has duplicate journey routes`);
  }
}

const search = fs.readFileSync(path.join(root, "assets/js/search.js"), "utf8");
assert.match(search, /knowledge-dossier-journey/);
assert.match(search, /Continue solving this/);
assert.match(search, /继续解决这个问题/);
console.log("PASS: audited animal, location, material, NPC and quest entities expose bilingual, route-checked journeys in search dossiers.");
