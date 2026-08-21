const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "materials.json"), "utf8"));
const checkOnly = process.argv.includes("--check");

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

const labels = {
  en: {
    title: "The Ranchers Materials Database — Stone, Wood, Hay, Charcoal & Zirconite",
    description: "Find current, source-linked The Ranchers material routes for Stone, Wood Logs, Hay, Charcoal and Zirconite, including what remains unverified.",
    breadcrumb: "Materials",
    heading: "The Ranchers Materials Database",
    lead: "Start with the material you need. Each answer separates a usable current route from a historical method or an unresolved supply gap.",
    currentNote: "Mines are not available in the reviewed Early Access build. Zirconite therefore has a purchase route, while reliable repeatable Stone supply still needs verification.",
    contents: "Materials",
    source: "Source",
    build: "Build",
    evidence: { official: "Official", "video-observed": "Video-observed", "community-confirmed": "Community-confirmed", "unverified-lead": "Single-source lead" },
    unknown: "Unknown remains unknown",
    unknownCopy: "Prices, respawn timers, drop rates and controls are omitted when retained evidence cannot reproduce them.",
    map: "Find City Hall on the map",
    animal: "Open the chicken care guide",
    building: "Back to building and placement",
    footer: "Current routes first; missing evidence stays visible",
    nav: ["Guides", "Database", "Map", "Problems", "Research", "Search", "Contribute"]
  },
  zh: {
    title: "The Ranchers 材料数据库：石头、原木、干草、木炭与锆矿",
    description: "查询 The Ranchers 石头、原木、干草、木炭与锆矿的当前获取路线、证据来源和仍未验证的信息。",
    breadcrumb: "材料",
    heading: "The Ranchers 材料数据库",
    lead: "先选择你缺少的材料。每条答案都会区分当前可用路线、历史方法和仍未解决的供应缺口。",
    currentNote: "当前审查的抢先体验版本尚未开放矿洞。因此锆矿需要购买，而可靠的可重复石头来源仍待验证。",
    contents: "材料目录",
    source: "来源",
    build: "版本",
    evidence: { official: "官方", "video-observed": "视频观测", "community-confirmed": "社区互证", "unverified-lead": "单一线索" },
    unknown: "不知道的内容保持未知",
    unknownCopy: "没有可复现证据时，不发布价格、刷新时间、掉率或操作按键。",
    map: "在地图中查找市政厅",
    animal: "打开养鸡指南",
    building: "返回建造与放置指南（英文）",
    footer: "优先给当前路线，缺失证据保持可见",
    nav: ["新手", "知识库", "地图", "问题", "搜索", "投稿"]
  }
};

function sourceHtml(ids, locale) {
  return ids.map((id) => {
    const source = data.sources[id];
    const text = esc(source.title);
    return source.url ? `<a href="${esc(source.url)}" rel="noopener noreferrer">${text}</a>` : `<span>${text} · original URL not retained</span>`;
  }).join(" · ");
}

function badge(fact, locale) {
  const cls = fact.validity === "historical" ? "historical" : fact.evidenceLevel === "official" ? "evidence-official" : fact.evidenceLevel === "video-observed" ? "evidence-video" : fact.evidenceLevel === "community-confirmed" ? "evidence-corroborated" : "evidence-lead";
  return `<span class="tag ${cls}">${labels[locale].evidence[fact.evidenceLevel]}${fact.validity === "historical" ? " · historical" : ""}</span>`;
}

function render(locale) {
  const zh = locale === "zh";
  const l = labels[locale];
  const prefix = zh ? "/zh" : "";
  const navLinks = zh
    ? [["/zh/guides/beginners-guide",0],["/zh/database",1],["/zh/map",2],["/zh/problems",3],["/zh/search",4],["/contribute",5]]
    : [["/guides/beginners-guide",0],["/database",1],["/map",2],["/problems",3],["/research",4],["/search",5],["/contribute",6]];
  const sections = data.materials.map((material) => {
    const facts = material.facts.map((fact) => `          <li${fact.validity === "historical" ? ' class="fact-historical"' : ""}><p>${esc(zh ? fact.zhText : fact.text)} ${badge(fact, locale)}</p><p class="fact-source"><strong>${l.source}:</strong> ${sourceHtml(fact.sourceIds, locale)} · <strong>${l.build}:</strong> ${esc(fact.build || "not specified")}</p></li>`).join("\n");
    const extra = material.id === "zirconite" ? `<a class="btn btn-outline" href="${prefix}/map?q=${encodeURIComponent(zh ? "锆矿" : "zirconite")}">${l.map}</a>` : material.id === "hay" ? `<a class="btn btn-outline" href="${prefix}/guides/animal-guide#feeding">${l.animal}</a>` : "";
    return `      <section class="evidence-ledger material-profile" id="${material.id}" data-search-entry data-search-title="${esc(zh ? material.zhSearchTitle : material.searchTitle)}" data-search-tags="${esc(zh ? material.zhSearchTags : material.searchTags)}">
        <div class="section-heading-row"><div><span class="kicker">${l.breadcrumb}</span><h2>${esc(zh ? material.zhName : material.name)}</h2></div><span class="tag">${data.meta.lastUpdated}</span></div>
        <p class="lead">${esc(zh ? material.zhSummary : material.summary)}</p>
        <ul class="evidence-list">${facts}</ul>
        ${extra}
      </section>`;
  }).join("\n\n");
  const toc = data.materials.map((material) => `<li><a href="#${material.id}">${esc(zh ? material.zhName : material.name)}</a></li>`).join("");
  const nav = navLinks.map(([href, index]) => `<li><a${index === 1 ? ' class="active"' : ""} href="${href}">${l.nav[index]}</a></li>`).join("");
  const alternateEn = "https://theranchersguide.com/database/materials";
  const alternateZh = "https://theranchersguide.com/zh/database/materials";
  const canonical = zh ? alternateZh : alternateEn;
  return `<!DOCTYPE html>
<!-- GENERATED by scripts/build-materials.cjs from data/materials.json — do not edit directly. -->
<html lang="${zh ? "zh-CN" : "en"}"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${l.title}</title><meta name="description" content="${l.description}">
  <link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="en" href="${alternateEn}"><link rel="alternate" hreflang="zh-CN" href="${alternateZh}"><link rel="alternate" hreflang="x-default" href="${alternateEn}">
  <meta property="og:type" content="website"><meta property="og:site_name" content="The Ranchers Guide"><meta property="og:title" content="${l.title}"><meta property="og:description" content="${l.description}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://theranchersguide.com/assets/img/guide-barn.webp">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css?v=20260821-ui1"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4804883741146501" crossorigin="anonymous"></script>
</head><body>
  <header class="site-header"><nav class="nav-inner" aria-label="${zh ? "主导航" : "Main navigation"}"><a class="logo" href="${prefix}/"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide<small>${zh ? "非官方中文玩家指南" : "Unofficial fan resource"}</small></span></a><button class="nav-toggle" aria-expanded="false" aria-label="${zh ? "展开导航" : "Toggle navigation"}">☰</button><ul class="nav-links">${nav}</ul></nav></header>
  <main><article class="article" style="max-width:980px"><nav class="breadcrumb" aria-label="${zh ? "面包屑" : "Breadcrumb"}"><a href="${prefix}/">${zh ? "首页" : "Home"}</a> / <a href="${prefix}/database">${zh ? "知识库" : "Database"}</a> / ${l.breadcrumb}</nav>
    <h1>${l.heading}</h1><p class="meta">${zh ? "页面基线" : "Page baseline"}: ${data.meta.build} · ${zh ? "更新" : "Updated"} ${data.meta.lastUpdated}</p>
    <p class="lead">${l.lead}</p><div class="notice warning"><strong>${zh ? "当前版本边界：" : "Current-build boundary:"}</strong> ${l.currentNote}</div>
    <nav class="toc" aria-label="${l.contents}"><strong>${l.contents}</strong><ul>${toc}</ul></nav>
${sections}
    <section class="answer-box"><h2>${l.unknown}</h2><p>${l.unknownCopy}</p><a class="btn" href="/guides/building-construction#materials">${l.building}</a></section>
  </article></main><footer class="site-footer"><div class="container"><div class="footer-bottom"><span>&copy; <span data-year></span> The Ranchers Guide</span><span>${l.footer}</span></div></div></footer><script src="/assets/js/main.js?v=20260810-nav1" defer></script>
</body></html>`;
}

const outputs = [
  [path.join(root, "database", "materials.html"), render("en")],
  [path.join(root, "zh", "database", "materials.html"), render("zh")]
];

let drifted = false;
for (const [file, html] of outputs) {
  if (checkOnly) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== html) drifted = true;
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html, "utf8");
  }
}
if (checkOnly && drifted) {
  console.error("Materials pages are out of sync with data/materials.json.");
  process.exit(1);
}
if (!checkOnly) console.log(`Wrote bilingual materials pages from ${data.materials.length} records.`);
