const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const allowedPredicates = new Set(["involves-npc", "takes-place-at", "uses-location"]);
const allowedEvidenceLevels = new Set(["official", "video-observed", "community-confirmed", "unverified-lead", "build-observed"]);
const allowedValidity = new Set(["current", "historical", "unknown"]);
const functionalSurfaces = new Set(["contribute.html", "search.html", "zh/search.html"]);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

function walkHtml(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkHtml(absolute, relative);
    return entry.isFile() && entry.name.endsWith(".html") ? [relative] : [];
  });
}

function stripNavigation(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || "";
  return main
    .replace(/<nav\b[^>]*class="[^"]*\b(?:breadcrumb|toc)\b[^"]*"[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function internalMainLinks(relative) {
  const html = fs.readFileSync(path.join(root, relative), "utf8");
  const main = stripNavigation(html);
  return Array.from(main.matchAll(/<a\b[^>]*\bhref="(\/[^"]+)"/gi), (match) => match[1]);
}

const npcData = readJson("data/npcs.json");
const questData = readJson("data/quests.json");
const locationData = readJson("data/locations.json");
const targets = new Set([
  ...npcData.npcs.map((record) => `npc:${record.id}`),
  ...locationData.locations.map((record) => `location:${record.id}`),
]);
const incoming = new Map();
const invalidReferences = [];
let relationCount = 0;

for (const quest of questData.quests) {
  assert.ok(Array.isArray(quest.relations), `${quest.id} must declare relations`);
  const seen = new Set();
  for (const relation of quest.relations) {
    relationCount += 1;
    const targetKey = `${relation.target?.type}:${relation.target?.id}`;
    const relationKey = `${relation.predicate}:${targetKey}`;
    assert.equal(seen.has(relationKey), false, `${quest.id} duplicates ${relationKey}`);
    seen.add(relationKey);
    assert.ok(allowedPredicates.has(relation.predicate), `${quest.id} uses unsupported predicate ${relation.predicate}`);
    if (!targets.has(targetKey)) invalidReferences.push(`${quest.id} -> ${targetKey}`);
    assert.ok(allowedEvidenceLevels.has(relation.evidenceLevel), `${quest.id} relation lacks a valid evidence level`);
    if (relation.evidenceLevel === 'build-observed') assert.equal(relation.validity, 'unknown', 'Build relationships are not runtime confirmation');
    assert.ok(relation.build, `${quest.id} relation lacks a build`);
    assert.ok(allowedValidity.has(relation.validity), `${quest.id} relation lacks valid validity`);
    assert.ok(Array.isArray(relation.sourceIds) && relation.sourceIds.length > 0, `${quest.id} relation lacks sources`);
    for (const sourceId of relation.sourceIds) {
      assert.ok(questData.sources[sourceId], `${quest.id} relation references missing source ${sourceId}`);
    }
    incoming.set(targetKey, (incoming.get(targetKey) || 0) + 1);
  }
}

assert.deepEqual(invalidReferences, [], `Invalid relationship references: ${invalidReferences.join(", ")}`);

const orphanQuests = questData.quests
  .filter((quest) => quest.relations.length === 0 && quest.relatedRoutes.length === 0)
  .map((quest) => quest.id);
const orphanNpcs = npcData.npcs
  .filter((npc) => !incoming.has(`npc:${npc.id}`) && npc.relatedRoutes.length === 0)
  .map((npc) => npc.id);
const orphanEntities = [...orphanQuests.map((id) => `quest:${id}`), ...orphanNpcs.map((id) => `npc:${id}`)];
assert.deepEqual(orphanEntities, [], `Orphan entities: ${orphanEntities.join(", ")}`);

const typedIsolates = questData.quests
  .filter((quest) => quest.relations.length === 0 && quest.relatedRoutes.length > 0)
  .map((quest) => quest.id);

const noNextStepPages = walkHtml(root)
  .filter((relative) => relative !== "404.html" && internalMainLinks(relative).length === 0)
  .sort();
const expectedFunctionalSurfaces = noNextStepPages.filter((relative) => functionalSurfaces.has(relative));
const contentNavigationGaps = noNextStepPages.filter((relative) => !functionalSurfaces.has(relative));

console.log(`PASS: relationship graph - ${questData.quests.length} quests, ${npcData.npcs.length} NPCs, ${relationCount} relations, ${invalidReferences.length} invalid references, ${orphanEntities.length} orphan entities.`);
console.log(`INFO: typed isolates with reading routes - ${typedIsolates.join(", ") || "none"}.`);
console.log(`INFO: expected functional surfaces without next-step links - ${expectedFunctionalSurfaces.join(", ") || "none"}.`);
console.log(`INFO: content pages without next-step links - ${contentNavigationGaps.join(", ") || "none"}.`);
