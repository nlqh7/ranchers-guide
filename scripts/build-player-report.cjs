const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const topics = JSON.parse(fs.readFileSync(path.join(root, "data", "player-report.json"), "utf8"));

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function jsonScript(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function renderTopicOptions(zh) {
  return topics.map((topic) => `<option value="${escapeHtml(topic.id)}">${escapeHtml(zh ? topic.labelZh : topic.label)}</option>`).join("");
}

function renderHeader(zh) {
  return `<header class="site-header"><nav class="nav-inner" aria-label="Main navigation"><a class="logo" href="${zh ? "/zh/" : "/"}"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide<small>${zh ? "非官方玩家资料" : "Unofficial fan resource"}</small></span></a><button class="nav-toggle" aria-expanded="false" aria-label="${zh ? "展开导航" : "Toggle navigation"}">☰</button><ul class="nav-links"><li><a href="${zh ? "/zh/guides/beginners-guide" : "/guides/beginners-guide"}">${zh ? "攻略" : "Guides"}</a></li><li><a href="${zh ? "/zh/database" : "/database"}">${zh ? "知识库" : "Database"}</a></li><li><a href="${zh ? "/zh/map" : "/map"}">${zh ? "地图" : "Map"}</a></li><li><a href="${zh ? "/zh/problems" : "/problems"}">${zh ? "问题" : "Problems"}</a></li><li><a href="${zh ? "/zh/community" : "/community"}">${zh ? "社区" : "Community"}</a></li><li><a href="${zh ? "/zh/search" : "/search"}">${zh ? "搜索" : "Search"}</a></li><li><a class="nav-cta" href="/contribute">${zh ? "投稿" : "Contribute"}</a></li></ul></nav></header>`;
}

function renderPage(zh) {
  const lang = zh ? "zh-CN" : "en";
  const route = zh ? "/zh/tools/player-report" : "/tools/player-report";
  const counterpart = zh ? "/tools/player-report" : "/zh/tools/player-report";
  const title = zh ? "玩家问题整理器 | 牧场主指南" : "Player Report Builder | The Ranchers Guide";
  const description = zh ? "把 The Ranchers 的模糊问题整理成带版本、步骤、截图和答案入口的可复现报告。" : "Turn a vague The Ranchers problem into a reproducible report with a build, steps, screenshot context and the right answer route.";
  const copy = zh ? {
    home: "首页", kicker: "原创玩家工具", heading: "把“怎么回事”整理成别人能回答的问题", lead: "先找到最接近的答案入口，再按最小证据清单记录问题。报告只在你点击后复制、打开 Steam 或发邮件，不会自动上传。", notice: "隐私提示：输入只存在当前页面，不写入服务器，也不保存到浏览器。截图请使用公开链接或在原平台直接上传。", topic: "问题主题", build: "游戏版本", platform: "平台", context: "场景 / 地点 / 日期", observation: "你看到了什么？", steps: "你做了哪些步骤？", expected: "你原本期待什么？", screenshot: "截图链接", optional: "可选", report: "生成报告", result: "你的下一步", start: "先看对应答案", checklist: "建议记录", preview: "报告预览", copy: "复制报告", steam: "打开 Steam 讨论区", email: "发给本站审核", empty: "填写现象后，这里会生成结构化报告。", status: "报告已复制。", missing: "先填写现象和步骤。", foot: "报告是待审核线索，不代表本站已确认事实。"
  } : {
    home: "Home", kicker: "Original player tool", heading: "Turn “what happened?” into an answerable report", lead: "Start with the closest existing answer, then record the minimum evidence another player needs. Nothing is uploaded until you choose Steam or email.", notice: "Privacy note: your inputs stay on this page. They are not sent to a server or saved in your browser. Use a public screenshot URL or attach images on the original platform.", topic: "Problem topic", build: "Game build", platform: "Platform", context: "Context / place / day", observation: "What happened?", steps: "What steps did you take?", expected: "What did you expect?", screenshot: "Screenshot link", optional: "Optional", report: "Build report", result: "Your next step", start: "Start with this answer", checklist: "Record these details", preview: "Report preview", copy: "Copy report", steam: "Open Steam Discussions", email: "Send for guide review", empty: "A structured report will appear here after you describe the problem.", status: "Report copied.", missing: "Add what happened and the steps you tried first.", foot: "This is a review lead, not a confirmed game fact."
  };
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="noindex,follow">
  <link rel="canonical" href="https://theranchersguide.com${route}">
  <link rel="alternate" hreflang="en" href="https://theranchersguide.com/tools/player-report"><link rel="alternate" hreflang="zh-CN" href="https://theranchersguide.com/zh/tools/player-report"><link rel="alternate" hreflang="x-default" href="https://theranchersguide.com/tools/player-report">
  <meta property="og:type" content="website"><meta property="og:site_name" content="The Ranchers Guide"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="https://theranchersguide.com${route}"><meta property="og:image" content="https://theranchersguide.com/assets/img/og-cover.jpg">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css?v=20260821-ui1">
  <script type="application/ld+json">${jsonScript({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: title, applicationCategory: "UtilitiesApplication", operatingSystem: "Any web browser", isAccessibleForFree: true, url: `https://theranchersguide.com${route}`, description })}</script>
</head>
<body>
  ${renderHeader(zh)}
  <main>
    <div class="container section report-builder-page">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="${zh ? "/zh/" : "/"}">${copy.home}</a> / <a href="${zh ? "/zh/community" : "/community"}">${zh ? "社区雷达" : "Community Radar"}</a> / ${copy.heading}</nav>
      <div class="tool-intro"><div><span class="kicker">${copy.kicker}</span><h1>${copy.heading}</h1><p class="lead">${copy.lead}</p></div><div class="report-intro-mark" aria-hidden="true">?</div></div>
      <div class="notice info"><strong>${copy.notice}</strong></div>
      <div class="report-builder-layout">
        <form class="calc-panel report-builder" data-player-report-form novalidate>
          <div class="form-heading"><div><span class="kicker">01</span><h2>${copy.report}</h2></div></div>
          <div class="calc-field"><label for="report-topic">${copy.topic}</label><select id="report-topic" name="topic">${renderTopicOptions(zh)}</select></div>
          <div class="form-grid cols-2"><div class="calc-field"><label for="report-build">${copy.build}</label><input id="report-build" name="build" value="0.8.10.562" maxlength="30"></div><div class="calc-field"><label for="report-platform">${copy.platform}</label><select id="report-platform" name="platform"><option>Windows</option><option>Steam Deck</option><option>${zh ? "其他 PC 配置" : "Other PC setup"}</option></select></div></div>
          <div class="calc-field"><label for="report-context">${copy.context} <span class="optional">${copy.optional}</span></label><input id="report-context" name="context" maxlength="120" placeholder="${zh ? "例如：第 12 天，City Hall 附近" : "e.g. Day 12, near City Hall"}"></div>
          <div class="calc-field"><label for="report-observation">${copy.observation}</label><textarea id="report-observation" name="observation" rows="4" maxlength="900" minlength="10" required placeholder="${zh ? "只写你看到的现象，不先猜原因。" : "Describe what you saw without guessing the cause first."}"></textarea></div>
          <div class="calc-field"><label for="report-steps">${copy.steps}</label><textarea id="report-steps" name="steps" rows="4" maxlength="900" minlength="10" required placeholder="${zh ? "按时间顺序写操作、地点、重载或联机情况。" : "List the actions, place, reloads or co-op conditions in order."}"></textarea></div>
          <div class="calc-field"><label for="report-expected">${copy.expected} <span class="optional">${copy.optional}</span></label><textarea id="report-expected" name="expected" rows="2" maxlength="500"></textarea></div>
          <div class="calc-field"><label for="report-screenshot">${copy.screenshot} <span class="optional">${copy.optional}</span></label><input id="report-screenshot" name="screenshot" type="url" maxlength="500" placeholder="https://..."></div>
          <button class="btn" type="submit">${copy.report}</button>
        </form>
        <section class="report-result" aria-labelledby="report-result-title" data-player-report-result>
          <div class="report-result-empty" data-report-empty><span class="kicker">02</span><h2 id="report-result-title">${copy.result}</h2><p>${copy.empty}</p></div>
          <div data-report-output hidden>
            <span class="kicker">02</span><h2>${copy.result}</h2>
            <div class="report-next-step"><span class="kicker">${copy.start}</span><h3 data-report-route-label></h3><p data-report-prompt></p><a class="btn btn-outline" data-report-route href="#">${copy.start}</a></div>
            <div class="report-checklist"><h3>${copy.checklist}</h3><ul data-report-checklist></ul></div>
            <div class="calc-field"><label for="report-preview">${copy.preview}</label><textarea id="report-preview" class="report-preview" data-report-preview rows="14" readonly></textarea></div>
            <div class="report-actions"><button class="btn" type="button" data-report-copy>${copy.copy}</button><button class="btn btn-outline" type="button" data-report-steam>${copy.steam}</button><button class="btn btn-outline" type="button" data-report-email>${copy.email}</button></div>
            <p class="form-status" data-report-status aria-live="polite"></p><p class="source-note">${copy.foot}</p>
          </div>
        </section>
      </div>
      <article class="article report-builder-guide"><h2>${zh ? "为什么先整理再发帖？" : "Why structure the report first?"}</h2><p>${zh ? "版本、复现步骤和截图上下文越完整，其他玩家越容易区分设置问题、已知修复和真正的新问题。这个工具只整理你提供的观察，不会替你判断结论。" : "A build, reproduction steps and screenshot context help other players separate a setup issue, a known fix and a genuinely new problem. This tool structures your observations; it does not decide the conclusion for you."}</p><p><a href="${zh ? "/zh/community" : "/community"}">${zh ? "返回社区雷达" : "Return to Community Radar"}</a> · <a href="${counterpart}">${zh ? "English" : "中文"}</a></p></article>
    </div>
  </main>
  <footer class="site-footer"><div class="container"><div class="footer-grid"><div><h4>The Ranchers Guide</h4><p>${zh ? "按版本和证据整理的非官方玩家资料。" : "Independent, fan-made Early Access help with versioned evidence."}</p><p class="disclaimer">${zh ? "不隶属于 RedPilz Studio 或 Trophy Games。" : "Not affiliated with RedPilz Studio or Trophy Games."}</p></div><nav aria-label="Footer site"><h4>${zh ? "站点" : "Site"}</h4><ul><li><a href="${zh ? "/zh/community" : "/community"}">${zh ? "社区雷达" : "Community Radar"}</a></li><li><a href="/contribute">${zh ? "投稿" : "Contribute"}</a></li><li><a href="/research">${zh ? "研究队列" : "Research"}</a></li><li><a href="/about">${zh ? "关于" : "About"}</a></li><li><a href="/privacy">${zh ? "隐私" : "Privacy"}</a></li></ul></nav></div><div class="footer-bottom"><span>&copy; <span data-year></span> The Ranchers Guide</span><span>${zh ? "先记录，再判断；原帖真实，结论有证据。" : "Record first, conclude later; original threads, evidence-gated answers."}</span></div></div></footer>
  <script type="application/json" id="player-report-config">${jsonScript(topics)}</script>
  <script src="/assets/js/main.js?v=20260821-report1" defer></script><script src="/assets/js/player-report.js?v=20260821-report1" defer></script>
</body></html>`;
}

for (const [relative, content] of [["tools/player-report.html", renderPage(false)], ["zh/tools/player-report.html", renderPage(true)]]) {
  const target = path.join(root, relative);
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== content) throw new Error(`${relative} is missing or out of sync; run node scripts/build-player-report.cjs`);
    console.log(`PASS: ${relative} is in sync.`);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
    console.log(`Wrote ${relative}.`);
  }
}
