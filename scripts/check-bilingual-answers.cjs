const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const clean = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function checkFactPairs(dataset, recordsKey, label) {
  for (const record of dataset[recordsKey]) {
    assert.ok(record.summary && record.zhSummary, `${label}:${record.id} needs bilingual summaries`);
    if (record.whenNeeded || record.zhWhenNeeded) {
      assert.ok(record.whenNeeded && record.zhWhenNeeded, `${label}:${record.id} needs bilingual decision guidance`);
    }
    assert.equal(record.facts.length, record.facts.filter((fact) => fact.zhText).length, `${label}:${record.id} has an untranslated fact`);
  }
}

checkFactPairs(readJson("data/materials.json"), "materials", "material");
checkFactPairs(readJson("data/npcs.json"), "npcs", "npc");
checkFactPairs(readJson("data/quests.json"), "quests", "quest");

const buildings = readJson("data/building-checklists.json");
assert.ok(Object.keys(buildings.sources || {}).length > 0, "building checklist needs a source registry");
for (const building of buildings.targets) {
  assert.ok(building.summary && building.zhSummary, `building:${building.id} needs bilingual summaries`);
  assert.ok(Array.isArray(building.facts) && building.facts.length > 0, `building:${building.id} needs a bounded answer fact`);
  assert.ok(building.relatedRoutes?.length, `building:${building.id} needs related routes`);
  for (const fact of building.facts) {
    assert.ok(fact.text && fact.zhText, `building:${building.id} has an untranslated fact`);
    assert.ok(fact.sourceIds?.length, `building:${building.id} fact needs a source`);
    for (const sourceId of fact.sourceIds) assert.ok(buildings.sources[sourceId], `building:${building.id} references missing source ${sourceId}`);
  }
}

const animals = readJson("data/animals.json");
for (const animal of animals.species) {
  assert.ok(animal.summary && animal.zh?.summary, `animal:${animal.id} needs bilingual answer summaries`);
  assert.ok(animal.whenNeeded && animal.zh?.whenNeeded, `animal:${animal.id} needs bilingual lookup guidance`);
  assert.ok(Array.isArray(animal.zh.groups) && animal.zh.groups.length > 0, `animal:${animal.id} needs Chinese answer groups`);
}

const crops = readJson("data/crops.json");
for (const crop of crops.crops) {
  assert.ok(crop.summary && crop.zh?.summary, `crop:${crop.id} needs bilingual answer summaries`);
  assert.ok(crop.decision && crop.zh?.decision, `crop:${crop.id} needs bilingual decision guidance`);
  assert.ok(Array.isArray(crop.zh.groups) && crop.zh.groups.length > 0, `crop:${crop.id} needs Chinese answer groups`);
}
for (const input of crops.inputs) {
  assert.ok(input.name && input.zh?.name, `input:${input.id} needs bilingual identity`);
  assert.ok(input.summary && input.zh?.summary, `input:${input.id} needs bilingual answer summaries`);
  assert.ok(Array.isArray(input.zh.groups) && input.zh.groups.length > 0, `input:${input.id} needs Chinese answer groups`);
}

const locations = readJson("data/locations.json");
for (const location of locations.locations) {
  const en = location.locale?.en;
  const zh = location.locale?.zh;
  assert.ok(en?.title && en?.keywords, `${location.id} needs an English location identity`);
  assert.ok(zh?.title && zh?.keywords, `${location.id} needs a Chinese location identity`);
  assert.match(zh.keywords, /[\u3400-\u9fff]/, `${location.id} needs Chinese location search keywords`);
  assert.notEqual(zh.keywords, en.keywords, `${location.id} must not reuse English-only location search keywords`);
  assert.ok(zh.summary && zh.summary.length >= 24, `${location.id} needs a Chinese answer summary`);
  assert.notEqual(clean(zh.summary), clean(en.entryHtml), `${location.id} must not fall back to English map copy`);
}

function locationEntries(html) {
  return new Map([...html.matchAll(/<article data-location-entry[\s\S]*?id="([^"]+)"[\s\S]*?<\/article>/g)].map((match) => [match[1], match[0]]));
}

function cardLinks(html) {
  return [...html.matchAll(/<a class="card-link" href="([^"]+)"/g)].map((match) => match[1]);
}

const englishLocations = locationEntries(fs.readFileSync(path.join(root, "map.html"), "utf8"));
const chineseLocations = locationEntries(fs.readFileSync(path.join(root, "zh", "map.html"), "utf8"));
assert.deepEqual([...englishLocations.keys()], [...chineseLocations.keys()], "English and Chinese map directories must keep the same location order");
for (const [id, englishEntry] of englishLocations) {
  const englishLinks = cardLinks(englishEntry);
  const chineseLinks = cardLinks(chineseLocations.get(id));
  assert.equal(chineseLinks.length, englishLinks.length, `${id} lost a related map link in Chinese`);
  englishLinks.forEach((href, index) => {
    const expected = href.startsWith("/") ? `/zh${href}` : href;
    assert.equal(chineseLinks[index], expected, `${id} has an unmatched Chinese related link`);
  });
}

for (const relative of ["knowledge-index.json", "zh/knowledge-index.json"]) {
  const payload = readJson(relative);
  const locale = payload.locale;
  for (const location of locations.locations) {
    const entity = payload.entities.find((candidate) => candidate.id === `location:${location.id}`);
    assert.ok(entity, `${relative} is missing location:${location.id}`);
    assert.ok(entity.summary, `${relative} location:${location.id} needs an answer summary`);
    assert.match(entity.route, locale === "zh" ? /^\/zh\/map#/ : /^\/map#/);
    assert.ok(Array.isArray(entity.journey), `${relative} location:${location.id} needs journey metadata`);
  }
}

console.log(`PASS: bilingual entity answers cover materials, NPCs, quests, ${animals.species.length} animals, ${crops.crops.length + crops.inputs.length} crop/input records and ${locations.locations.length} map entities.`);
