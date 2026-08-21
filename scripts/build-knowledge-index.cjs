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
  if (base === "/tools/ranch-checklist") return `/zh/tools/ranch-checklist${suffix}`;
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

const journeyPlans = {
  "animal:chicken": [
    { route: "/guides/animal-guide#getting", en: { label: "Bring chickens home", reason: "Start with the documented purchase and delivery route." }, zh: { label: "把鸡带回家", reason: "先按已有证据确认购买和运回流程。" } },
    { route: "/database/npcs#angela", en: { label: "Find Angela", reason: "Open the seller profile and housing equipment notes." }, zh: { label: "找到 Angela", reason: "查看卖鸡商人和鸡舍设备记录。" } },
    { route: "/database/quests#chicken-coop-mission", en: { label: "Chicken Coop Mission", reason: "Check the task hand-off before treating it as a bug." }, zh: { label: "鸡舍任务", reason: "先看任务交付点，再判断是否是 bug。" } },
    { route: "/tools/chicken-troubleshooter", en: { label: "Troubleshoot symptoms", reason: "Use the conservative checklist when a chicken is missing or sick." }, zh: { label: "排查养鸡问题", reason: "鸡消失或生病时按保守顺序检查。" } },
    { route: "/guides/gigi-large-egg-quest", en: { label: "Large-egg quest", reason: "Continue when the question is about eggs rather than housing." }, zh: { label: "大鸡蛋任务", reason: "如果问题转向鸡蛋，再进入任务路线。" } },
    { route: "/tools/ranch-checklist", en: { label: "Save a local checklist", reason: "Keep your own animal progress on this device." }, zh: { label: "保存本地清单", reason: "在本机记录自己的养鸡进度。" } },
  ],
  "location:city-hall": [
    { route: "/database/npcs#victor", en: { label: "Victor at City Hall", reason: "See the NPC relation behind the power route." }, zh: { label: "市政厅的 Victor", reason: "查看供电路线关联的 NPC。" } },
    { route: "/database/quests#power-to-the-bench", en: { label: "Power to the Bench", reason: "Open the observed quest record and its evidence boundary." }, zh: { label: "Power to the Bench 任务", reason: "查看视频观测到的任务记录和证据边界。" } },
    { route: "/guides/electricity-power#two-paths", en: { label: "Electricity contracts", reason: "Compare the two documented contract paths." }, zh: { label: "水电合同路线", reason: "对照两条已有记录的合同路线。" } },
    { route: "/database/materials#zirconite", en: { label: "Buy Zirconite", reason: "Check the current purchase route before searching for a mine." }, zh: { label: "购买锆矿", reason: "先看当前购买路线，不要先找未开放矿洞。" } },
    { route: "/tools/ranch-checklist", en: { label: "Save a local checklist", reason: "Track your own power goal without creating a required order." }, zh: { label: "保存本地清单", reason: "记录自己的供电目标，不把它当成强制顺序。" } },
  ],
  "material:hay": [
    { route: "/database/animals#chicken", en: { label: "Chicken feed context", reason: "See how hay fits the interior trough and animal routine." }, zh: { label: "鸡饲料说明", reason: "查看干草与室内食槽、动物照护的关系。" } },
    { route: "/guides/animal-guide#feeding", en: { label: "Feed and water guide", reason: "Follow the evidence-linked care steps before automating." }, zh: { label: "喂食与饮水指南", reason: "自动化前先按证据链接检查照护步骤。" } },
    { route: "/database/npcs#angela", en: { label: "Angela's equipment", reason: "Check the seller and animal-housing equipment context." }, zh: { label: "Angela 的设备", reason: "查看卖家和动物建筑设备的上下文。" } },
    { route: "/tools/ranch-checklist", en: { label: "Save a local checklist", reason: "Keep the animal-care steps available while you play." }, zh: { label: "保存本地清单", reason: "游玩时在本机保留动物照护步骤。" } },
  ],
  "npc:angela": [
    { route: "/guides/animal-guide#getting", en: { label: "Bring chickens home", reason: "Start with the documented seller and delivery route." }, zh: { label: "把鸡带回家", reason: "先看已有记录的卖家和运回流程。" } },
    { route: "/database/animals#chicken", en: { label: "Chicken entry", reason: "Compare care facts with their evidence labels." }, zh: { label: "鸡条目", reason: "对照养鸡事实和证据标签。" } },
    { route: "/database/quests#chicken-coop-mission", en: { label: "Chicken Coop Mission", reason: "Check the hand-off before diagnosing a bug." }, zh: { label: "鸡舍任务", reason: "判断 bug 前先核对任务交付。" } },
    { route: "/tools/chicken-troubleshooter", en: { label: "Troubleshoot chickens", reason: "Use the evidence-linked recovery order." }, zh: { label: "排查养鸡问题", reason: "按证据链接的顺序处理异常。" } },
  ],
  "npc:victor": [
    { route: "/map#city-hall", en: { label: "Find City Hall", reason: "Open the approximate area and its map evidence." }, zh: { label: "找到市政厅", reason: "查看大致区域和地图证据。" } },
    { route: "/database/quests#power-to-the-bench", en: { label: "Power to the Bench", reason: "Read the observed quest relation." }, zh: { label: "Power to the Bench 任务", reason: "查看视频观测到的任务关系。" } },
    { route: "/guides/electricity-power#two-paths", en: { label: "Electricity contracts", reason: "Compare the documented power routes." }, zh: { label: "水电合同路线", reason: "对照已有记录的供电路线。" } },
    { route: "/database/materials#zirconite", en: { label: "Buy Zirconite", reason: "Check the current purchase route before searching for mines." }, zh: { label: "购买锆矿", reason: "先看当前购买路线，不要先找未开放矿洞。" } },
  ],
  "npc:gigi": [
    { route: "/guides/gigi-large-egg-quest", en: { label: "Large-egg quest", reason: "Follow the documented hand-off and escape route." }, zh: { label: "大鸡蛋任务", reason: "按已有记录完成交付和逃跑路线。" } },
    { route: "/database/quests#real-eggs-real-evidence", en: { label: "Quest database entry", reason: "Separate the exact task record from player reports." }, zh: { label: "任务数据库条目", reason: "区分任务记录和玩家报告。" } },
    { route: "/guides/police-wanted-levels", en: { label: "Police and wanted levels", reason: "Check the current-build boundary around the chase." }, zh: { label: "警察与警星", reason: "查看追捕机制的当前版本边界。" } },
    { route: "/guides/gigi-large-egg-quest#stuck", en: { label: "Gigi hand-off stuck point", reason: "Use the save-first recovery path if the hand-off fails." }, zh: { label: "Gigi 交付卡点", reason: "交付失败时按先存档的恢复路线处理。" } },
  ],
  "quest:chicken-coop-mission": [
    { route: "/database/npcs#angela", en: { label: "Angela", reason: "Confirm the seller connected to this task." }, zh: { label: "Angela", reason: "确认与该任务相关的卖鸡商人。" } },
    { route: "/guides/animal-guide#getting", en: { label: "Chicken delivery guide", reason: "Read the purchase and delivery evidence." }, zh: { label: "鸡的运回指南", reason: "查看购买与运回证据。" } },
    { route: "/tools/chicken-troubleshooter", en: { label: "Chicken troubleshooter", reason: "Use the symptom flow only after updating the game." }, zh: { label: "养鸡排查工具", reason: "先更新游戏，再使用症状排查流程。" } },
    { route: "/database/animals#chicken", en: { label: "Chicken entry", reason: "Keep care facts and unresolved cases together." }, zh: { label: "鸡条目", reason: "集中查看照护事实和未解决案例。" } },
  ],
  "quest:power-to-the-bench": [
    { route: "/map#city-hall", en: { label: "City Hall", reason: "Open the location area tied to the task." }, zh: { label: "市政厅", reason: "打开与任务关联的地点区域。" } },
    { route: "/database/npcs#victor", en: { label: "Victor", reason: "Check the NPC relation and evidence build." }, zh: { label: "Victor", reason: "查看 NPC 关系和证据版本。" } },
    { route: "/guides/electricity-power#two-paths", en: { label: "Electricity guide", reason: "Compare the two documented contract paths." }, zh: { label: "电力指南", reason: "对照两条已有记录的合同路线。" } },
    { route: "/database/materials#zirconite", en: { label: "Zirconite", reason: "Use the current purchase answer instead of a guessed mine location." }, zh: { label: "锆矿", reason: "使用当前购买答案，不猜测矿洞位置。" } },
  ],
  "material:zirconite": [
    { route: "/map#city-hall", en: { label: "City Hall area", reason: "Open the approximate city-center map entry." }, zh: { label: "市政厅区域", reason: "打开大致的市中心地图条目。" } },
    { route: "/database/npcs#victor", en: { label: "Victor and Meriam context", reason: "Check the NPC and service context around the purchase route." }, zh: { label: "Victor 与 Meriam", reason: "查看购买路线涉及的 NPC 和服务上下文。" } },
    { route: "/guides/electricity-power#two-paths", en: { label: "Electricity route", reason: "Use a verified progression path when the material question is tied to power systems." }, zh: { label: "供电路线", reason: "如果材料问题与供电系统有关，从已有证据路线继续。" } },
    { route: "/guides/electricity-power#two-paths", en: { label: "Power route", reason: "Continue if the material question came from electricity work." }, zh: { label: "供电路线", reason: "如果材料问题来自供电任务，从这里继续。" } },
  ],
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
  for (const entity of entityMap.values()) {
    if (!entity.route.startsWith(locale === "zh" ? "/zh/" : "/")) continue;
    entity.journey = (journeyPlans[entity.id] || []).map((step) => ({
      href: routeWithLocale(step.route, locale),
      label: step[locale].label,
      reason: step[locale].reason,
    }));
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
