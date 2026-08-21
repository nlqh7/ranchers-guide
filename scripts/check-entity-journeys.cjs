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
  ["location:city-hall", 4],
  ["location:leafy-market", 3],
  ["location:bykii-terminal", 3],
  ["material:hay", 3],
  ["npc:angela", 4],
  ["npc:victor", 4],
  ["npc:gigi", 4],
  ["quest:chicken-coop-mission", 4],
  ["quest:power-to-the-bench", 4],
  ["material:zirconite", 4],
];

for (const relative of ["knowledge-index.json", "zh/knowledge-index.json"]) {
  const payload = JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
  const locale = payload.locale;
  for (const [id, minimum] of plans) {
    const entity = payload.entities.find((candidate) => candidate.id === id);
    assert.ok(entity, `${relative} is missing ${id}`);
    assert.ok(Array.isArray(entity.journey) && entity.journey.length >= minimum, `${relative} ${id} needs at least ${minimum} journey steps`);
    for (const step of entity.journey) {
      assert.ok(step.href && step.label && step.reason, `${relative} ${id} has incomplete journey metadata`);
      assert.ok(knownRoutes.has(step.href.split(/[?#]/)[0]), `${relative} ${id} points to missing route ${step.href}`);
      assert.match(step.href, locale === "zh" ? /^\/zh\// : /^\/(?!zh\/)/, `${relative} ${id} has the wrong locale route`);
    }
  }
}

const search = fs.readFileSync(path.join(root, "assets/js/search.js"), "utf8");
assert.match(search, /knowledge-dossier-journey/);
assert.match(search, /Continue solving this/);
assert.match(search, /继续解决这个问题/);
console.log("PASS: audited animal, location, material, NPC and quest entities expose bilingual, route-checked journeys in search dossiers.");
