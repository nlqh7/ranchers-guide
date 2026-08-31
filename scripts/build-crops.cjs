/* Render database/crops.html from data/crops.json (single source of truth).
 *
 * Mirrors the animals data layer (build-animals.cjs): same evidence model
 * (evidenceLevel / build / validity + sourceIds into a sources registry),
 * same badge styling, per-crop anchored sections so site search can deep-link.
 * Re-run after editing data/crops.json, then re-run build-search-index.cjs.
 *
 * --check  Drift guard: fail when database/crops.html is not byte-identical
 *          to a fresh render.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "crops.json"), "utf8"));
const { renderCropFacts, renderBuildOnlyCrops, renderExcludedSeeds } = require('./render-database-browser.cjs');
const shops = require('../data/build-shops.json');
const seedItems = require('../data/build-seeds.json').items;
const produceItems = require('../data/build-produce.json').items;

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cropSearchAliases(id) {
  const seed = seedItems.find(item => item.cropId === id && item.rosterStatus === 'current-roster');
  if (!seed) return '';
  const values = [seed.name, seed.zhName, seed.id];
  for (const item of produceItems.filter(produce => produce.cropId === id)) values.push(item.name, item.zhName, item.id);
  return ` data-search-aliases="${escapeHtml(values.join('|'))}"`;
}

const LEVEL_BADGES = {
  "official": '<span class="tag evidence-official">Official</span>',
  "video-observed": '<span class="tag evidence-video">Video-observed</span>',
  "community-confirmed": '<span class="tag evidence-community">Community-confirmed</span>',
  "player-tested": '<span class="tag evidence-tested">Player-tested</span>',
  "build-observed": '<span class="tag evidence-build">Current-build data</span>',
  "unverified-lead": '<span class="tag evidence-lead">Single-source</span>',
};

function badge(fact) {
  if (fact.validity === "unknown") return '<span class="tag pending">Unknown</span>';
  if (fact.validity === "historical" || fact.validity === "obsolete") {
    if (fact.evidenceLevel === "official") return '<span class="tag evidence-official">Official · pre-EA documented</span>';
    return '<span class="tag historical">Historical</span>';
  }
  const b = LEVEL_BADGES[fact.evidenceLevel];
  if (!b) throw new Error(`Unknown evidence level: ${fact.evidenceLevel}`);
  return b;
}

function renderSources(sourceIds) {
  const parts = sourceIds.map((id) => {
    const src = data.sources[id];
    if (!src) throw new Error(`Unknown source id: ${id}`);
    const label = escapeHtml(src.title);
    return src.url ? `<a href="${escapeHtml(src.url)}" rel="noopener noreferrer">${label}</a>` : label;
  });
  return `<span class="fact-source">${parts.join(" · ")}</span>`;
}

function renderFact(fact) {
  const cls = fact.validity === "historical" || fact.validity === "obsolete" ? ' class="fact-historical"' : "";
  return `          <li${cls}>${escapeHtml(fact.text)} ${badge(fact)} ${renderSources(fact.sourceIds)}</li>`;
}

function renderFertilizerProfile(entry, locale, observations) {
  const zh = locale === 'zh', prefix = zh ? '/zh' : '';
  const ref = entry.buildInput;
  const title = zh ? ref.zhName : ref.name;
  const summary = zh ? entry.zh.summary : entry.summary;
  const fields = [
    [zh ? '体力消耗' : 'Energy use', ref.energy.consumption],
    [zh ? '体力恢复' : 'Energy restored', ref.energy.restoration],
    [zh ? '可堆叠' : 'Stackable', ref.stackable ? (zh ? '是' : 'Yes') : (zh ? '否' : 'No')],
    [zh ? '持握位置' : 'Held in', ref.equippable && ref.heldSlot === 'Right_Hand_Weapon' ? (zh ? '右手' : 'Right hand') : (zh ? '未确认' : 'Unconfirmed')],
  ];
  const offers = shops.offers.filter(o => o.itemId === ref.sourceItemId);
  const shopLinks = offers.map(o => `<a href="${prefix}/guides/resources-and-materials#offer-${o.id}">${zh ? '商店记录' : 'Shop listing'} →</a>`).join('');
  const searchText = `${summary} ${fields.map(([label,value]) => `${label}: ${value}`).join(' · ')}. ${zh ? '实际效果尚未验证。' : 'Actual effects are unverified.'}`;
  return `<section class="evidence-ledger animal-profile" id="${entry.id}" data-search-entry data-search-title="${escapeHtml(title)}" data-search-text="${escapeHtml(searchText)}" data-search-tags="${escapeHtml(`${entry.searchTags} ${entry.zh.searchTags} ${ref.name} ${ref.zhName}`)}" data-search-status="${zh ? '游戏文件配置 · 未实测' : 'Game-file settings · not gameplay-tested'}" aria-labelledby="${entry.id}-heading">
<h2 id="${entry.id}-heading">${escapeHtml(zh ? `${ref.zhName} ${ref.name}` : ref.name)}</h2><p class="lead">${escapeHtml(summary)}</p>
<div class="database-config" data-fertilizer-config><p><strong>${zh ? '游戏文件配置' : 'Game-file settings'}</strong></p><dl class="database-facts">${fields.map(([label,value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><p class="database-browse-note">${zh ? '体力值为配置，不是单次操作实测。实际效果尚未验证；官方曾警告肥料计算错误。' : 'Energy values are configuration, not a tested per-action cost. Actual effects are unverified; official support previously warned about fertilizer calculations.'}</p><div class="database-guide-links">${shopLinks}<a href="${prefix}/guides/farming-fields#fertilizer">${zh ? '肥料警告与测试状态' : 'Fertilizer warning & test status'}</a></div></div>
<details class="database-reference-notes"><summary>${zh ? '配置来源与说明' : 'Configuration sources & notes'}</summary><p>${zh ? '站长整理，非官方资料。用途摘要来自Fertilizers物品表；I2英中说明栏均为空，不冒充游戏界面文本。' : 'Unofficial editor-collected reference. Intended use is paraphrased from the Fertilizers item table; English and Chinese I2 description slots are empty, so it is not presented as UI text.'} ${ref.build} · Steam 24847725.</p><p>${zh ? `共同配置：${escapeHtml(ref.classification)} 分类、${escapeHtml(ref.rarity)} 稀有度、可丢弃并带可出售标志。可出售标志不证明当前存在收购渠道或售价。` : `Shared settings: ${escapeHtml(ref.classification)} classification, ${escapeHtml(ref.rarity)} rarity, droppable and carrying a sellable flag. The sellable flag does not establish a current buyer or price.`}</p><p>${zh ? '名称逐项核对I2原字节。种子商店表在全年分组引用此项，不保证当前库存、售价或效果。' : 'Names are checked against I2 bytes. The seed-store table references this item in its all-season group; this does not guarantee current stock, price or effects.'}</p></details>
${observations}</section>`;
}

function renderProfile(entry, kicker) {
  const seedAliases = cropSearchAliases(entry.id);
  const fields = entry.fields.map((field) => {
    const confirmed = field.facts.filter((f) => f.validity !== "unknown");
    const pending = field.facts.filter((f) => f.validity === "unknown");
    const parts = [];
    if (confirmed.length > 0) {
      parts.push(`        <ul class="evidence-list">
${confirmed.map(renderFact).join("\n")}
        </ul>`);
    }
    if (pending.length > 0) {
      parts.push(`        <details class="pending-facts">
          <summary>${pending.length} item${pending.length > 1 ? "s" : ""} not yet verified — show</summary>
          <ul class="evidence-list pending-list">
${pending.map(renderFact).join("\n")}
          </ul>
        </details>`);
    }
    return `        <h3 id="${entry.id}-${field.key}">${escapeHtml(field.label)}</h3>
${parts.join("\n")}`;
  }).join("\n");

  if (entry.buildInput) return renderFertilizerProfile(entry, 'en', fields);
  return `      <section class="evidence-ledger animal-profile" id="${entry.id}" data-search-entry data-search-title="${escapeHtml(entry.id === 'hay' ? 'Hay as animal feed' : entry.name)}"${seedAliases} data-search-tags="${escapeHtml(entry.searchTags)}" data-search-status="Database record" aria-labelledby="${entry.id}-heading">
        <div class="section-heading-row">
          <div>
            <span class="kicker">${escapeHtml(kicker)}</span>
            <h2 id="${entry.id}-heading">${escapeHtml(entry.name)}</h2>
          </div>
          <span class="tag">Updated ${escapeHtml(entry.lastUpdated)}</span>
        </div>
        <p class="lead">${escapeHtml(entry.summary)}</p>
${renderCropFacts(data, entry.id, 'en')}
${entry.decision ? `        <div class="entity-decision"><strong>When to use this entry</strong><p>${escapeHtml(entry.decision)}</p><div class="button-stack"><a class="btn btn-outline btn-compact" href="/guides/farming-fields">Farming guide</a><a class="btn btn-outline btn-compact" href="/guides/money-making#cashin">CashIn selling</a>${entry.videoRow ? '<a class="btn btn-outline btn-compact" href="/map#leafy-market">Leafy Market</a>' : ""}</div></div>` : ""}
${fields}
      </section>`;
}

function renderHistoricalTable(crops) {
  return crops.filter((c) => c.historical).map((c) => {
    const h = c.historical;
    return `              <tr id="${c.id}-seeds" data-search-entry data-search-title="${escapeHtml(c.name)} Seeds" data-search-tags="${escapeHtml(h.tags)}" data-search-status="Historical community report" data-category="historical">
                <td><a class="entry-anchor" href="#${c.id}-seeds">${escapeHtml(c.name)} Seeds</a></td><td>${escapeHtml(h.season)}</td><td data-sort="${h.seedPrice.sort}">${escapeHtml(h.seedPrice.display)}</td><td>${escapeHtml(h.behavior)}</td><td><span class="tag historical">Historical lead</span> <a href="https://the-ranchers.fandom.com/wiki/Farmer%27s_Land" rel="noopener noreferrer">Player Wiki</a></td>
              </tr>`;
  }).join("\n");
}

function renderVideoTable(crops, inputs) {
  const rows = [];
  const push = (id, name, row, profileId = null) => {
    const price = row.price ? `<td data-sort="${row.price.sort}">${escapeHtml(row.price.display)}</td>` : "<td>—</td>";
    const badgeHtml = row.status === "Video-observed"
      ? '<span class="tag evidence-video">Video-observed</span>'
      : '<span class="tag evidence-lead">Unverified lead</span>';
    rows.push(`              <tr id="${id}"${profileId ? '' : ' data-search-entry'} data-search-title="${escapeHtml(name)}" data-search-tags="${escapeHtml(row.tags)}" data-search-status="${row.status}" data-category="video">
                <td><a class="entry-anchor" href="#${profileId || id}">${escapeHtml(name)}</a></td>
                ${price}
                <td>${escapeHtml(row.details)}</td>
                <td>${badgeHtml} <span title="Observed in Games Station gameplay footage (V0.8.10.455) at ${escapeHtml(row.timestamp)}">Games Station video, ${escapeHtml(row.timestamp)}</span></td>
              </tr>`);
  };
  for (const c of crops) if (c.videoRow) push(`${c.id}-seed-observed`, c.videoRow.status === "Video-observed" ? `${c.name} Seed` : `${c.name} Seed (seen in shop)`, c.videoRow);
  for (const i of inputs) if (i.videoRow) push(`${i.id}-observed`, i.name, i.videoRow, i.buildInput ? i.id : null);
  return rows.join("\n");
}

function renderRoster(rows) {
  return rows.map((r) => {
    const tag = r.status === "pending" ? '<span class="tag pending">Pending observation</span>' : '<span class="tag">Confirmed</span>';
    return `            <tr><td>${escapeHtml(r.name)}</td><td>${tag}</td><td>${escapeHtml(r.confirms)}</td><td>${escapeHtml(r.check)}</td></tr>`;
  }).join("\n");
}

function renderBuildRoster(locale) {
  const zh = locale === "zh";
  const roster = data.buildRoster;
  const rows = roster.entries.map((entry) => {
    const name = zh ? entry.zhName : entry.name;
    const season = zh ? entry.zhSeason : entry.season;
    const regrow = entry.regrowEveryDays
      ? (zh ? `每 ${entry.regrowEveryDays} 天` : `Every ${entry.regrowEveryDays} days`)
      : (zh ? "不再生" : "No regrow");
    const dry = zh ? `${entry.daysWithoutWater} 天` : `${entry.daysWithoutWater} ${entry.daysWithoutWater === 1 ? "day" : "days"}`;
    const vendor = entry.townSeedVendor === "listed"
      ? (zh ? "有记录" : "Listed")
      : (zh ? "未列入" : "Not listed");
    return `              <tr id="build-${entry.id}">
                <td><a class="entry-anchor" href="#${entry.id}">${escapeHtml(name)}</a></td>
                <td>${escapeHtml(season)}</td>
                <td>${entry.daysToFirstHarvest}</td>
                <td>${escapeHtml(regrow)}</td>
                <td>${escapeHtml(dry)}</td>
                <td>${escapeHtml(vendor)}</td>
              </tr>`;
  }).join("\n");
  const excluded = roster.notIncluded.map((entry) => zh ? `${entry.zhName} ${entry.name}` : entry.name).join(zh ? "、" : ", ");
  const source = data.sources[roster.sourceIds[0]];
  const unlisted = roster.entries.filter((entry) => entry.townSeedVendor === "not-referenced").map((entry) => zh
    ? `Town SeedVendor 表没有引用 ${entry.name} Seed（${entry.zhName}），不能据此声称可购买。`
    : `${entry.name} Seed is not referenced by the Town SeedVendor table; availability is not claimed.`).join(" ");
  return `      <section class="evidence-ledger build-data-roster" id="current-build-crop-roster" aria-labelledby="current-build-crop-roster-title">
        <div class="section-heading-row"><h2 id="current-build-crop-roster-title">${zh ? "各季节作物数据" : "Seasonal crop data"}</h2><span class="tag evidence-build">${zh ? "站长构建采集" : "Current-build data"}</span></div>
        <p>${zh ? "以下为游戏文件中的配置值，尚未逐项实测。商店表有记录不等于当前一定能买到；价格不在此表内。" : "These are game-file configuration values, not individually tested gameplay timings. A seed-table entry does not guarantee current shop availability; prices are not included."}</p>
        <div class="data-table-wrap" tabindex="0" role="region" aria-labelledby="current-build-crop-roster-title"><table class="data-table build-data-table"><thead><tr><th>${zh ? "作物" : "Crop"}</th><th>${zh ? "季节" : "Season"}</th><th>${zh ? "首次收获（天）" : "First harvest (days)"}</th><th>${zh ? "再生" : "Regrow"}</th><th>${zh ? "断水容忍" : "Dry tolerance"}</th><th>${zh ? "种子商店表" : "Seed shop table"}</th></tr></thead><tbody>
${rows}
        </tbody></table></div>
        <details class="pending-facts"><summary>${zh ? "来源与未开放配置" : "Source and excluded profiles"}</summary>
          <p>${escapeHtml(zh ? roster.zhSummary : roster.summary)}</p>
          <p>${escapeHtml(unlisted)}</p>
          <p>${escapeHtml(zh ? roster.zhPublicationBoundary : roster.publicationBoundary)}</p>
          <p>${escapeHtml(excluded)}${zh ? " 位于 NotINCLUDED 表中，不列入上方作物表。" : " are stored in NotINCLUDED and are not merged into the roster above."}</p>
          <p class="source-note"><strong>${zh ? "来源：" : "Source:"}</strong> ${escapeHtml(source.title)} · ${escapeHtml(source.build)} · ${zh ? "本地私有哈希清单" : "private local hash manifest"}</p>
        </details>
      </section>`;
}

const cropSections = data.crops.map((c) => renderProfile(c, c.category)).join("\n\n");
const inputSections = data.inputs.map((i) => renderProfile(i, "farm input")).join("\n\n");
const historicalCount = data.crops.filter((c) => c.historical).length;
const videoCount = data.crops.filter((c) => c.videoRow).length + data.inputs.filter((i) => i.videoRow).length;
const pendingCount = data.confirmedSystems.filter((r) => r.status === "pending").length;
const confirmedCount = data.confirmedSystems.filter((r) => r.status === "confirmed").length;
const tocItems = data.crops.concat(data.inputs).map((e) => `          <li class="toc-cat"><a href="#${e.id}">${escapeHtml(e.name)}</a>
            <ul class="toc-fields">
${e.fields.map((f) => `              <li><a href="#${e.id}-${f.key}">${escapeHtml(f.label)}</a></li>`).join("\n")}
            </ul>
          </li>`).join("\n");

let html = `<!DOCTYPE html>
<!-- GENERATED by scripts/build-crops.cjs from data/crops.json — do not edit directly.
     Edit data/crops.json, then run: node scripts/build-crops.cjs && node scripts/build-search-index.cjs -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Ranchers Crop Database — Confirmed Systems & Data Tracker</title>
  <meta name="description" content="Search The Ranchers crop records, seasons, reported prices and growth behavior with source links, build context and clear evidence labels for every community value.">
  <link rel="canonical" href="https://theranchersguide.com/database/crops">
  <link rel="alternate" hreflang="en" href="https://theranchersguide.com/database/crops">
  <link rel="alternate" hreflang="zh-CN" href="https://theranchersguide.com/zh/database/crops">
  <link rel="alternate" hreflang="x-default" href="https://theranchersguide.com/database/crops">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="The Ranchers Guide">
  <meta property="og:title" content="The Ranchers Crop Database — Confirmed Systems & Data Tracker">
  <meta property="og:description" content="Officially documented crop systems, a launch verification queue, and a transparent method for measuring profit per day.">
  <meta property="og:url" content="https://theranchersguide.com/database/crops">
  <meta property="og:image" content="https://theranchersguide.com/assets/img/og-cover.jpg">


<link rel="icon" type="image/png" sizes="32x32" href="../assets/img/favicon-32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="../assets/img/apple-touch-icon-180.png">
  <link rel="stylesheet" href="../assets/css/style.css?v=20260821-ui1">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4804883741146501" crossorigin="anonymous"></script>
</head>
<body>
  <header class="site-header">
    <nav class="nav-inner" aria-label="Main navigation">
      <a class="logo" href="/">
        <span class="logo-mark"><img src="../assets/img/logo.png" alt="" width="34" height="34"></span>
        <span>The Ranchers Guide<small>Unofficial fan resource</small></span>
      </a>
      <button class="nav-toggle" aria-expanded="false" aria-label="Toggle navigation">☰</button>
      <ul class="nav-links">
        <li><a href="/guides/beginners-guide">Guides</a></li>
        <li><a href="/database">Database</a></li>
        <li><a href="/map">Map</a></li>
        <li><a href="/problems">Problems</a></li>
        <li><a href="/research">Research</a></li>
        <li><a href="/search">Search</a></li>
        <li><a class="nav-cta" href="/contribute">Contribute</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <article class="article" style="max-width: 980px;">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> / Database / Crops</nav>
      <h1>The Ranchers Crop Database</h1>
      <p class="meta">Current page baseline ${escapeHtml(data.meta.build)} · Video evidence recorded on ${escapeHtml(data.meta.videoBuild)} · Data last updated ${escapeHtml(data.meta.lastUpdated)} · Historical values are labeled</p>
      <div class="evidence-status">
        <strong>Evidence status:</strong> ${data.buildRoster.entries.length} current-build crop profiles · ${confirmedCount} confirmed systems · ${videoCount} video-observed shop values · ${historicalCount} historical leads · ${pendingCount} pending rows · every fact carries its own evidence label — <a href="/methodology">How we verify →</a>
      </div>


      <figure class="page-banner"><img src="../assets/img/db-crops.webp" width="800" height="450" alt="The Ranchers gameplay screenshot: a greenhouse and neat vegetable garden rows"></figure>

      <div class="notice">
        <strong>Current-build note:</strong> The Ranchers is live in Early Access. Official notes now confirm several plantation rules, but they still do not publish a complete crop-price table. Numerical fields require versioned in-game evidence.
      </div>

      <p>Collect discoveries privately in <a href="/tools/field-notes">Field Notes</a>, then export the versioned record when it is complete enough to verify.</p>

      <p class="lead">This living database combines official facts with clearly labeled player research. Each crop has its own anchored profile below — search an individual crop, inspect the source and build context, and never mistake an old community value for a current-build fact.</p>

${renderBuildRoster("en")}

      <nav class="toc" aria-label="Contents">
        <div class="toctitle">Contents</div>
        <ul>
${tocItems}
        </ul>
      </nav>

${cropSections}
${renderBuildOnlyCrops(data, 'en')}
${renderExcludedSeeds('en')}

${inputSections}

      <section class="evidence-ledger" aria-labelledby="community-crop-data">
        <div class="section-heading-row">
          <div>
            <span class="kicker">Community Evidence</span>
            <h2 id="community-crop-data">Reported crop records</h2>
          </div>
          <a class="text-link" href="/contact">Submit a current-build correction</a>
        </div>
        <div class="notice warning">
          <strong>Historical Alpha data:</strong> these values were preserved by players before Early Access. They are useful leads, not current build ${escapeHtml(data.meta.build)} facts. A row is upgraded only when current-version evidence is available.
        </div>
        <div class="table-tools">
          <label class="visually-hidden" for="crop-record-search">Search reported crops</label>
          <input type="search" id="crop-record-search" placeholder="Search crop, season, price or behavior..." data-table-search="crop-records-table">
          <label class="visually-hidden" for="crop-record-status">Filter crop evidence status</label>
          <select id="crop-record-status" data-table-filter="crop-records-table">
            <option value="">All evidence</option>
            <option value="historical">Historical community report</option>
          </select>
          <span class="tag" data-table-count="crop-records-table">- entries</span>
        </div>
        <div class="data-table-wrap">
          <table class="data-table evidence-table" id="crop-records-table">
            <thead>
              <tr>
                <th data-sortable>Crop <span class="sort-arrow"></span></th>
                <th data-sortable>Season <span class="sort-arrow"></span></th>
                <th data-sortable>Reported seed price <span class="sort-arrow"></span></th>
                <th>Reported behavior</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
${renderHistoricalTable(data.crops)}
            </tbody>
          </table>
        </div>
        <p class="source-note"><strong>Source handling:</strong> names, seasons and reported values were normalized from the community-maintained Farmer's Land page, reviewed August 2, 2026. We link to the original record and do not reproduce its prose or images.</p>
      </section>

      <section class="evidence-ledger" aria-labelledby="video-crop-data">
        <div class="section-heading-row">
          <div>
            <span class="kicker">Current-Build Evidence</span>
            <h2 id="video-crop-data">Video-observed shop values (recorded on build ${escapeHtml(data.meta.videoBuild)})</h2>
          </div>
          <a class="text-link" href="/contact">Submit a current-build correction</a>
        </div>
        <p>These rows were recorded in a public gameplay video on build 0.8.10.455, inside the Leafy Market "Seed &amp; Fertilizer" tab. They are historical observations, not current prices or hands-on measurements by this site.</p>
        <div class="data-table-wrap">
          <table class="data-table evidence-table" id="crop-video-table">
            <thead>
              <tr>
                <th data-sortable>Item <span class="sort-arrow"></span></th>
                <th data-sortable>Observed price <span class="sort-arrow"></span></th>
                <th>Observed details</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
${renderVideoTable(data.crops, data.inputs)}
            </tbody>
          </table>
        </div>

        <div class="notice warning">
          <strong>Fertilizer test status:</strong> official support warned about incorrect calculations on August 4, 2026. Current-build effects have not been retested here. The later patch notes do not announce a fertilizer fix, but that alone cannot prove behavior is unchanged. <a href="/guides/farming-fields#fertilizer">Warning and evidence</a>.
        </div>

        <div class="data-conflict">
          <strong>Conflicting values:</strong> the historical Alpha table above lists Strawberry Seeds at 38C and Red Lettuce Seeds at 18C; video footage recorded on build ${escapeHtml(data.meta.videoBuild)} shows 144C and 48C respectively. Treat the video-observed values as the working reference for the current page baseline (${escapeHtml(data.meta.build)}); the historical rows stay as leads only.
        </div>

        <div class="notice info">
          <strong>Derived analysis (our theoretical model, not an observed outcome):</strong> using only the video-observed seed cost and timing, the theoretical seed-cost allocation for Strawberry is <strong>18C per harvest</strong> — assuming eight harvests during a full 30-day Spring (first harvest on day 7, then regrowth on days 10, 13, 16, 19, 22, 25, 28) with no missed regrowth cycles, no season-boundary loss and no plant death. This is not an observed outcome. The sell price per berry was <strong>not observed</strong>, so profit per day stays open: profit/day = (sell price × yield − allocated seed cost) ÷ 3 once a sale value is captured. For Red Lettuce the framework is (sell price − 48C) ÷ 3 per occupied day, sell price also unobserved. Enter your own observed sale price in the <a href="/tools/profit-calculator">profit calculator</a>.
        </div>
      </section>

      <span id="cashin" class="anchor-alias" aria-hidden="true"></span><h2 id="how-to-sell">How crop selling works</h2>
      <ul class="evidence-list">
${data.cashin.map(renderFact).join("\n")}
      </ul>
      <p>Steps and the observed Day-8 example: <a href="/guides/money-making#cashin">How to sell crops: the CashIn chest</a>. <small>Observed in EA 0.8.10.455.</small></p>

      <h2>Confirmed farming systems</h2>

      <div class="table-tools">
        <label class="visually-hidden" for="crop-search">Search crops</label>
        <input type="search" id="crop-search" placeholder="Search systems… (e.g. greenhouse, market)" data-table-search="crops-table">
        <label class="visually-hidden" for="crop-season">Filter by evidence status</label>
        <select id="crop-season" data-table-filter="crops-table">
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending observation</option>
        </select>
        <span class="tag" data-table-count="crops-table">– entries</span>
      </div>

      <div class="data-table-wrap">
        <table class="data-table" id="crops-table">
          <thead>
            <tr>
              <th data-sortable>System <span class="sort-arrow"></span></th>
              <th data-sortable>Status <span class="sort-arrow"></span></th>
              <th>What the official source confirms</th>
              <th>Launch check</th>
            </tr>
          </thead>
          <tbody>
${renderRoster(data.confirmedSystems)}
          </tbody>
        </table>
      </div>

      <div class="notice info">
        <strong>Core formula:</strong> crop profit per plot per day = (sale revenue − seed cost − repeat input costs) ÷ occupied days. Keep quality bonuses, processing, and market fees separate so the comparison remains reproducible. Enter observed values in the <a href="/tools/profit-calculator">profit calculator</a>.
      </div>

      <h2>How to build a trustworthy crop row</h2>
      <p>Record the game version, season, seed source, seed cost, planting day, harvest day, yield per plot, sale destination, sale price, and any quality or processing modifier. Use a control plot without bonuses, measure occupied days (not only the printed growth time), separate sale channels, and repeat the test at least once. The full verification workflow is on the <a href="/methodology">methodology page</a>.</p>

      <details class="pending-facts" style="margin-top:16px">
        <summary>Open research questions (5) — show</summary>
        <ul>
        <li>Which crops are available in the initial Early Access build?</li>
        <li>Which crops are season-limited, regrow after harvest, or work in greenhouses?</li>
        <li>Do sprinklers require utilities, and what area does each model cover?</li>
        <li>Do local markets, daily orders, and the auction use the same base value?</li>
        <li>Which costs are per harvest, per planting, or one-time infrastructure?</li>
        </ul>
      </details>

      <h2>Sources</h2>
      <p>Confirmed rows come from the <a href="https://store.steampowered.com/app/1501310/The_Ranchers/" rel="noopener noreferrer">official Steam store page</a> and <a href="https://steamcommunity.com/app/1501310/allnews/" rel="noopener noreferrer">official Steam updates</a>, reviewed August 2026. Video-observed rows come from <a href="https://www.youtube.com/watch?v=GrFiYqWcBK0" rel="noopener noreferrer">Games Station gameplay footage (V0.8.10.455)</a>, reviewed August 7, 2026. The fertilizer calculation warning comes from an official Steam discussion reply, August 2026. How leads become verified values: <a href="/methodology">methodology</a>. Corrections with a version and screenshot: <a href="/contact">contact page</a>.</p>
      <p>Pair this with the <a href="/database/animals">animal database</a> to plan your whole ranch economy, read the <a href="/guides/farming-fields">farming &amp; fields guide</a> for watering, harvest and regrow rules, read the <a href="/guides/money-making">money-making guide</a> for the selling workflow, and read the <a href="/guides/beginners-guide">beginner's guide</a> if this is your first season.</p>


      <aside class="author-card" aria-label="About the author">
        <div class="author-card-id">
          <strong>Niki</strong>
          <span>Site editor, The Ranchers Guide</span>
        </div>
        <p>Research and editing by Niki, site editor. Gameplay evidence collected from public videos, official updates and community reports. Last reviewed: August 2026. Game version coverage: 0.8.10.x. <a href="/methodology">How we verify →</a></p>
      </aside>
      <!-- Ad slot placeholder
      <div class="ad-slot">Advertisement</div>
      -->
    </article>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4>The Ranchers Guide</h4>
          <p>An unofficial, fan-made guide hub for The Ranchers — the open-world ranch life sim from RedPilz Studio, published by Trophy Games, available in Steam Early Access since July 30, 2026.</p>
          <p class="disclaimer">Unofficial fan-made guide. The Ranchers game images &copy; RedPilz Studio / Trophy Games. Not affiliated with or endorsed by the developers.</p>
        </div>
        <nav aria-label="Footer guides">
          <h4>Guides</h4>
          <ul>
            <li><a href="/guides/release-time-checklist">Early Access Status</a></li>
            <li><a href="/guides/beginner-mistakes">Beginner Mistakes</a></li>
            <li><a href="/guides/beginners-guide">Beginner's Guide</a></li>
            <li><a href="/guides/money-making">Money Making</a></li>
            <li><a href="/guides/multiplayer-coop">Multiplayer & Co-op</a></li>
          </ul>
        </nav>
        <nav aria-label="Footer databases and tools">
          <h4>Data & Tools</h4>
          <ul>
            <li><a href="/search">Search</a></li>
            <li><a href="/database/crops">Crop Database</a></li>
            <li><a href="/database/animals">Animal Database</a></li>
            <li><a href="/tools/field-notes">Field Notes</a></li>
            <li><a href="/tools/profit-calculator">Profit Calculator</a></li>
          </ul>
        </nav>
        <nav aria-label="Footer site links">
          <h4>Site</h4>
          <ul>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/methodology">Methodology</a></li>
          </ul>
        </nav>
      </div>
      <div class="footer-bottom">
        <span>© <span data-year>2026</span> theranchersguide.com — fan-made, unofficial.</span>
        <span>Official sources and data status are labeled on each page.</span>
      </div>
    </div>
  </footer>

  <script src="../assets/js/main.js?v=20260810-nav1" defer></script>
  <script src="../assets/js/database.js?v=20260807-2" defer></script>
</body>
</html>
`;

/* ---------------- Chinese (zh-CN) page, rendered from the same JSON ---------------- */
const ZH_BADGES = {
  "official": '<span class="tag evidence-official">官方</span>',
  "official-warn": '<span class="tag evidence-official">官方警告</span>',
  "community": '<span class="tag evidence-community">多人印证</span>',
  "video": '<span class="tag evidence-video">视频观测</span>',
  "lead": '<span class="tag evidence-lead">单一线索</span>',
  "model": '<span class="tag evidence-lead">理论模型</span>',
  "shot-pending": '<span class="tag evidence-lead">待补画面</span>',
  "unknown": '<span class="tag pending">未知</span>',
  "historical": '<span class="tag historical">Historical 历史资料</span>',
  "none": "",
};

function zhBadge(kind) {
  if (!(kind in ZH_BADGES)) throw new Error(`Unknown zh badge: ${kind}`);
  return ZH_BADGES[kind];
}

function renderZhEntry(entry) {
  const zh = entry.zh;
  const head = zh.kicker || zh.headerBadge
    ? `<div class="section-heading-row"><div>${zh.kicker ? `<span class="kicker">${escapeHtml(zh.kicker)}</span>` : ""}<h2>${escapeHtml(zh.name)}</h2></div>${zh.headerBadge ? zhBadge(zh.headerBadge) : ""}</div>`
    : `<h2>${escapeHtml(zh.name)}</h2>`;
  const summary = zh.summary ? `<p>${escapeHtml(zh.summary)}</p>` : "";
  const groups = zh.groups.map((g) => {
    const h = g.heading ? `<h3${g.id ? ` id="${g.id}"` : ""}>${escapeHtml(g.heading)}</h3>` : "";
    const confirmed = g.facts.filter((f) => f.badge !== "unknown");
    const pending = g.facts.filter((f) => f.badge === "unknown");
    const items = confirmed.map((f) => `<li>${escapeHtml(f.text)}${zhBadge(f.badge)}</li>`).join("");
    const pendingBlock = pending.length > 0
      ? `<details class="pending-facts"><summary>${pending.length} 条待验证 — 展开</summary><ul class="evidence-list pending-list">${pending.map((f) => `<li>${escapeHtml(f.text)}${zhBadge(f.badge)}</li>`).join("")}</ul></details>`
      : "";
    return `${h}${items ? `<ul class="evidence-list">${items}</ul>` : ""}${pendingBlock}`;
  }).join("");
  const decision = zh.decision ? `<div class="entity-decision"><strong>什么时候查</strong><p>${escapeHtml(zh.decision)}</p><div class="button-stack"><a class="btn btn-outline btn-compact" href="/zh/guides/farming-fields">种地实战攻略</a><a class="btn btn-outline btn-compact" href="/zh/guides/money-making#cashin">CashIn 出售</a>${entry.videoRow ? '<a class="btn btn-outline btn-compact" href="/zh/map#leafy-market">Leafy Market</a>' : ""}</div></div>` : "";
  if (entry.buildInput) return renderFertilizerProfile(entry, 'zh', groups);
  const seedAliases = cropSearchAliases(entry.id);
  return `    <section class="evidence-ledger animal-profile" id="${entry.id}" data-search-entry data-search-title="${escapeHtml(zh.searchTitle)}"${seedAliases} data-search-tags="${escapeHtml(zh.searchTags)}">${head}${summary}${renderCropFacts(data, entry.id, 'zh')}${decision}${groups}</section>`;
}

function renderZhExtraSection(s) {
  const paras = (s.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  const badge = s.badge ? zhBadge(s.badge) : "";
  const steps = s.steps ? `<ol>${s.steps.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ol>` : "";
  const notice = s.notice ? `<div class="notice">${escapeHtml(s.notice)}</div>` : "";
  return `    <section class="evidence-ledger animal-profile" id="${s.id}" data-search-entry data-search-title="${escapeHtml(s.searchTitle)}" data-search-tags="${escapeHtml(s.searchTags)}"><h2>${escapeHtml(s.heading)}</h2>${paras}${badge}${steps}${notice}</section>`;
}

const zhExtraById = Object.fromEntries(data.zhExtra.sections.map((s) => [s.id, s]));
// Page order: zh crops → historical leads → zh inputs (fertilizer) → CashIn.
const zhBodyParts = [
  ...data.crops.filter((e) => e.zh).map(renderZhEntry),
  renderBuildOnlyCrops(data, 'zh'),
  renderExcludedSeeds('zh'),
  renderZhExtraSection(zhExtraById["historical"]),
  ...data.inputs.filter((e) => e.zh).map(renderZhEntry),
  renderZhExtraSection(zhExtraById["cashin"]),
];
const zhTocItems = data.crops.filter((e) => e.zh).map((e) => `<li><a href="#${e.id}">${escapeHtml(e.zh.tocLabel)}</a></li>`).join("")
  + `<li><a href="#historical">${escapeHtml(zhExtraById["historical"].tocLabel)}</a></li>`
  + data.inputs.filter((e) => e.zh).map((e) => `<li><a href="#${e.id}">${escapeHtml(e.zh.tocLabel)}</a></li>`).join("")
  + `<li><a href="#cashin">${escapeHtml(zhExtraById["cashin"].tocLabel)}</a></li>`;
const zhRelated = `<section class="related"><h2>继续查询</h2><p>${data.zhExtra.related.map((r) => `<a href="${escapeHtml(r.href)}">${escapeHtml(r.label)}</a>`).join(" · ")}</p></section>`;

let zhHtml = `<!DOCTYPE html>
<!-- GENERATED by scripts/build-crops.cjs from data/crops.json (zh blocks) — do not edit directly. -->
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Ranchers 中文作物数据库 | 种子价格与生长时间</title>
  <meta name="description" content="The Ranchers 中文作物数据库：种子购买价、季节、生长周期、再生、肥料和 CashIn 出售方式，区分当前观测与历史资料。">
  <link rel="canonical" href="https://theranchersguide.com/zh/database/crops">
  <link rel="alternate" hreflang="en" href="https://theranchersguide.com/database/crops"><link rel="alternate" hreflang="zh-CN" href="https://theranchersguide.com/zh/database/crops"><link rel="alternate" hreflang="x-default" href="https://theranchersguide.com/database/crops">
  <meta property="og:type" content="website"><meta property="og:title" content="The Ranchers 中文作物数据库"><meta property="og:description" content="当前版本种子与生长数据。"><meta property="og:url" content="https://theranchersguide.com/zh/database/crops"><meta property="og:image" content="https://theranchersguide.com/assets/img/db-crops.jpg">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css?v=20260821-ui1"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4804883741146501" crossorigin="anonymous"></script>
</head>
<body>
  <header class="site-header"><nav class="nav-inner" aria-label="主导航"><a class="logo" href="/zh/"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide<small>非官方中文玩家指南</small></span></a><button class="nav-toggle" aria-expanded="false" aria-label="展开导航">☰</button><ul class="nav-links"><li><a href="/zh/guides/beginners-guide">新手</a></li><li><a class="active" href="/zh/database">知识库</a></li><li><a href="/zh/map">地图</a></li><li><a href="/zh/problems">问题</a></li><li><a href="/zh/search">搜索</a></li><li><a class="nav-cta" href="/contribute">投稿</a></li></ul></nav></header>
  <main><article class="article" style="max-width:980px">
    <nav class="breadcrumb" aria-label="面包屑"><a href="/zh/">首页</a> / <a href="/zh/database">知识库</a> / 作物</nav><h1>The Ranchers 中文作物数据库</h1><p class="meta">页面基线 ${escapeHtml(data.meta.build)} · 视频证据录制于 ${escapeHtml(data.meta.videoBuild)} · ${escapeHtml(data.meta.lastUpdated)} 更新 · 玩家单颗出售价仍未知</p>
    <div class="evidence-status"><strong>口径：</strong>${data.buildRoster.entries.length} 个当前构建作物配置来自本地构建数据；48C、144C 等是视频中看到的种子购买价；31C 是大蒜成品的商店零售价；它们都不能直接当作玩家出售收入。</div>
    <figure class="page-banner"><img src="/assets/img/db-crops.webp" width="800" height="450" alt="The Ranchers 温室和整齐的菜地"></figure>
${renderBuildRoster("zh")}
    <nav class="toc" aria-label="作物目录"><strong>快速跳转：</strong><ul>${zhTocItems}</ul></nav>
${zhBodyParts.join("\n")}
    ${zhRelated}
  </article></main>
  <footer class="site-footer"><div class="container"><div class="footer-bottom"><span>&copy; <span data-year></span> The Ranchers Guide</span><span>购买价、零售价、出售收入严格分开</span></div></div></footer><script src="/assets/js/main.js?v=20260810-nav1" defer></script>
</body></html>
`;

const { decoratePage } = require('./render-database-browser.cjs');
html = decoratePage(html, data, 'crops', 'en');
zhHtml = decoratePage(zhHtml, data, 'crops', 'zh');

const output = path.join(root, "database", "crops.html");
const zhOutput = path.join(root, "zh", "database", "crops.html");

if (process.argv.includes("--check")) {
  let failed = false;
  if (!fs.existsSync(output) || fs.readFileSync(output, "utf8") !== html) {
    console.error("FAIL: database/crops.html is missing or out of sync with data/crops.json. Re-run: node scripts/build-crops.cjs");
    failed = true;
  }
  if (!fs.existsSync(zhOutput) || fs.readFileSync(zhOutput, "utf8") !== zhHtml) {
    console.error("FAIL: zh/database/crops.html is missing or out of sync with data/crops.json. Re-run: node scripts/build-crops.cjs");
    failed = true;
  }
  if (failed) process.exit(1);
  console.log(`PASS: database/crops.html + zh/database/crops.html are in sync with data/crops.json (${data.crops.length} crops, ${data.inputs.length} inputs).`);
} else {
  fs.writeFileSync(output, html, "utf8");
  fs.mkdirSync(path.dirname(zhOutput), { recursive: true });
  fs.writeFileSync(zhOutput, zhHtml, "utf8");
  console.log(`Wrote database/crops.html + zh/database/crops.html: ${data.crops.length} crop profiles, ${data.inputs.length} input profiles, ${historicalCount} historical rows.`);
}
