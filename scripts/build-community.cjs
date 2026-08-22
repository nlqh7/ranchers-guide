const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "community.json"), "utf8"));

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function externalLink(url, label) {
  return `<a class="btn btn-outline btn-compact" href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function routeFor(route, zh) {
  if (!zh || !route) return route;
  if (route === "/database/animals#chicken-selling") return "/zh/database/animals#chicken";
  if (route === "/community") return "/zh/community";
  if (route === "/map") return "/zh/map";
  if (route === "/database") return "/zh/database";
  if (route.startsWith("/database/")) return `/zh${route}`;
  if (route.startsWith("/guides/")) return `/zh${route}`;
  if (route.startsWith("/problems/")) return `/zh${route}`;
  if (route === "/problems") return "/zh/problems";
  if (route.startsWith("/tools/")) return `/zh${route}`;
  if (route === "/updates") return "/zh/updates";
  if (route.startsWith("/updates/")) return `/zh${route}`;
  return route;
}

function sourceAction(entry, zh) {
  return /\/discussions\/?$/.test(entry.url)
    ? (zh ? "打开讨论区" : "Open discussions")
    : (zh ? "查看原讨论" : "View original");
}

function renderExternalResourceCard(resource, zh) {
  const title = zh ? resource.titleZh : resource.title;
  const description = zh ? resource.descriptionZh : resource.description;
  const status = zh ? resource.statusZh : resource.status;
  const action = zh ? resource.actionZh : resource.action;
  const kindLabel = zh ? { official: "官方", community: "玩家线索", asset: "素材参考" }[resource.kind] : { official: "Official", community: "Community lead", asset: "Asset reference" }[resource.kind];
  const kindClass = resource.kind === "official" ? "evidence-official" : resource.kind === "asset" ? "evidence-lead" : "evidence-corroborated";
  return `<article class="community-reference-card">
    <div class="community-card-top"><span class="evidence-badge ${kindClass}">${escapeHtml(status)}</span><span class="community-card-meta">${escapeHtml(kindLabel)}</span></div>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(description)}</p>
    <a class="btn btn-outline btn-compact" href="${escapeHtml(resource.url)}" rel="noopener noreferrer">${escapeHtml(action)} →</a>
  </article>`;
}

function statusLabel(entry, zh) {
  if (entry.status === "official") return zh ? "官方答复" : "Official reply";
  if (entry.status === "reported") return zh ? "玩家报告" : "Reported lead";
  if (entry.status === "question") return zh ? "开放问题" : "Open question";
  return zh ? "社区入口" : "Community hub";
}

function statusClass(entry) {
  if (entry.status === "official") return "evidence-official";
  if (entry.status === "reported") return "evidence-lead";
  if (entry.status === "question") return "evidence-corroborated";
  return "evidence-corroborated";
}

function renderCard(entry, zh) {
  const title = zh ? entry.titleZh : entry.title;
  const summary = zh ? entry.summaryZh : entry.summary;
  const why = zh ? entry.whyZh : entry.why;
  const risk = zh ? entry.riskZh : entry.risk;
  const relatedEntity = zh ? entry.relatedEntityZh : entry.relatedEntity;
  const sourceLabel = zh ? entry.sourceLabelZh : entry.sourceLabel;
  const relatedLabel = zh ? entry.relatedLabelZh : entry.relatedLabel;
  const build = zh ? (entry.buildZh || entry.build || data.build) : (entry.build || data.build);
  const dateLabel = entry.status === "official"
    ? (zh ? "来源日期" : "Source date")
    : (zh ? "最后报告" : "Last reported");
  const additionalSources = (entry.sourceLinks || []).map((source) => externalLink(source.url, zh ? source.labelZh : source.label)).join("");
  return `<article class="community-radar-card" data-community-card data-topic="${escapeHtml(entry.topic)}" data-search-entry data-search-title="${escapeHtml(title)}" data-search-tags="${escapeHtml(entry.topic)} ${escapeHtml(entry.platform)} ${escapeHtml(statusLabel(entry, zh))}" id="${escapeHtml(entry.id)}">
        <div class="community-card-top"><span class="evidence-badge ${statusClass(entry)}">${escapeHtml(statusLabel(entry, zh))}</span><span class="community-card-meta">${escapeHtml(entry.platform)} · ${escapeHtml(dateLabel)}: ${escapeHtml(entry.date)}</span></div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(summary)}</p>
        <p class="community-card-why"><strong>${zh ? "为什么值得看" : "Why it matters"}:</strong> ${escapeHtml(why)}</p>
        <p class="community-card-risk"><strong>${zh ? "使用风险" : "Use with caution"}:</strong> ${escapeHtml(risk)}</p>
        <p class="community-card-entity"><strong>${zh ? "关联实体" : "Related entity"}:</strong> ${entry.relatedEntityRoute ? `<a href="${escapeHtml(routeFor(entry.relatedEntityRoute, zh))}">${escapeHtml(relatedEntity)}</a>` : escapeHtml(relatedEntity)}</p>
        <div class="community-card-actions">${externalLink(entry.url, sourceAction(entry, zh))}${additionalSources}${externalLink(routeFor(entry.relatedRoute, zh), relatedLabel)}</div>
        <p class="source-note">${escapeHtml(sourceLabel)} · ${escapeHtml(build)}</p>
      </article>`;
}

function renderQuestionBuilder(zh) {
  const copy = zh ? "复制问题" : "Copy question";
  const open = zh ? "打开 Steam 讨论区" : "Open Steam Discussions";
  const send = zh ? "发给本站审核" : "Send for guide review";
  return `<section class="section alt" id="ask" aria-labelledby="ask-title"><div class="container community-builder">
    <div class="section-head"><span class="kicker">${zh ? "原创工具" : "Original tool"}</span><h2 id="ask-title">${zh ? "把模糊抱怨整理成可回答的问题" : "Turn a vague complaint into an answerable question"}</h2><p>${zh ? "社区里最难回答的不是问题少，而是缺版本、缺步骤、缺截图。先用下面的模板整理，再去 Steam 发帖或发给本站审核。" : "The hardest community questions are missing a build, steps or a useful screenshot. Fill this in first, then post it on Steam or send it to the guide for review."}</p></div>
    <form class="question-builder" data-question-builder>
      <label>${zh ? "主题" : "Topic"}<select name="topic"><option>${zh ? "作物 / 种子" : "Crops / seeds"}</option><option>${zh ? "动物 / 鸡舍" : "Animals / coop"}</option><option>${zh ? "任务" : "Quest"}</option><option>${zh ? "地图 / 材料" : "Map / materials"}</option><option>${zh ? "联机" : "Co-op"}</option><option>${zh ? "建造" : "Building"}</option></select></label>
      <div class="form-pair"><label>${zh ? "版本" : "Build"}<input name="build" value="${escapeHtml(data.build)}" maxlength="30"></label><label>${zh ? "平台" : "Platform"}<select name="platform"><option>Windows</option><option>Steam Deck</option><option>${zh ? "其他 PC 配置" : "Other PC setup"}</option></select></label></div>
      <label>${zh ? "你看到了什么？" : "What happened?"}<textarea name="observation" rows="3" minlength="10" required placeholder="${zh ? "例如：睡觉后，温室里的草莓没有进入下一阶段。" : "Example: after sleeping, the strawberries in my greenhouse did not advance."}"></textarea></label>
      <label>${zh ? "你已经尝试了什么？" : "What did you try?"}<textarea name="tried" rows="3" minlength="10" required placeholder="${zh ? "写清楚季节、地点、步骤和是否重载。" : "Include season, location, steps and whether you reloaded."}"></textarea></label>
      <div class="question-builder-actions"><button class="btn" type="submit" data-copy-question>${copy}</button><button class="btn btn-outline" type="button" data-open-steam>${open}</button><button class="btn btn-outline" type="button" data-send-report>${send}</button></div>
      <p class="form-status" data-question-status aria-live="polite"></p>
      <label class="question-preview-label">${zh ? "问题预览" : "Question preview"}<textarea class="question-preview" data-question-preview readonly rows="9"></textarea></label>
      <p class="tool-crosslink"><a href="${zh ? "/zh/tools/player-report" : "/tools/player-report"}">${zh ? "需要更完整的复现报告？打开玩家问题整理器 →" : "Need a fuller reproduction report? Open the Player Report Builder →"}</a></p>
    </form>
  </div></section>`;
}

function renderPage(zh) {
  const lang = zh ? "zh-CN" : "en";
  const route = zh ? "/zh/community" : "/community";
  const counterpart = zh ? "/community" : "/zh/community";
  const title = zh ? "社区雷达 | 牧场主指南" : "Community Radar | The Ranchers Guide";
  const description = zh ? "整理 The Ranchers 当前 Steam 讨论：官方答复、开放问题、原帖入口和可复现提问工具。" : "A source-linked radar for current The Ranchers discussions: official replies, open questions, original threads and a reproducible question builder.";
  const labels = zh ? {
    home: "首页", community: "社区雷达", source: "来源入口", live: "最新社区信号", intro: "它把公开社区里正在出现的问题整理成可追踪的线索，并为每条线索提供状态、来源、版本边界、风险和下一步入口；经过核对的内容再进入正式指南。", answered: "最新社区信号", follow: "值得继续跟踪的问题", filter: "筛选", all: "全部", count: "条记录", search: "搜索问题、平台或主题", empty: "没有匹配记录，换个词或清除筛选。", external: "其他讨论入口", steam: "Steam 讨论区", news: "Steam 官方新闻", reddit: "Reddit 相关讨论", youtube: "YouTube 搜索", wiki: "官方 Wiki（历史分类参考）", policy: "来源处理", policyText: "Steam、Reddit 和 Wiki 提供原始讨论或参考资料；本站提取短摘要、标注来源并保留证据状态。想参与讨论，请使用自己的账号在原平台发言。", build: `最新整理基线：${data.build}`, updated: `最后更新：${data.updatedAt}`
  } : {
    home: "Home", community: "Community Radar", source: "Source-linked community desk", live: "Latest community signals", intro: "It organizes questions appearing in public communities into traceable leads, with a status, source, build boundary, risk note and next step for each one. Checked findings can then inform the formal guide.", answered: "Latest community signals", follow: "Questions worth following", filter: "Filter", all: "All", count: "records", search: "Search questions, platforms or topics", empty: "No matching records. Clear a filter or try another word.", external: "Other discussion spaces", steam: "Steam Discussions", news: "Steam official news", reddit: "Related Reddit discussion", youtube: "Search YouTube", wiki: "Official Wiki (historical taxonomy only)", policy: "Source handling", policyText: "Steam, Reddit and the Wiki provide the original discussions or reference material. This page keeps compact summaries, source links and evidence status together; use your own account when joining the original community.", build: `Current research baseline: ${data.build}`, updated: `Last updated: ${data.updatedAt}`
  };
  const official = data.sources.filter((entry) => entry.status === "official");
  const questions = data.sources.filter((entry) => entry.status === "question");
  const reported = data.sources.filter((entry) => entry.status === "reported");
  const topicOrder = ["farming", "animals", "npcs", "materials", "quests", "bugs", "economy", "building", "general"];
  const topicLabels = zh ? { farming: "种田", animals: "动物", npcs: "NPC", materials: "材料", quests: "任务", bugs: "问题 / Bug", economy: "经济", building: "建造", general: "综合" } : { farming: "Farming", animals: "Animals", npcs: "NPCs", materials: "Materials", quests: "Quests", bugs: "Bugs", economy: "Economy", building: "Building", general: "General" };
  const filterOptions = topicOrder.filter((topic) => data.sources.some((entry) => entry.topic === topic)).map((topic) => `<option value="${topic}">${topicLabels[topic]}</option>`).join("");
  const external = [
    ["https://steamcommunity.com/app/1501310/discussions/", labels.steam],
    ["https://steamcommunity.com/app/1501310/allnews/", labels.news],
    ["https://steamcommunity.com/app/1501310/guides/", zh ? "Steam 玩家指南" : "Steam Community Guides"],
    ["https://www.reddit.com/r/CozyGamers/search/?q=The%20Ranchers&restrict_sr=1", labels.reddit],
    ["https://www.youtube.com/results?search_query=The+Ranchers+game", labels.youtube],
    ["https://wiki.ranchers.game/", labels.wiki],
    ["https://www.ranchers.game/presskit", zh ? "官方 Press Kit" : "Official Press Kit"],
  ];
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="https://theranchersguide.com${route}">
  <link rel="alternate" hreflang="en" href="https://theranchersguide.com/community"><link rel="alternate" hreflang="zh-CN" href="https://theranchersguide.com/zh/community"><link rel="alternate" hreflang="x-default" href="https://theranchersguide.com/community">
  <meta property="og:type" content="website"><meta property="og:site_name" content="The Ranchers Guide"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="https://theranchersguide.com${route}"><meta property="og:image" content="https://theranchersguide.com/assets/img/og-cover.jpg">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css?v=20260821-ui1">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4804883741146501" crossorigin="anonymous"></script>
  <script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", name: title, description, url: `https://theranchersguide.com${route}`, inLanguage: lang })}</script>
</head>
<body>
  <header class="site-header"><nav class="nav-inner" aria-label="Main navigation"><a class="logo" href="${zh ? "/zh/" : "/"}"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide<small>${zh ? "非官方玩家资料" : "Unofficial fan resource"}</small></span></a><button class="nav-toggle" aria-expanded="false" aria-label="Toggle navigation">☰</button><ul class="nav-links"><li><a href="${zh ? "/zh/guides/beginners-guide" : "/guides/beginners-guide"}">${zh ? "攻略" : "Guides"}</a></li><li><a href="${zh ? "/zh/database" : "/database"}">${zh ? "知识库" : "Database"}</a></li><li><a href="${zh ? "/zh/map" : "/map"}">${zh ? "地图" : "Map"}</a></li><li><a href="${zh ? "/zh/problems" : "/problems"}">${zh ? "问题" : "Problems"}</a></li><li><a href="${zh ? "/zh/search" : "/search"}">${zh ? "搜索" : "Search"}</a></li><li><a class="nav-cta active" href="${route}" aria-current="page">${zh ? "社区" : "Community"}</a></li></ul></nav></header>
  <main>
    <section class="knowledge-hero"><div class="container knowledge-hero-inner"><div><nav class="breadcrumb" aria-label="Breadcrumb"><a href="${zh ? "/zh/" : "/"}">${labels.home}</a> / ${labels.community}</nav><span class="kicker">${labels.live} · ${escapeHtml(labels.build)}</span><h1>${labels.community}</h1><p class="lead">${labels.intro}</p><p class="button-stack"><a class="btn" href="#radar">${zh ? "查看社区信号" : "Browse community signals"}</a><a class="btn btn-outline" href="#ask">${zh ? "报告一个问题" : "Report a problem"}</a></p></div><dl class="coverage-summary"><div><dt>${zh ? "跟踪记录" : "Tracked records"}</dt><dd>${data.sources.length}</dd></div><div><dt>${zh ? "官方答复" : "Official replies"}</dt><dd>${official.length}</dd></div><div><dt>${zh ? "玩家报告" : "Reported leads"}</dt><dd>${reported.length}</dd></div><div><dt>${zh ? "最后更新" : "Updated"}</dt><dd>${escapeHtml(data.updatedAt)}</dd></div></dl></div></section>
    <section class="section" id="radar"><div class="container"><div class="section-head"><span class="kicker">${zh ? "状态分层" : "Status lanes"}</span><h2>${labels.answered}</h2><p>${zh ? "确认、待核验和玩家报告分开显示；历史资料只在来源台标出，不混进当前答案。" : "Confirmed answers, open investigations and player reports stay separate; historical material is marked in the reference desk."}</p><div class="community-status-legend" aria-label="${zh ? "社区信号状态" : "Community signal statuses"}"><span class="evidence-badge evidence-official">${zh ? "已确认" : "Confirmed"}</span><span class="evidence-badge evidence-corroborated">${zh ? "待核验" : "Investigating"}</span><span class="evidence-badge evidence-lead">${zh ? "玩家报告" : "Reported"}</span><span class="evidence-badge evidence-historical">${zh ? "历史资料" : "Historical"}</span></div></div><div class="community-radar-toolbar"><label class="community-search-label">${labels.search}<input type="search" data-community-query placeholder="${labels.search}"></label><label>${labels.filter}<select data-community-filter><option value="all">${labels.all}</option>${filterOptions}</select></label><span class="community-result-count"><strong data-community-count>${data.sources.length}</strong> ${labels.count}</span></div><div class="community-radar-grid">${data.sources.map((entry) => renderCard(entry, zh)).join("\n")}</div><p class="community-empty" data-community-empty hidden>${labels.empty}</p></div></section>
    ${renderQuestionBuilder(zh)}
    <section class="section alt" id="reference-desk"><div class="container"><div class="section-head"><span class="kicker">${zh ? "外部资料" : "External sources"}</span><h2>${zh ? "资料台：知道该去哪里查" : "Reference desk: know where to look next"}</h2><p>${zh ? "这些入口不是本站原创事实库，而是经过分类的原始来源和研究线索。打开前先看状态标签，避免把旧资料或单条玩家经验当成当前结论。" : "These links are not copied into the guide. They are classified source entries and research leads; check the status before treating anything as a current fact."}</p></div><div class="community-reference-grid">${data.externalResources.map((resource) => renderExternalResourceCard(resource, zh)).join("\n")}</div></div></section>
    <section class="section"><div class="container community-sources-layout"><div><div class="section-head"><span class="kicker">${labels.external}</span><h2>${zh ? "在原平台继续交流" : "Continue in the original community"}</h2><p>${zh ? "从这里进入 Steam、Reddit、YouTube 和 Wiki，继续查看讨论、分享截图或补充自己的实测。" : "Use these links to continue discussions, share screenshots or add your own testing on Steam, Reddit, YouTube and the Wiki."}</p></div><div class="external-source-list">${external.map(([url, label]) => externalLink(url, label)).join("")}</div></div><aside class="source-panel"><h2>${labels.policy}</h2><p>${labels.policyText}</p><p><a href="/contribute">${zh ? "提交可复现报告" : "Submit a reproducible report"}</a> · <a href="${counterpart}">${zh ? "English" : "中文"}</a></p></aside></div></section>
  </main>
  <footer class="site-footer"><div class="container"><div class="footer-grid"><div><h4>The Ranchers Guide</h4><p>${zh ? "独立、非官方、带证据版本的 Early Access 玩家资料。" : "Independent, fan-made Early Access help with versioned evidence."}</p><p class="disclaimer">${zh ? "不隶属于 RedPilz Studio 或 Trophy Games。" : "Not affiliated with RedPilz Studio or Trophy Games."}</p></div><nav aria-label="Footer help"><h4>${zh ? "帮助" : "Help"}</h4><ul><li><a href="${zh ? "/zh/guides/beginners-guide" : "/guides/beginners-guide"}">${zh ? "攻略" : "Guides"}</a></li><li><a href="${zh ? "/zh/map" : "/map"}">${zh ? "地图" : "Map"}</a></li><li><a href="${zh ? "/zh/problems" : "/problems"}">${zh ? "问题排查" : "Problems"}</a></li></ul></nav><nav aria-label="Footer site"><h4>${zh ? "站点" : "Site"}</h4><ul><li><a href="${zh ? "/zh/search" : "/search"}">${zh ? "搜索" : "Search"}</a></li><li><a href="/contribute">${zh ? "投稿" : "Contribute"}</a></li><li><a href="/research">${zh ? "研究队列" : "Research"}</a></li><li><a href="/about">${zh ? "关于" : "About"}</a></li><li><a href="/contact">${zh ? "联系" : "Contact"}</a></li><li><a href="/privacy">${zh ? "隐私" : "Privacy"}</a></li></ul></nav></div><div class="footer-bottom"><span>&copy; <span data-year></span> The Ranchers Guide</span><span>${zh ? "原帖真实，摘要简明，结论有证据。" : "Original threads, compact summaries, evidence-gated answers."}</span></div></div></footer>
  <script src="/assets/js/main.js?v=20260820-community1" defer></script><script src="/assets/js/community.js?v=20260820-community1" defer></script>
</body></html>`;
}

const outputs = [
  ["community.html", renderPage(false)],
  ["zh/community.html", renderPage(true)],
];
for (const [relative, content] of outputs) {
  const target = path.join(root, relative);
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== content) throw new Error(`${relative} is missing or out of sync; run node scripts/build-community.cjs`);
    console.log(`PASS: ${relative} is in sync.`);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
    console.log(`Wrote ${relative}.`);
  }
}
