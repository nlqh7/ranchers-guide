/* Build the search-page knowledge dossiers from the existing typed datasets. */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkOnly = process.argv.includes("--check");

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, "data", file), "utf8"));
}

function routeWithLocale(route, locale) {
  const base = route.split(/[?#]/)[0];
  const suffix = route.slice(base.length);
  if (locale !== "zh") return route;
  if (base === "/map") return `/zh/map${suffix}`;
  if (base === "/tools/chicken-troubleshooter") return `/zh/tools/chicken-troubleshooter${suffix}`;
  if (/^\/(?:guides|problems|database)\//.test(base)) return `/zh${base}${suffix}`;
  return route;
}

function routeForType(type, id, locale) {
  const prefix = locale === "zh" ? "/zh" : "";
  if (type === "location") return `${prefix}/map#${id}`;
  return `${prefix}/database/${type === "npc" ? "npcs" : type === "quest" ? "quests" : `${type}s`}#${id}`;
}

const routeLabels = {
  "/guides/electricity-power#two-paths": { en: "Electricity contracts & power", zh: "水电合同与供电" },
  "/guides/electricity-power#solar-quest": { en: "Solar objective checklist", zh: "太阳能目标检查清单" },
  "/guides/animal-guide#getting": { en: "Bring chickens home", zh: "把鸡运回家" },
  "/tools/chicken-troubleshooter": { en: "Chicken troubleshooter", zh: "养鸡排查工具" },
  "/guides/roof-quest-stuck#flow": { en: "Roof objective decision flow", zh: "屋顶目标分类排查" },
  "/guides/building-construction": { en: "Building guide", zh: "建造指南" },
  "/problems/failed-quest-replay": { en: "Failed quest recovery", zh: "失败任务恢复" },
  "/problems/vehicle-recovery": { en: "Vehicle recovery", zh: "车辆找回" },
  "/guides/gigi-large-egg-quest": { en: "Gigi large-egg route", zh: "Gigi 大鸡蛋路线" },
  "/guides/police-wanted-levels": { en: "Police chase and wanted levels", zh: "警察追捕与警星" },
};

function labelForType(type, locale) {
  const labels = {
    en: { animal: "Animal", crop: "Crop", material: "Material", npc: "NPC", quest: "Quest", location: "Location" },
    zh: { animal: "动物", crop: "作物", material: "材料", npc: "NPC", quest: "任务", location: "地点" },
  };
  return labels[locale][type];
}

function cleanText(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sourceList(dataset, sourceIds) {
  return unique(sourceIds).map((id) => {
    const source = dataset.sources?.[id];
    if (!source) return null;
    return { id, title: source.title, url: source.url || null, kind: source.kind, date: source.date || null };
  }).filter(Boolean);
}

function englishFacts(record) {
  if (Array.isArray(record.facts)) return record.facts.map((fact) => ({ ...fact, group: "" }));
  return (record.fields || []).flatMap((field) => (field.facts || []).map((fact) => ({ ...fact, group: field.label })));
}

function localizedFacts(record, locale) {
  if (locale === "en") return englishFacts(record);
  if (record.zh?.groups) {
    return record.zh.groups.flatMap((group) => (group.facts || []).map((fact) => ({
      text: fact.text,
      evidenceLevel: ({ official: "official", video: "video-observed", community: "community-confirmed", lead: "unverified-lead", unknown: "unverified-lead", model: "unverified-lead" })[fact.badge] || "unverified-lead",
      validity: fact.badge === "historical" ? "historical" : fact.badge === "unknown" || fact.badge === "model" ? "unknown" : "current",
      build: null,
      sourceIds: [],
      group: group.heading || "",
    })));
  }
  return englishFacts(record).map((fact) => ({ ...fact, text: fact.zhText || fact.text }));
}

function localizedName(record, locale) {
  if (locale === "en") return record.name || record.locale?.en?.title;
  return record.zhName || record.zh?.name || record.locale?.zh?.title || record.name || record.locale?.en?.title;
}

function localizedSummary(record, locale) {
  if (locale === "en") return record.summary || cleanText(record.locale?.en?.entryHtml) || record.marker?.locale?.en?.description || "";
  if (record.zhSummary || record.zh?.summary || record.locale?.zh?.summary || record.marker?.locale?.zh?.description) {
    return record.zhSummary || record.zh?.summary || record.locale?.zh?.summary || record.marker?.locale?.zh?.description;
  }
  const localizedFacts = record.zh?.groups?.flatMap((group) => group.facts || []).map((fact) => fact.text).filter(Boolean).slice(0, 2) || [];
  return localizedFacts.join(" ") || record.summary || cleanText(record.locale?.en?.entryHtml) || "";
}

function searchTags(record, locale) {
  if (locale === "en") return record.searchTags || record.locale?.en?.keywords || "";
  return record.zhSearchTags || record.zh?.searchTags || record.locale?.zh?.keywords || record.searchTags || record.locale?.en?.keywords || "";
}

function baseRecord({ type, record, dataset, route, locale, title }) {
  const factsEn = englishFacts(record);
  const sourceIds = [...factsEn.flatMap((fact) => fact.sourceIds || []), ...(record.sourceIds || [])];
  const facts = localizedFacts(record, locale).map((fact) => ({
    group: fact.group || "",
    text: fact.text,
    evidenceLevel: fact.evidenceLevel || "unverified-lead",
    validity: fact.validity || "unknown",
    build: fact.build || dataset.meta?.build || null,
    sourceIds: fact.sourceIds || [],
  }));
  const names = unique([record.name, record.zhName, record.zh?.name, record.locale?.en?.title, record.locale?.zh?.title, record.marker?.locale?.en?.title, record.marker?.locale?.zh?.title]);
  const tags = unique([record.searchTags, record.zhSearchTags, record.zh?.searchTags, record.locale?.en?.keywords, record.locale?.zh?.keywords]).join(" ");
  return {
    id: `${type}:${record.id}`,
    type,
    typeLabel: labelForType(type, locale),
    label: localizedName(record, locale),
    title: title || localizedName(record, locale),
    route,
    aliases: names,
    keywords: tags.split(/\s+/).filter(Boolean),
    searchText: `${names.join(" ")} ${tags}`,
    summary: localizedSummary(record, locale),
    facts,
    sources: sourceList(dataset, sourceIds),
    relatedRoutes: [],
    build: dataset.meta?.build || record.build || null,
  };
}

function addRoute(record, route, locale, label, kind) {
  return { href: routeWithLocale(route, locale), label: routeLabels[route]?.[locale] || label, kind };
}

const materials = readJson("materials.json");
const crops = readJson("crops.json");
const animals = readJson("animals.json");
const npcs = readJson("npcs.json");
const quests = readJson("quests.json");
const locations = readJson("locations.json");

const datasets = [
  ["material", materials, "materials"],
  ["crop", crops, "crops"],
  ["animal", animals, "species"],
  ["npc", npcs, "npcs"],
  ["quest", quests, "quests"],
  ["location", locations, "locations"],
];

const entityMap = new Map();
for (const [type, dataset, key] of datasets) {
  for (const record of dataset[key]) {
    const route = routeForType(type, record.id, "en");
    for (const locale of ["en", "zh"]) {
      const entity = baseRecord({ type, record, dataset, route: routeForType(type, record.id, locale), locale, title: type === "material" ? (locale === "zh" ? record.zhSearchTitle : record.searchTitle) : type === "crop" ? (locale === "zh" ? record.zh?.searchTitle || record.zh?.name : record.name) : undefined });
      entityMap.set(`${locale}:${entity.id}`, entity);
    }
  }
}

for (const locale of ["en", "zh"]) {
  for (const quest of quests.quests) {
    const entity = entityMap.get(`${locale}:quest:${quest.id}`);
    const explicit = (quest.relatedRoutes || []).map((route) => addRoute(quest, route, locale, route, "Related answer"));
    const relations = (quest.relations || []).map((relation) => {
      const target = entityMap.get(`${locale}:${relation.target.type}:${relation.target.id}`);
      return target ? { href: target.route, label: target.label, kind: labelForType(relation.target.type, locale) } : null;
    }).filter(Boolean);
    entity.relatedRoutes = unique([...explicit, ...relations].map((item) => JSON.stringify(item))).map((item) => JSON.parse(item));
  }
  for (const [type, dataset, key] of datasets) {
    for (const record of dataset[key]) {
      const entity = entityMap.get(`${locale}:${type}:${record.id}`);
      if (!entity) continue;
      const routes = (record.relatedRoutes || []).map((route) => addRoute(record, route, locale, route, "Related answer"));
      entity.relatedRoutes = unique([...(entity.relatedRoutes || []), ...routes].map((item) => JSON.stringify(item))).map((item) => JSON.parse(item));
    }
  }
}

for (const locale of ["en", "zh"]) {
  const output = path.join(root, locale === "zh" ? "zh/knowledge-index.json" : "knowledge-index.json");
  const payload = JSON.stringify({ version: 1, locale, entities: Array.from(entityMap.values()).filter((entity) => entity.id.startsWith(locale === "zh" ? "" : "")).filter((entity) => entity.route.startsWith(locale === "zh" ? "/zh/" : "/") && (locale === "zh" ? entity.route.startsWith("/zh/") : !entity.route.startsWith("/zh/"))) });
  if (checkOnly) {
    if (!fs.existsSync(output) || fs.readFileSync(output, "utf8") !== payload) {
      console.error(`FAIL: ${path.relative(root, output)} is missing or out of sync. Re-run: node scripts/build-knowledge-index.cjs`);
      process.exitCode = 1;
    } else {
      console.log(`PASS: ${path.relative(root, output)} is in sync.`);
    }
  } else {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, payload, "utf8");
    console.log(`Wrote ${path.relative(root, output)}.`);
  }
}
