/* Build the bilingual Creator Notes pages from data/creator-notes.json. */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "creator-notes.json"), "utf8"));
const checkOnly = process.argv.includes("--check");

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function routeFor(route, zh) {
  if (!zh) return route;
  if (route === "/map") return "/zh/map";
  if (route === "/community") return "/zh/community";
  if (route === "/methodology") return "/methodology";
  if (route === "/research") return "/research";
  if (route === "/database") return "/zh/database";
  if (route.startsWith("/database/")) return `/zh${route}`;
  if (route.startsWith("/guides/")) return `/zh${route}`;
  if (route.startsWith("/tools/")) return `/zh${route}`;
  return route;
}

function nav(zh) {
  const prefix = zh ? "/zh" : "";
  return `<li><a href="${prefix}/guides/beginners-guide">${zh ? "新手" : "Guides"}</a></li><li><a href="${prefix}/database">${zh ? "知识库" : "Database"}</a></li><li><a href="${prefix}/map">${zh ? "地图" : "Map"}</a></li><li><a href="${prefix}/problems">${zh ? "问题" : "Problems"}</a></li><li><a href="${prefix}/search">${zh ? "搜索" : "Search"}</a></li><li><a class="nav-cta" href="/contribute">${zh ? "投稿" : "Contribute"}</a></li>`;
}

function card(note, zh) {
  const text = (key) => zh ? note[`zh${key[0].toUpperCase()}${key.slice(1)}`] : note[key];
  const related = note.related.map((link) => `<a class="creator-note-related-link" href="${esc(routeFor(link.route, zh))}">${esc(zh ? link.zhLabel : link.label)}</a>`).join("");
  const title = zh ? note.zhName : note.name;
  const tags = `${title} ${note.kind.en} ${note.kind.zh} ${note.build}`;
  return `<article class="creator-note-card" data-search-entry data-search-title="${esc(title)}" data-search-tags="${esc(tags)}" data-search-status="${zh ? "来源笔记" : "Creator note"}" id="${esc(note.id)}"><div class="creator-note-card-head"><div><span class="kicker">${esc(zh ? note.kind.zh : note.kind.en)}</span><h2>${esc(title)}</h2></div><span class="evidence-badge evidence-${note.id === "games-station" ? "video" : note.id === "official-wiki" ? "official" : "corroborated"}">${esc(zh ? "来源入口" : "Source entry")}</span></div><p class="creator-note-meta"><strong>${zh ? "来源" : "Source"}:</strong> <a href="${esc(note.sourceUrl)}" rel="noopener noreferrer">${esc(note.sourceTitle)}</a> · <strong>${zh ? "复核" : "Reviewed"}:</strong> ${esc(note.sourceDate)} · <strong>${zh ? "版本范围" : "Build scope"}:</strong> ${esc(note.build)}</p><div class="creator-note-grid"><div><h3>${zh ? "它能帮助你什么" : "What it helps with"}</h3><p>${esc(text("scope"))}</p></div><div><h3>${zh ? "本站如何使用" : "How this site uses it"}</h3><p>${esc(text("use"))}</p></div><div><h3>${zh ? "使用风险" : "Use risk"}</h3><p>${esc(text("risk"))}</p></div></div><div class="creator-note-related"><strong>${zh ? "继续查找" : "Continue with"}</strong><div>${related}</div></div></article>`;
}

function render(zh) {
  const prefix = zh ? "/zh" : "";
  const canonical = `https://theranchersguide.com${prefix}/creator-notes`;
  const alternate = `https://theranchersguide.com${zh ? "/creator-notes" : "/zh/creator-notes"}`;
  const title = zh ? "The Ranchers Guide 来源笔记：视频、社区攻略与 Wiki" : "The Ranchers Guide Creator Notes: Videos, Guides and Wiki References";
  const description = zh ? "整理 The Ranchers 视频作者、社区攻略和官方 Wiki 的可用价值、版本边界与风险。" : "Source-linked notes on The Ranchers videos, community guides and the official Wiki, with build boundaries and use risks.";
  const heading = zh ? "Creator Notes 来源笔记" : "Creator Notes";
  const lead = zh ? "这里记录其他作者和资料源能帮助我们核对什么，以及哪些内容不能直接当成当前版本答案。本站做摘要、比较和证据筛选，不复制原文、图片或视频。" : "These notes explain what other creators and reference sources help us check, and what cannot be treated as a current-build answer. The site adds summaries, comparisons and evidence gates; it does not copy prose, images or video.";
  const boundary = zh ? "版本先于结论：每条来源都有日期和适用范围，旧版本线索不会自动升级成当前机制。" : "Build before conclusion: every source has a date and scope, and an older lead does not become a current mechanic automatically.";
  return `<!DOCTYPE html><html lang="${zh ? "zh-CN" : "en"}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="en" href="https://theranchersguide.com/creator-notes"><link rel="alternate" hreflang="zh-CN" href="https://theranchersguide.com/zh/creator-notes"><link rel="alternate" hreflang="x-default" href="https://theranchersguide.com/creator-notes"><meta property="og:type" content="website"><meta property="og:site_name" content="The Ranchers Guide"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://theranchersguide.com/assets/img/og-cover.jpg"><link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css?v=20260821-ui1"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4804883741146501" crossorigin="anonymous"></script></head><body><header class="site-header"><nav class="nav-inner" aria-label="${zh ? "主导航" : "Main navigation"}"><a class="logo" href="${prefix || "/"}"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide<small>${zh ? "非官方中文玩家指南" : "Unofficial fan resource"}</small></span></a><button class="nav-toggle" aria-expanded="false" aria-label="${zh ? "展开导航" : "Toggle navigation"}">☰</button><ul class="nav-links">${nav(zh)}</ul></nav></header><main><article class="article creator-notes-page"><nav class="breadcrumb" aria-label="${zh ? "面包屑" : "Breadcrumb"}"><a href="${prefix || "/"}">${zh ? "首页" : "Home"}</a> / ${heading}</nav><span class="kicker">${zh ? "来源与编辑" : "Source and editing"} · ${esc(data.meta.build)}</span><h1>${heading}</h1><p class="lead">${esc(lead)}</p><div class="notice info"><strong>${zh ? "编辑边界：" : "Editorial boundary: "}</strong>${esc(boundary)}</div><section class="creator-notes-list" aria-label="${heading}">${data.notes.map((note) => card(note, zh)).join("")}</section><section class="section-head creator-notes-next"><span class="kicker">${zh ? "回到知识库" : "Back to the knowledge base"}</span><h2>${zh ? "把来源线索变成可用答案" : "Turn source leads into usable answers"}</h2><p>${zh ? "需要当前版本的可执行结论时，继续查看更新、社区信号和方法说明；来源笔记本身不替代这些页面。" : "When you need a current-build action, continue to Updates, Community Radar or the methodology page; these notes do not replace those pages."}</p><p class="button-stack"><a class="btn" href="${prefix}/updates">${zh ? "查看更新" : "Browse updates"}</a><a class="btn btn-outline" href="${prefix}/community">${zh ? "查看社区信号" : "Browse community signals"}</a><a class="btn btn-outline" href="/methodology">${zh ? "查看证据方法" : "Read the evidence method"}</a></p></section></article></main><footer class="site-footer"><div class="container"><div class="footer-grid"><div><h4>The Ranchers Guide</h4><p>${zh ? "按版本和证据整理的非官方抢先体验资料。" : "Unofficial Early Access help organized by build and evidence."}</p><p class="disclaimer">${zh ? "不隶属于 RedPilz Studio 或 Trophy Games。" : "Not affiliated with RedPilz Studio or Trophy Games."}</p></div><nav aria-label="${zh ? "帮助" : "Help"}"><h4>${zh ? "帮助" : "Help"}</h4><ul><li><a href="${prefix}/updates">${zh ? "更新" : "Updates"}</a></li><li><a href="${prefix}/community">${zh ? "社区雷达" : "Community Radar"}</a></li><li><a href="${prefix}/creator-notes">Creator Notes</a></li></ul></nav><nav aria-label="${zh ? "站点" : "Site"}"><h4>${zh ? "站点" : "Site"}</h4><ul><li><a href="${prefix}/database">${zh ? "知识库" : "Database"}</a></li><li><a href="${prefix}/map">${zh ? "地图" : "Map"}</a></li><li><a href="${prefix}/search">${zh ? "搜索" : "Search"}</a></li><li><a href="/about">${zh ? "关于" : "About"}</a></li></ul></nav></div><div class="footer-bottom"><span>&copy; <span data-year></span> The Ranchers Guide</span><span>${zh ? "来源有链接，结论有边界。" : "Linked sources, bounded conclusions."}</span></div></div></footer><script src="/assets/js/main.js?v=20260810-nav1" defer></script></body></html>`;
}

const outputs = [{ file: "creator-notes.html", content: render(false) }, { file: "zh/creator-notes.html", content: render(true) }];
for (const output of outputs) {
  const target = path.join(root, output.file);
  if (checkOnly) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output.content) throw new Error(`${output.file} is missing or out of sync. Re-run: node scripts/build-creator-notes.cjs`);
  } else {
    fs.writeFileSync(target, output.content);
  }
}
console.log(`PASS: bilingual Creator Notes pages from ${data.notes.length} source entries.`);
