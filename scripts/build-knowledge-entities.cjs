const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkOnly = process.argv.includes("--check");

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function localizeRoute(route) {
  const exact = {
    "/guides/animal-guide": "/zh/guides/animal-guide",
    "/guides/gigi-large-egg-quest": "/zh/guides/gigi-large-egg-quest",
    "/guides/roof-quest-stuck": "/zh/guides/roof-quest-stuck",
    "/guides/police-wanted-levels": "/zh/guides/police-wanted-levels",
    "/problems/vehicle-recovery": "/zh/problems/vehicle-recovery",
    "/tools/chicken-troubleshooter": "/zh/tools/chicken-troubleshooter",
    "/database/npcs": "/zh/database/npcs",
    "/database/quests": "/zh/database/quests",
  };
  const base = route.split(/[?#]/)[0];
  const suffix = route.slice(base.length);
  if (exact[base]) return exact[base] + suffix;
  if (base === "/map") return "/zh/map" + suffix;
  return route;
}

const copy = {
  npcs: {
    en: { title: "The Ranchers NPC Database — Victor, Angela & Gigi", description: "Current, source-linked The Ranchers NPC records for Victor, Angela and Gigi, connecting services, quests, maps and guides.", heading: "The Ranchers NPC Database", lead: "Use NPC records as junctions: who the person is, what the player can do with them now, and which quest, map or guide continues the answer.", noun: "NPCs", boundary: "Only Victor, Angela and Gigi clear the current publication gate. Historical-only or name-only characters remain held instead of becoming thin entries." },
    zh: { title: "The Ranchers NPC 数据库：Victor、Angela 与 Gigi", description: "查询 The Ranchers 中 Victor、Angela 和 Gigi 的当前证据、服务、任务及关联地图与攻略。", heading: "The Ranchers NPC 数据库", lead: "NPC 条目负责连接人物身份、当前可执行互动，以及后续任务、地图或攻略答案。", noun: "NPC", boundary: "目前只有 Victor、Angela 和 Gigi 达到发布门槛。仅有历史资料或名字的角色继续保留待验证，不生成薄内容。" }
  },
  quests: {
    en: { title: "The Ranchers Quest Database — Objectives, Routes & Stuck Fixes", description: "Browse source-linked The Ranchers quest records, objective routes and stuck-point fixes without confusing community labels with exact tracker names.", heading: "The Ranchers Quest Database", lead: "Start from the quest name or symptom. Exact tracker titles, community labels and descriptive names are separated so an unverified label never becomes invented game text.", noun: "Quests", boundary: "This is an aggregate route index, not a claim that every entry is a complete quest transcript. Rewards, prerequisites and exact titles stay omitted when the evidence does not retain them." },
    zh: { title: "The Ranchers 任务数据库：目标、路线与卡关处理", description: "查询 The Ranchers 任务记录、目标路线和卡关处理，并区分准确任务名、社区称呼和描述性名称。", heading: "The Ranchers 任务数据库", lead: "可从任务名称或卡关症状开始查找。准确追踪器标题、社区称呼和描述性名称会被明确区分，不把未验证称呼伪装成游戏原文。", noun: "任务", boundary: "这是任务路线索引，不代表每条都是完整任务文本。证据未保留的奖励、前置条件和准确标题不会补写。" }
  }
};

const evidenceLabels = {
  en: { official: "Official", "video-observed": "Video-observed", "community-confirmed": "Community-confirmed", "unverified-lead": "Single-source lead" },
  zh: { official: "官方", "video-observed": "视频观测", "community-confirmed": "社区互证", "unverified-lead": "单一线索" },
};

const confidenceLabels = {
  en: { "exact-observed": "Exact tracker title observed", "community-current": "Current community title", "community-label": "Community label", descriptive: "Descriptive name" },
  zh: { "exact-observed": "已观测准确任务名", "community-current": "当前社区任务名", "community-label": "社区称呼", descriptive: "描述性名称" },
};

const relationLabels = {
  en: { "involves-npc": "NPC", "takes-place-at": "Place", "uses-location": "Place" },
  zh: { "involves-npc": "NPC", "takes-place-at": "地点", "uses-location": "地点" },
};

const entityRoutes = {
  npc: (id, locale) => `${locale === "zh" ? "/zh" : ""}/database/npcs#${id}`,
  location: (id, locale) => `${locale === "zh" && zhMapAnchors.has(id) ? "/zh" : ""}/map#${id}`,
};

const relatedRouteLabels = {
  "/map#city-hall": { en: "City Hall map", zh: "市政厅地图" },
  "/problems/vehicle-recovery": { en: "Vehicle recovery", zh: "车辆找回" },
  "/guides/electricity-power#two-paths": { en: "Electricity contracts & power", zh: "水电合同与供电" },
  "/guides/electricity-power#solar-quest": { en: "Solar objective checklist", zh: "太阳能目标检查清单" },
  "/guides/animal-guide#getting": { en: "Bring chickens home", zh: "把鸡运回家" },
  "/tools/chicken-troubleshooter": { en: "Chicken troubleshooter", zh: "养鸡排查工具" },
  "/guides/roof-quest-stuck#flow": { en: "Roof objective decision flow", zh: "屋顶目标分类排查" },
  "/guides/building-construction": { en: "Building guide", zh: "建造指南" },
  "/problems/failed-quest-replay": { en: "Failed quest recovery", zh: "失败任务恢复" },
  "/guides/gigi-large-egg-quest": { en: "Gigi large-egg route", zh: "Gigi 大鸡蛋路线" },
  "/guides/police-wanted-levels": { en: "Police chase and wanted levels", zh: "警察追捕与警星" },
};

function entityRecord(target, locale) {
  const record = entityCatalog.get(`${target.type}:${target.id}`);
  if (!record) throw new Error(`Unknown entity relation target ${target.type}:${target.id}`);
  return {
    href: entityRoutes[target.type](target.id, locale),
    label: target.type === "location" ? record.locale[locale].title : locale === "zh" ? record.zhName : record.name,
  };
}

function relationsHtml(record, locale) {
  if (!record.relations?.length) return "";
  const heading = locale === "zh" ? "关联实体" : "Connected entities";
  const items = record.relations.map((relation) => {
    const target = entityRecord(relation.target, locale);
    return `<div class="entity-relation-row"><dt>${relationLabels[locale][relation.predicate]}</dt><dd><a data-entity-ref="${esc(relation.target.type)}:${esc(relation.target.id)}" href="${esc(target.href)}">${esc(target.label)}</a> ${badge(relation, locale)}</dd></div>`;
  }).join("");
  return `<div class="entity-relations"><strong>${heading}</strong><dl>${items}</dl></div>`;
}

function backlinksHtml(recordsKey, record, locale) {
  const entityType = recordsKey === "npcs" ? "npc" : recordsKey === "quests" ? "quest" : null;
  const links = entityType ? entityBacklinks.get(`${entityType}:${record.id}`) || [] : [];
  if (!links.length) return "";
  const heading = locale === "zh" ? "关联任务" : "Related quests";
  const items = links.map(({ source }) => {
    const label = locale === "zh" ? source.zhName : source.name;
    const href = `${locale === "zh" ? "/zh" : ""}/database/quests#${source.id}`;
    return `<a data-derived-backlink="quest:${esc(source.id)}" href="${href}">${esc(label)}</a>`;
  }).join("");
  return `<div class="entity-backlinks"><strong>${heading}</strong><div>${items}</div></div>`;
}

function npcLookupGuide(locale) {
  if (locale === "zh") {
    return `<section class="answer-box npc-lookup-guide"><h2>先按你的目标找 NPC</h2><p>不要只按人物名字浏览。先确定你要办理的事情，再沿着已记录的地图、任务和攻略入口继续。</p><ul><li><strong>水电合同或额外土地：</strong>查 Victor，再打开 <a href="/zh/map#city-hall">市政厅地图</a> 和<a href="/zh/guides/electricity-power#two-paths">水电指南</a>。</li><li><strong>买鸡或把鸡带回家：</strong>查 Angela，再打开<a href="/zh/guides/animal-guide#getting">养鸡流程</a>或<a href="/zh/tools/chicken-troubleshooter">养鸡排查工具</a>。</li><li><strong>大鸡蛋任务或警察追逐：</strong>查 Gigi，再打开<a href="/zh/guides/gigi-large-egg-quest">大鸡蛋路线</a>和<a href="/zh/guides/police-wanted-levels">警星指南</a>。</li></ul></section>`;
  }
  return `<section class="answer-box npc-lookup-guide"><h2>Start from the task, not only the name</h2><p>Choose the service or problem you are trying to solve, then follow the recorded map, quest and guide links for that NPC.</p><ul><li><strong>Utility contracts or extra land:</strong> start with Victor, then open the <a href="/map#city-hall">City Hall map</a> and <a href="/guides/electricity-power#two-paths">electricity guide</a>.</li><li><strong>Buying or bringing home chickens:</strong> start with Angela, then open the <a href="/guides/animal-guide#getting">animal guide</a> or <a href="/tools/chicken-troubleshooter">chicken troubleshooter</a>.</li><li><strong>Large eggs or the police chase:</strong> start with Gigi, then open the <a href="/guides/gigi-large-egg-quest">large-egg route</a> and <a href="/guides/police-wanted-levels">wanted-level guide</a>.</li></ul></section>`;
}

function entityDecision(record, locale) {
  if (!record.whenNeeded || !record.zhWhenNeeded) return "";
  const copy = locale === "zh" ? record.zhWhenNeeded : record.whenNeeded;
  return `<div class="entity-decision"><strong>${locale === "zh" ? "什么时候查" : "When to look here"}</strong><p>${esc(copy)}</p></div>`;
}

function badge(fact, locale) {
  const cls = fact.validity === "historical" ? "historical" : fact.evidenceLevel === "official" ? "evidence-official" : fact.evidenceLevel === "video-observed" ? "evidence-video" : fact.evidenceLevel === "community-confirmed" ? "evidence-corroborated" : "evidence-lead";
  return `<span class="tag ${cls}">${evidenceLabels[locale][fact.evidenceLevel]}</span>`;
}

function sourceHtml(data, ids, locale) {
  const sourceWord = locale === "zh" ? "来源" : "Source";
  return `<strong>${sourceWord}:</strong> ` + ids.map((id) => {
    const source = data.sources[id];
    const label = esc(source.title);
    return source.url ? `<a href="${esc(source.url)}" rel="noopener noreferrer">${label}</a>` : `<span>${label} · ${locale === "zh" ? "本地留档" : "local archive"}</span>`;
  }).join(" · ");
}

function nav(locale) {
  const zh = locale === "zh";
  const links = zh
    ? [["/zh/guides/beginners-guide", "新手"], ["/zh/database", "知识库"], ["/zh/map", "地图"], ["/zh/problems", "问题"], ["/zh/search", "搜索"], ["/contribute", "投稿"]]
    : [["/guides/beginners-guide", "Guides"], ["/database", "Database"], ["/map", "Map"], ["/problems", "Problems"], ["/research", "Research"], ["/search", "Search"], ["/contribute", "Contribute"]];
  return links.map(([href, label], index) => `<li><a${index === 1 ? ' class="active"' : ""} href="${href}">${label}</a></li>`).join("");
}

function render(dataset, recordsKey, locale) {
  const zh = locale === "zh";
  const c = copy[recordsKey][locale];
  const records = dataset[recordsKey];
  const route = `${zh ? "/zh" : ""}/database/${recordsKey}`;
  const enUrl = `https://theranchersguide.com/database/${recordsKey}`;
  const zhUrl = `https://theranchersguide.com/zh/database/${recordsKey}`;
  const toc = records.map((record) => `<li><a href="#${record.id}">${esc(zh ? record.zhName : record.name)}</a></li>`).join("");
  const sections = records.map((record) => {
    const confidence = recordsKey === "quests" ? `<span class="tag ${record.nameConfidence === "exact-observed" ? "evidence-video" : "evidence-lead"}">${confidenceLabels[locale][record.nameConfidence]}</span>` : "";
    const facts = record.facts.map((fact) => `<li${fact.validity === "historical" ? ' class="fact-historical"' : ""}><p>${esc(zh ? fact.zhText : fact.text)} ${badge(fact, locale)}</p><p class="fact-source">${sourceHtml(dataset, fact.sourceIds, locale)} · <strong>${zh ? "版本" : "Build"}:</strong> ${esc(fact.build)}</p></li>`).join("");
    const relatedLinks = record.relatedRoutes.map((relatedRoute) => {
      const href = zh ? localizeRoute(relatedRoute) : relatedRoute;
      const labels = relatedRouteLabels[relatedRoute];
      if (!labels) throw new Error(`Missing related route label for ${relatedRoute}`);
      return `<a class="btn btn-outline btn-compact" href="${esc(href)}">${esc(labels[locale])}</a>`;
    }).join("");
    const related = `<div class="entity-related"><strong>${zh ? "继续查找" : "Continue with"}</strong><div>${relatedLinks}</div></div>`;
    return `<section class="evidence-ledger entity-profile" id="${record.id}" data-search-entry data-search-title="${esc(zh ? record.zhName : record.name)}" data-search-tags="${esc(zh ? record.zhSearchTags : record.searchTags)}" data-search-status="${zh ? "结构化资料" : "Structured record"}"><div class="section-heading-row"><div><span class="kicker">${c.noun}</span><h2>${esc(zh ? record.zhName : record.name)}</h2></div>${confidence}</div><p class="lead">${esc(zh ? record.zhSummary : record.summary)}</p>${entityDecision(record, locale)}${relationsHtml(record, locale)}${backlinksHtml(recordsKey, record, locale)}<ul class="evidence-list">${facts}</ul><div class="entity-related">${related}</div></section>`;
  }).join("\n");
  const lookupGuide = recordsKey === "npcs" ? npcLookupGuide(locale) : "";
  return `<!DOCTYPE html>\n<!-- GENERATED by scripts/build-knowledge-entities.cjs from data/${recordsKey}.json — do not edit directly. -->\n<html lang="${zh ? "zh-CN" : "en"}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${c.title}</title><meta name="description" content="${c.description}"><link rel="canonical" href="${zh ? zhUrl : enUrl}"><link rel="alternate" hreflang="en" href="${enUrl}"><link rel="alternate" hreflang="zh-CN" href="${zhUrl}"><link rel="alternate" hreflang="x-default" href="${enUrl}"><meta property="og:type" content="website"><meta property="og:site_name" content="The Ranchers Guide"><meta property="og:title" content="${c.title}"><meta property="og:description" content="${c.description}"><meta property="og:url" content="${zh ? zhUrl : enUrl}"><meta property="og:image" content="https://theranchersguide.com/assets/img/guide-barn.webp"><link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css?v=20260821-ui1"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4804883741146501" crossorigin="anonymous"></script></head><body><header class="site-header"><nav class="nav-inner" aria-label="${zh ? "主导航" : "Main navigation"}"><a class="logo" href="${zh ? "/zh/" : "/"}"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide<small>${zh ? "非官方中文玩家指南" : "Unofficial fan resource"}</small></span></a><button class="nav-toggle" aria-expanded="false" aria-label="${zh ? "展开导航" : "Toggle navigation"}">☰</button><ul class="nav-links">${nav(locale)}</ul></nav></header><main><article class="article entity-directory"><nav class="breadcrumb" aria-label="${zh ? "面包屑" : "Breadcrumb"}"><a href="${zh ? "/zh/" : "/"}">${zh ? "首页" : "Home"}</a> / <a href="${zh ? "/zh/database" : "/database"}">${zh ? "知识库" : "Database"}</a> / ${c.noun}</nav><h1>${c.heading}</h1><p class="meta">${zh ? "页面基线" : "Page baseline"}: ${dataset.meta.build} · ${zh ? "更新" : "Updated"} ${dataset.meta.lastUpdated}</p><p class="lead">${c.lead}</p><div class="notice info"><strong>${zh ? "发布边界：" : "Publication boundary:"}</strong> ${c.boundary}</div>${lookupGuide}<nav class="toc" aria-label="${c.noun}"><strong>${c.noun}</strong><ul>${toc}</ul></nav>${sections}</article></main><footer class="site-footer"><div class="container"><div class="footer-bottom"><span>&copy; <span data-year></span> The Ranchers Guide</span><span>${zh ? "证据不足的实体不会自动发布" : "Evidence gates prevent thin entity pages"}</span></div></div></footer><script src="/assets/js/main.js?v=20260810-nav1" defer></script></body></html>`;
}

const npcData = JSON.parse(fs.readFileSync(path.join(root, "data", "npcs.json"), "utf8"));
const questData = JSON.parse(fs.readFileSync(path.join(root, "data", "quests.json"), "utf8"));
const locationData = JSON.parse(fs.readFileSync(path.join(root, "data", "locations.json"), "utf8"));
const zhMapHtml = fs.readFileSync(path.join(root, "zh", "map.html"), "utf8");
const zhMapAnchors = new Set(Array.from(zhMapHtml.matchAll(/id="([a-z0-9-]+)"\s+data-location-entry/g), (match) => match[1]));
const entityCatalog = new Map([
  ...npcData.npcs.map((record) => [`npc:${record.id}`, record]),
  ...locationData.locations.map((record) => [`location:${record.id}`, record]),
]);
const entityBacklinks = new Map();
for (const quest of questData.quests) {
  for (const relation of quest.relations || []) {
    const key = `${relation.target.type}:${relation.target.id}`;
    if (!entityBacklinks.has(key)) entityBacklinks.set(key, []);
    entityBacklinks.get(key).push({ source: quest, relation });
  }
}

const jobs = [
  ["npcs", npcData],
  ["quests", questData],
];

let drifted = false;
for (const [recordsKey, dataset] of jobs) {
  for (const locale of ["en", "zh"]) {
    const file = path.join(root, ...(locale === "zh" ? ["zh", "database", `${recordsKey}.html`] : ["database", `${recordsKey}.html`]));
    const html = render(dataset, recordsKey, locale);
    if (checkOnly) {
      if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== html) drifted = true;
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, html, "utf8");
    }
  }
}

if (checkOnly && drifted) {
  console.error("NPC or quest pages are out of sync with their JSON source.");
  process.exit(1);
}
if (!checkOnly) console.log("Wrote bilingual NPC and quest database pages.");
