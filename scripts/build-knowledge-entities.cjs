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
    const related = record.relatedRoutes.map((relatedRoute, index) => {
      const href = zh ? localizeRoute(relatedRoute) : relatedRoute;
      return `<a class="btn btn-outline btn-compact" href="${esc(href)}">${zh ? "打开相关答案" : "Open related answer"} ${index + 1}</a>`;
    }).join("");
    return `<section class="evidence-ledger entity-profile" id="${record.id}" data-search-entry data-search-title="${esc(zh ? record.zhName : record.name)}" data-search-tags="${esc(zh ? record.zhSearchTags : record.searchTags)}" data-search-status="${zh ? "结构化资料" : "Structured record"}"><div class="section-heading-row"><div><span class="kicker">${c.noun}</span><h2>${esc(zh ? record.zhName : record.name)}</h2></div>${confidence}</div><p class="lead">${esc(zh ? record.zhSummary : record.summary)}</p><ul class="evidence-list">${facts}</ul><div class="entity-related">${related}</div></section>`;
  }).join("\n");
  return `<!DOCTYPE html>\n<!-- GENERATED by scripts/build-knowledge-entities.cjs from data/${recordsKey}.json — do not edit directly. -->\n<html lang="${zh ? "zh-CN" : "en"}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${c.title}</title><meta name="description" content="${c.description}"><link rel="canonical" href="${zh ? zhUrl : enUrl}"><link rel="alternate" hreflang="en" href="${enUrl}"><link rel="alternate" hreflang="zh-CN" href="${zhUrl}"><link rel="alternate" hreflang="x-default" href="${enUrl}"><meta property="og:type" content="website"><meta property="og:site_name" content="The Ranchers Guide"><meta property="og:title" content="${c.title}"><meta property="og:description" content="${c.description}"><meta property="og:url" content="${zh ? zhUrl : enUrl}"><meta property="og:image" content="https://theranchersguide.com/assets/img/guide-barn.webp"><link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css?v=20260820-ui2"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4804883741146501" crossorigin="anonymous"></script></head><body><header class="site-header"><nav class="nav-inner" aria-label="${zh ? "主导航" : "Main navigation"}"><a class="logo" href="${zh ? "/zh/" : "/"}"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide<small>${zh ? "非官方中文玩家指南" : "Unofficial fan resource"}</small></span></a><button class="nav-toggle" aria-expanded="false" aria-label="${zh ? "展开导航" : "Toggle navigation"}">☰</button><ul class="nav-links">${nav(locale)}</ul></nav></header><main><article class="article entity-directory"><nav class="breadcrumb" aria-label="${zh ? "面包屑" : "Breadcrumb"}"><a href="${zh ? "/zh/" : "/"}">${zh ? "首页" : "Home"}</a> / <a href="${zh ? "/zh/database" : "/database"}">${zh ? "知识库" : "Database"}</a> / ${c.noun}</nav><h1>${c.heading}</h1><p class="meta">${zh ? "页面基线" : "Page baseline"}: ${dataset.meta.build} · ${zh ? "更新" : "Updated"} ${dataset.meta.lastUpdated}</p><p class="lead">${c.lead}</p><div class="notice info"><strong>${zh ? "发布边界：" : "Publication boundary:"}</strong> ${c.boundary}</div><nav class="toc" aria-label="${c.noun}"><strong>${c.noun}</strong><ul>${toc}</ul></nav>${sections}</article></main><footer class="site-footer"><div class="container"><div class="footer-bottom"><span>&copy; <span data-year></span> The Ranchers Guide</span><span>${zh ? "证据不足的实体不会自动发布" : "Evidence gates prevent thin entity pages"}</span></div></div></footer><script src="/assets/js/main.js?v=20260810-nav1" defer></script></body></html>`;
}

const jobs = [
  ["npcs", JSON.parse(fs.readFileSync(path.join(root, "data", "npcs.json"), "utf8"))],
  ["quests", JSON.parse(fs.readFileSync(path.join(root, "data", "quests.json"), "utf8"))],
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
