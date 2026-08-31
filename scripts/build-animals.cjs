/* Render database/animals.html from data/animals.json (single source of truth).
 *
 * The generated page keeps the existing layout, ad conventions, navigation and
 * evidence-badge styling. Each species gets its own anchored section (#chicken,
 * #cow, ...) so site search can deep-link to a single animal via the h2-id
 * extraction in build-search-index.cjs. Re-run this script after editing
 * data/animals.json, then re-run build-search-index.cjs.
 *
 * --check  Drift guard: fail when database/animals.html is not byte-identical
 *          to a fresh render.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "animals.json"), "utf8"));

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const LEVEL_BADGES = {
  "official": '<span class="tag evidence-official">Official</span>',
  "video-observed": '<span class="tag evidence-video">Video-observed</span>',
  "community-confirmed": '<span class="tag evidence-community">Community-confirmed</span>',
  "player-tested": '<span class="tag evidence-tested">Player-tested</span>',
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

function renderSpecies(animal) {
  const fields = animal.fields.map((field) => {
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
    return `        <h3 id="${animal.id}-${field.key}">${escapeHtml(field.label)}</h3>
${parts.join("\n")}`;
  }).join("\n");

  return `      <section class="evidence-ledger animal-profile" aria-labelledby="${animal.id}-heading">
        <div id="${animal.id}" data-search-entry data-search-title="${escapeHtml(animal.name)}" data-search-tags="${escapeHtml(animal.searchTags)}" data-search-status="Database record">
        <div class="section-heading-row">
          <div>
            <span class="kicker">${escapeHtml(animal.category)} · ${escapeHtml(animal.housingType)}</span>
            <h2 id="${animal.id}-heading">${escapeHtml(animal.name)}</h2>
          </div>
          <span class="tag">Updated ${escapeHtml(animal.lastUpdated)}</span>
        </div>
        <p class="lead">${escapeHtml(animal.summary)}</p>
${animal.whenNeeded ? `        <div class="entity-decision"><strong>When to look here</strong><p>${escapeHtml(animal.whenNeeded)}</p></div>` : ""}
        </div>
${renderNativeAnimalReference(animal, 'en')}
${renderBuildReference(animal, 'en')}
${animal.buildReference ? `<details class="database-outline"><summary>Further care evidence and open questions</summary>${fields}</details>` : fields}
      </section>`;
}

function renderNativeAnimalReference(animal, locale) {
  const ref = data.nativeAnimalReference;
  if (!ref) return '';
  const rows = ref.entries.filter(entry => entry.speciesId === animal.id);
  if (rows.length === 0) return '';

  const zh = locale === 'zh';
  const stageLabel = value => zh
    ? (value === 'young' ? '幼年' : '成年')
    : (value === 'young' ? 'Young' : 'Adult');
  const sexLabel = value => zh
    ? (value === 'female' ? '雌性' : '雄性')
    : (value === 'female' ? 'Female' : 'Male');
  const settings = ref.sharedConfiguration;
  const body = rows.map(row => {
    const name = escapeHtml(zh ? row.zhName : row.name);
    const aliases = escapeHtml(`${row.id}|${row.name}|${row.zhName}`);
    const tags = escapeHtml(`${row.id} ${row.name} ${row.zhName} ${row.stage} ${row.sex} ${animal.id}`);
    return `<tr id="native-animal-${escapeHtml(row.id)}" data-search-entry data-search-title="${name}" data-search-aliases="${aliases}" data-search-tags="${tags}" data-search-status="${zh ? '当前构建名称' : 'Current-build name'}"><th scope="row"><a class="entry-anchor" href="#native-animal-${escapeHtml(row.id)}">${name}</a></th><td>${stageLabel(row.stage)} · ${sexLabel(row.sex)}</td><td><code>${escapeHtml(row.id)}</code></td></tr>`;
  }).join('');

  return `<div class="native-animal-reference">
        <h3>${zh ? '当前构建名称' : 'Current-build names'}</h3>
        <p class="database-browse-note">${zh ? `自有 build ${escapeHtml(ref.build)} 中与本物种匹配的 ${rows.length} 个原生定义。名称可用于核对对象；空的 I2 说明栏保持为空。` : `${rows.length} native definitions matched to this species in owned build ${escapeHtml(ref.build)}. Use the names to identify an object; empty I2 description slots remain empty.`}</p>
        <div class="data-table-wrap" tabindex="0" role="region" aria-label="${zh ? `${escapeHtml(animal.zh?.tocLabel || animal.name)}当前构建名称` : `${escapeHtml(animal.name)} current-build names`}"><table class="data-table"><thead><tr><th scope="col">${zh ? '游戏内名称' : 'Game name'}</th><th scope="col">${zh ? '阶段与性别' : 'Stage and sex'}</th><th scope="col">${zh ? '来源 ID' : 'Source ID'}</th></tr></thead><tbody>${body}</tbody></table></div>
        <details class="database-reference-notes"><summary>${zh ? '共用配置与资料边界' : 'Shared configuration and limits'}</summary><p>${zh ? `源表共同字段：${escapeHtml(settings.classification)} 分类、${escapeHtml(settings.rarity)} 稀有度、不可装备、不可堆叠、不可丢弃，并带有可出售标志。配置不证明当前可购买、可出售活体、可繁殖或会在存档中生成。` : `Shared source fields: ${escapeHtml(settings.classification)} classification, ${escapeHtml(settings.rarity)} rarity, not equippable, not stackable, not droppable, with the sellable flag set. This configuration does not prove current purchase, live-animal sale, breeding or save availability.`}</p>${renderSources(ref.sourceIds)}</details>
      </div>`;
}

function renderBuildReference(animal, locale) {
  const ref = animal.buildReference;
  if (!ref) return '';
  const zh = locale === 'zh';
  const label = row => escapeHtml(zh ? row.zhName : row.name);
  const text = row => escapeHtml(zh ? row.zhText : row.text);
  const sex = value => zh ? (value === 'female' ? '母牛' : '公牛') : (value === 'female' ? 'Cow' : 'Bull');
  const questRoute = `${zh ? '/zh' : ''}${ref.quest.route}`;
  const entries = ref.entries
    ? `<h3>${zh ? '成年羊与幼羊' : 'Adult and young goats'}</h3><div class="data-table-wrap" tabindex="0" role="region" aria-label="${zh ? '山羊名称与商店引用' : 'Goat names and shop references'}"><table class="data-table"><thead><tr><th scope="col">${zh ? '游戏内名称' : 'Game name'}</th><th scope="col">${zh ? '商店表引用' : 'Shop-table reference'}</th></tr></thead><tbody>${ref.entries.map(row => `<tr><th scope="row">${label(row)}<br><small>${zh ? (row.stage === 'adult' ? '成年' : '幼年') : (row.stage === 'adult' ? 'Adult' : 'Young')} · ${zh ? (row.sex === 'female' ? '雌性' : '雄性') : (row.sex === 'female' ? 'Female' : 'Male')}</small></th><td>${row.shopListed ? (zh ? '有引用' : 'Referenced') : (zh ? '未引用' : 'Not referenced')}</td></tr>`).join('')}</tbody></table></div>`
    : `<h3>${zh ? '可查品种' : 'Cattle breeds'}</h3><div class="data-table-wrap" tabindex="0" role="region" aria-label="${zh ? '牛品种与性别' : 'Cattle breeds and sexes'}"><table class="data-table"><thead><tr><th scope="col">${zh ? '品种' : 'Breed'}</th><th scope="col">${zh ? '商店配置条目' : 'Shop entries'}</th></tr></thead><tbody>${ref.breeds.map(b => `<tr><th scope="row">${label(b)}</th><td>${b.sexes.map(sex).join(zh ? '、' : ' / ')}</td></tr>`).join('')}</tbody></table></div>`;
  return `<div class="animal-build-reference">
        <p class="database-browse-note">${zh ? '站长整理 · 游戏构建资料' : 'Editor-collected · game-build reference'} · ${escapeHtml(ref.build)}${zh ? '。未逐项实测，配置不保证当前可购买。' : '. Not gameplay-tested; configuration does not guarantee availability.'}</p>
        ${entries}
        <p><strong>${zh ? '关联任务：' : 'Related quest: '}</strong><a href="${questRoute}">${label(ref.quest)}</a> — ${text(ref.quest)}</p>
        ${ref.care.length ? `<h3>${zh ? '照料清单' : 'Care checklist'}</h3><ol>${ref.care.map(step => `<li>${text(step)}</li>`).join('')}</ol>` : ''}
        ${ref.equipment.length ? `<p><strong>${zh ? '同店用品目录：' : 'Equipment in the same shop directory: '}</strong>${ref.equipment.map(label).join(zh ? '、' : ', ')}${zh ? '。这是目录信息，不代表全部必买，也不能由此推定具体食谱。' : '. A directory listing, not a required shopping list or proof of a species-specific diet.'}</p>` : ''}
        <h3>${zh ? '产物名称对照' : 'Product name lookup'}</h3>
        <ul>${['milk', 'meat'].map(group => `<li><strong>${group === 'milk' ? (zh ? '奶类：' : 'Milk: ') : (zh ? '肉类：' : 'Meat: ')}</strong>${ref.products.filter(p => p.group === group).map(label).join(zh ? '、' : ', ')}</li>`).join('')}</ul>
        <p class="database-browse-note">${zh ? '这些是物品定义，不代表每只动物都能产出全部规格；产量、周期和规格出现概率尚未验证。' : 'These are item definitions, not guaranteed outputs for every animal. Yield, production interval and size chances remain unverified.'}</p>
        <details class="database-outline"><summary>${zh ? '查看资料来源' : 'Reference sources'}</summary><p>${zh ? '站长从自购游戏的动物表、商店表、物品表及双语名称与提示中整理；原始游戏文件不提供下载。' : 'Interpreted from an owned copy’s animal, shop and item tables and bilingual names and guidance. Raw game files are not distributed.'}</p>${renderSources(ref.sourceIds)}</details>
      </div><!-- animal-build-reference-end -->`;
}

function renderWildlifeReference(locale) {
  const ref = data.wildlifeReference;
  if (!ref) return '';
  const zh = locale === 'zh';
  const kind = item => item.kind === 'butterfly' ? (zh ? '蝴蝶' : 'Butterfly') : (zh ? '鸟类' : 'Bird');
  const entries = ref.entries.map(item => {
    const name = escapeHtml(zh ? item.zhName : item.name);
    const tags = escapeHtml(`${item.name} ${item.zhName} ${item.kind} wildlife bird butterfly 野生生物 鸟 蝴蝶`);
    return `<article class="wildlife-profile" id="wildlife-${escapeHtml(item.id)}" data-search-entry data-search-title="${name}" data-search-tags="${tags}" data-search-status="${zh ? '构建资料（未实测）' : 'Build data (not gameplay-tested)'}"><h3><a href="#wildlife-${escapeHtml(item.id)}">${name}</a></h3><dl><div><dt>${zh ? '整理类别' : 'Lookup kind'}</dt><dd>${kind(item)}</dd></div><div><dt>${zh ? '源码稀有度字段' : 'Source rarity field'}</dt><dd>${escapeHtml(item.rarity)} · ${zh ? '含义未解码' : 'meaning not decoded'}</dd></div></dl></article>`;
  }).join('');
  return `<section class="evidence-ledger wildlife-reference" id="build-wildlife" data-wildlife-reference aria-labelledby="build-wildlife-heading"><div class="section-heading-row"><div><span class="kicker">${zh ? '站长整理 · 游戏构建资料' : 'Editor-collected · game-build reference'}</span><h2 id="build-wildlife-heading">${zh ? '野生鸟类与蝴蝶名称' : 'Wild birds and butterflies'}</h2></div><span class="tag">${escapeHtml(ref.build)}</span></div><p>${zh ? '此构建表保留 11 种鸟类和 2 种蝴蝶的双语名称。下面只公开名称与原始稀有度字段，空说明保持为空。' : 'This build table retains bilingual names for 11 birds and 2 butterflies. Only names and the original rarity field are shown; empty description slots remain empty.'}</p><div class="database-wildlife-grid">${entries}</div><p class="database-browse-note">${zh ? '源码把这些条目标为 Enemies / FISHING_HUNTING；这是内部分类，不代表敌对、掉落、生成地点或可捕猎。' : 'The source labels these entries Enemies / FISHING_HUNTING. Those internal labels do not establish hostility, drops, spawn locations or huntability.'}</p><details class="database-reference-notes"><summary>${zh ? '资料来源与边界' : 'Sources & limits'}</summary><p>${zh ? '13 个名称与 13 个空说明槽均从自购 build 24847725 的 I2 原始字节核对；原始游戏文件不提供下载。' : 'All 13 names and 13 empty description slots were checked against the original I2 bytes from owned build 24847725. Raw game files are not distributed.'}</p>${renderSources(ref.sourceIds)}</details></section>`;
}

function renderEnemyReference(locale) {
  const ref = data.enemyReference;
  if (!ref) return '';
  const zh = locale === 'zh';
  const entries = ref.entries.map(item => {
    const name = escapeHtml(zh ? item.zhName : item.name);
    const tags = escapeHtml(`${item.name} ${item.zhName} ${item.id} enemy creature spider skeleton 生物 蜘蛛 骨架`);
    return `<article class="wildlife-profile" id="enemy-${escapeHtml(item.id)}" data-search-entry data-search-title="${name}" data-search-tags="${tags}" data-search-status="${zh ? '构建名称（未实测）' : 'Build name (not gameplay-tested)'}"><h3><a href="#enemy-${escapeHtml(item.id)}">${name}</a></h3><dl><div><dt>${zh ? '原生英文名称' : 'Native English name'}</dt><dd>${escapeHtml(item.name)}</dd></div><div><dt>${zh ? '源码稀有度字段' : 'Source rarity field'}</dt><dd>${escapeHtml(item.rarity)} · ${zh ? '含义未解码' : 'meaning not decoded'}</dd></div></dl></article>`;
  }).join('');
  return `<section class="evidence-ledger wildlife-reference" id="build-enemies" data-enemy-reference aria-labelledby="build-enemies-heading"><div class="section-heading-row"><div><span class="kicker">${zh ? '站长整理 · 游戏构建资料' : 'Editor-collected · game-build reference'}</span><h2 id="build-enemies-heading">${zh ? '原生 Enemies 表名称' : 'Names retained in the Enemies table'}</h2></div><span class="tag">${escapeHtml(ref.build)}</span></div><p>${zh ? '此构建表保留 3 个双语名称和空 I2 说明栏。“骨架图案”是构建中的原生中文名称，本站不擅自改写成另一个译名。' : 'This build table retains three bilingual names and empty I2 description slots. “Skeleton” is the build-localized English name; identifier-like spider names are preserved instead of silently rewritten.'}</p><div class="database-wildlife-grid">${entries}</div><p class="database-browse-note">${zh ? '源表名 Enemies、内部 FISHING_HUNTING 分类和 Bronze/Silver/Gold 字段不证明敌对行为、危险程度、掉落、生成地点或可狩猎，也不证明当前版本实际生成这些对象。' : 'The Enemies table name, FISHING_HUNTING classification and Bronze/Silver/Gold fields do not establish hostile behavior, danger, drops, spawn locations or huntability, nor do they prove that these objects currently spawn in gameplay.'}</p><details class="database-reference-notes"><summary>${zh ? '资料来源与边界' : 'Sources & limits'}</summary><p>${zh ? '3 个名称与 3 个空说明槽均从自购 build 24847725 的 I2 原始字节核对；原始游戏文件不提供下载。' : 'All three names and three empty description slots were checked against the original I2 bytes from owned build 24847725. Raw game files are not distributed.'}</p>${renderSources(ref.sourceIds)}</details></section>`;
}

function renderHistoricalTable(species) {
  const rows = [];
  for (const animal of species) {
    for (const v of animal.variants) {
      rows.push(`              <tr id="${v.id}" data-search-entry data-search-title="${escapeHtml(v.name)}" data-search-tags="${escapeHtml(v.tags)}" data-search-status="Historical community report" data-category="historical">
                <td><a class="entry-anchor" href="#${v.id}">${escapeHtml(v.name)}</a></td><td>${escapeHtml(v.group)}</td><td data-sort="${v.historicalPrice.sort}">${escapeHtml(v.historicalPrice.display)}</td><td><span class="tag historical">Historical lead</span> <a href="https://the-ranchers.fandom.com/wiki/Nina%27s_Shop" rel="noopener noreferrer">Player Wiki</a></td>
              </tr>`);
    }
  }
  return rows.join("\n");
}

function renderVideoProducts(products) {
  return products.map((p) => {
    const note = p.note ? ` <strong>${escapeHtml(p.name)}: ${escapeHtml(p.note)}</strong>` : escapeHtml(p.name);
    return `          <li>${note} ${p.note ? badge({ evidenceLevel: "video-observed", validity: "current" }) : ""}</li>`;
  }).join("\n");
}

function renderSharedSystems(systems) {
  return systems.map((s) => {
    const cls = s.validity === "historical" || s.validity === "obsolete" ? ' class="fact-historical"' : "";
    return `          <li${cls}>${escapeHtml(s.text)} ${badge(s)}</li>`;
  }).join("\n");
}

function renderRoster(rows) {
  return rows.map((r) => {
    const tag = r.status === "pending" ? '<span class="tag pending">Pending observation</span>' : '<span class="tag">Confirmed</span>';
    return `            <tr><td>${escapeHtml(r.name)}</td><td>${tag}</td><td>${escapeHtml(r.confirms)}</td><td>${escapeHtml(r.check)}</td></tr>`;
  }).join("\n");
}

const speciesHtml = data.species.map(renderSpecies).join("\n\n");
const variantCount = data.species.reduce((n, a) => n + a.variants.length, 0);
const pendingCount = data.confirmedRoster.filter((r) => r.status === "pending").length;
const confirmedCount = data.confirmedRoster.filter((r) => r.status === "confirmed").length;

let html = `<!DOCTYPE html>
<!-- GENERATED by scripts/build-animals.cjs from data/animals.json — do not edit directly.
     Edit data/animals.json, then run: node scripts/build-animals.cjs && node scripts/build-search-index.cjs -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Ranchers Animal Database — Confirmed Roster & Data Tracker</title>
  <meta name="description" content="Search The Ranchers animal records, variants and reported prices with source links, build context and clear evidence labels separating current facts from historical player data.">
  <link rel="canonical" href="https://theranchersguide.com/database/animals">
  <link rel="alternate" hreflang="en" href="https://theranchersguide.com/database/animals">
  <link rel="alternate" hreflang="zh-CN" href="https://theranchersguide.com/zh/database/animals">
  <link rel="alternate" hreflang="x-default" href="https://theranchersguide.com/database/animals">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="The Ranchers Guide">
  <meta property="og:title" content="The Ranchers Animal Database — Confirmed Roster & Data Tracker">
  <meta property="og:description" content="Officially named animals, confirmed live-build systems, and a transparent queue for costs and production data that still need evidence.">
  <meta property="og:url" content="https://theranchersguide.com/database/animals">
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
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> / Database / Animals</nav>
      <h1>The Ranchers Animal Database</h1>
      <p class="meta">Current page baseline ${escapeHtml(data.meta.build)} · Video evidence recorded on ${escapeHtml(data.meta.videoBuild)} · Data last updated ${escapeHtml(data.meta.lastUpdated)} · Historical values are labeled</p>
      <nav class="toc" aria-label="Contents">
        <div class="toctitle">Contents</div>
        <ul>
${data.species.map((a) => `          <li class="toc-cat"><a href="#${a.id}">${escapeHtml(a.name)}</a>
            <ul class="toc-fields">
${a.fields.map((f) => `              <li><a href="#${a.id}-${f.key}">${escapeHtml(f.label)}</a></li>`).join("\n")}
            </ul>
          </li>`).join("\n")}
        </ul>
      </nav>
      <div class="evidence-status">
        <strong>Evidence status:</strong> ${confirmedCount} confirmed systems · ${data.sharedSystems.length} automation features · ${data.videoObservedProducts.length} video-observed shelf listings · ${variantCount} historical leads · ${pendingCount} pending rows · every fact carries its own evidence label — <a href="/methodology">How we verify →</a>
      </div>


      <figure class="page-banner"><img src="../assets/img/db-animals.webp" width="800" height="450" alt="The Ranchers gameplay screenshot: cows grazing outside the red barn"></figure>

      <div class="notice">
        <strong>Current-build note:</strong> Official Steam material names chickens, bunnies, goats, and cows and now confirms several animal-management rules. It still does not publish a complete price or production table.
      </div>

      <section class="evidence-ledger" aria-labelledby="animal-quick-start">
        <div class="section-heading-row">
          <div>
            <span class="kicker">Start Here</span>
            <h2 id="animal-quick-start">First animal: a practical care path</h2>
          </div>
          <a class="text-link" href="/guides/animal-guide">Open the animal troubleshooting guide</a>
        </div>
        <p>Chicken is the only animal with a broadly documented current-build care loop. Use this order before comparing prices or chasing production numbers:</p>
        <ol>
          <li>Finish the purchase prompt with Angela, then bring the chickens home from the fenced area behind her house.</li>
          <li>Link the coop and fill the indoor trough with hay and water. The outdoor trough is not required for ordinary daily feeding.</li>
          <li>Install the coop-specific heater from Angela on the coop exterior wall; a household decoration heater is not a substitute.</li>
          <li>For large eggs, keep needs and satisfaction high, pet the chickens, and provide an enclosed outdoor roaming area. This improves the chance; it does not guarantee the next egg is large.</li>
          <li>If an animal disappears, update to 0.8.10.842 or later first, then use the <a href="/guides/animal-guide">current troubleshooting checklist</a> rather than an older workaround.</li>
        </ol>
        <div class="notice info"><strong>Decision boundary:</strong> prices, production cycles and profit rankings for cow, goat and rabbit remain unverified in the current build. Use the profiles below as evidence-tracked records, not as a complete economy table.</div>
      </section>

      <p>Collect discoveries privately in <a href="/tools/field-notes">Field Notes</a>, then export the versioned record when it is complete enough to verify.</p>

      <p class="lead">This living database combines the official roster with clearly labeled player research. Each animal has its own anchored profile below — search an individual animal, inspect its source and version context, and help replace historical values with current-build evidence.</p>

${speciesHtml}

${renderWildlifeReference('en')}
${renderEnemyReference('en')}

      <section class="evidence-ledger" aria-labelledby="community-animal-data">
        <div class="section-heading-row">
          <div>
            <span class="kicker">Community Evidence</span>
            <h2 id="community-animal-data">Reported animal records</h2>
          </div>
          <a class="text-link" href="/contact">Submit a current-build correction</a>
        </div>
        <div class="notice warning">
          <strong>Historical Alpha data:</strong> these prices came from a player-maintained archive and may have changed for Early Access. They are preserved as research leads, not presented as current build ${escapeHtml(data.meta.build)} prices.
        </div>
        <div class="table-tools">
          <label class="visually-hidden" for="animal-record-search">Search reported animals</label>
          <input type="search" id="animal-record-search" placeholder="Search animal, variant or reported price..." data-table-search="animal-records-table">
          <label class="visually-hidden" for="animal-record-status">Filter animal evidence status</label>
          <select id="animal-record-status" data-table-filter="animal-records-table">
            <option value="">All evidence</option>
            <option value="historical">Historical community report</option>
          </select>
          <span class="tag" data-table-count="animal-records-table">- entries</span>
        </div>
        <div class="data-table-wrap">
          <table class="data-table evidence-table" id="animal-records-table">
            <thead>
              <tr>
                <th data-sortable>Animal <span class="sort-arrow"></span></th>
                <th data-sortable>Group <span class="sort-arrow"></span></th>
                <th data-sortable>Reported purchase price <span class="sort-arrow"></span></th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
${renderHistoricalTable(data.species)}
            </tbody>
          </table>
        </div>
        <p class="source-note"><strong>Source handling:</strong> animal names and reported prices were normalized from the community-maintained Nina's Shop page, reviewed August 2, 2026. The source still describes an Alpha build, so every price remains historical until current evidence replaces it.</p>
      </section>

      <section class="evidence-ledger" aria-labelledby="video-animal-products">
        <div class="section-heading-row">
          <div>
            <span class="kicker">Current-Build Evidence</span>
            <h2 id="video-animal-products">Video-observed animal products (recorded on build ${escapeHtml(data.meta.videoBuild)})</h2>
          </div>
          <a class="text-link" href="/contact">Submit a current-build correction</a>
        </div>
        <p>These products were seen on the Leafy Market vegetable/grocery shelves in launch-build footage <span class="tag evidence-video">Video-observed</span> <span title="Observed in Games Station gameplay footage (V0.8.10.455) at 03:45">Games Station video, 03:45</span>. They are <strong>shop shelf listings, not ranch-production measurements</strong> — they prove the items existed in build 0.8.10.455, not how a raised animal produces them or whether later patches changed the shelf.</p>
        <ul>
${renderVideoProducts(data.videoObservedProducts)}
        </ul>
        <p><strong>Player sell price: unknown</strong> — the retail shelf price does not equal what a rancher earns. Do not use 672C (or any shelf price) to estimate livestock income until an actual sell transaction is observed.</p>
        <p>Animal purchase prices were <strong>not observed</strong> in this footage, so the pending rows below stay pending and no animal price is claimed from this source.</p>
      </section>

      <section class="evidence-ledger" aria-labelledby="barn-automation">
        <div class="section-heading-row">
          <div>
            <span class="kicker">Official Systems</span>
            <h2 id="barn-automation">Barn automation: Feature Kits, Silos and Water Towers</h2>
          </div>
          <a class="text-link" href="/guides/animal-guide">Animal care guide</a>
        </div>
        <p><span class="tag evidence-official">Official</span> A full livestock-automation layer for barns and coops is <strong>officially documented in the pre-EA <a href="https://steamcommunity.com/app/1501310/allnews/" rel="noopener noreferrer">Ranching v2 update notes</a></strong> — with the caveat that <strong>current Early Access behavior (0.8.10.x) has not yet been independently rechecked</strong>:</p>
        <ul>
${renderSharedSystems(data.sharedSystems)}
        </ul>
        <p>Kit prices, coverage ranges and crafting requirements were not published in the official notes and remain pending current-build observation.</p>
      </section>

      <h2>Confirmed animals and systems</h2>

      <div class="table-tools">
        <label class="visually-hidden" for="animal-search">Search animals</label>
        <input type="search" id="animal-search" placeholder="Search animals or checks… (e.g. cow, housing)" data-table-search="animals-table">
        <label class="visually-hidden" for="animal-category">Filter by evidence status</label>
        <select id="animal-category" data-table-filter="animals-table">
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending observation</option>
        </select>
        <span class="tag" data-table-count="animals-table">– entries</span>
      </div>

      <div class="data-table-wrap">
        <table class="data-table" id="animals-table">
          <thead>
            <tr>
              <th data-sortable>Animal or system <span class="sort-arrow"></span></th>
              <th data-sortable>Status <span class="sort-arrow"></span></th>
              <th>What the official source confirms</th>
              <th>Launch check</th>
            </tr>
          </thead>
          <tbody>
${renderRoster(data.confirmedRoster)}
          </tbody>
        </table>
      </div>

      <div class="notice info">
        <strong>Core formula:</strong> animal profit per day = (product revenue − feed and recurring upkeep) ÷ production-cycle days. Keep the purchase price and housing cost separate as payback-period inputs. Use observed values in the <a href="/tools/profit-calculator">profit calculator</a>.
      </div>

      <h2>What is actually confirmed</h2>
      <p>The official Steam store description explicitly lists chickens, bunnies, goats, and cows. It also describes caring for animals as one part of the broader ranch loop. That supports the four roster rows above, but it does not support invented prices, product values, or rankings.</p>

      <h2>How to build a trustworthy animal row</h2>
      <p>Record the seller, purchase price and prerequisites; the housing cost, capacity and utilities; one full production cycle including feed, water, care interactions, elapsed days, output and quality; and the game version. Measure at least two consistent cycles through the same sale channel before ranking. The full workflow is on the <a href="/methodology">methodology page</a>.</p>

      <details class="pending-facts" style="margin-top:16px">
        <summary>Open research questions (5) — show</summary>
        <ul>
        <li>Are additional species present in the initial Early Access build?</li>
        <li>Which animals use barns, coops, pasture, or another structure?</li>
        <li>What daily care is mandatory, and what can be automated?</li>
        <li>How do product quality, friendship, breeding, or seasons affect output?</li>
        <li>Which costs are recurring, and how long does each investment take to repay?</li>
        </ul>
      </details>

      <h2>Sources</h2>
      <p>The confirmed roster comes from the <a href="https://store.steampowered.com/app/1501310/The_Ranchers/" rel="noopener noreferrer">official Steam store page</a>; transport, map and probability rules come from <a href="https://steamcommunity.com/app/1501310/allnews/" rel="noopener noreferrer">official Steam updates</a>, reviewed August 2026. Chicken care, automation and selling mechanics come from Steam discussion threads with official replies, scanned August 8, 2026. Video-observed product listings come from <a href="https://www.youtube.com/watch?v=GrFiYqWcBK0" rel="noopener noreferrer">Games Station gameplay footage (V0.8.10.455)</a>, reviewed August 7, 2026. How leads become verified values: <a href="/methodology">methodology</a>. Corrections: <a href="/contact">send a documented correction</a>.</p>
      <p>Planning a co-op barn? The <a href="/guides/multiplayer-coop">co-op guide</a> shows how to assign a dedicated barn lead. Need the egg quest or a location? Continue to the <a href="/guides/gigi-large-egg-quest">Gigi large-egg guide</a> or <a href="/map">the map</a>. Building your first ranch? Start with the <a href="/guides/beginners-guide">beginner's guide</a>.</p>


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

function renderZhSources(sourceIds = []) {
  if (sourceIds.length === 0) return "";
  const links = sourceIds.map((id) => {
    const src = data.sources[id];
    if (!src) throw new Error(`Unknown Chinese source id: ${id}`);
    const label = escapeHtml(src.title);
    return src.url ? `<a href="${escapeHtml(src.url)}" rel="noopener noreferrer">来源</a>` : label;
  });
  return ` <span class="fact-source">${links.join(" · ")}</span>`;
}

function renderZhEntry(entry) {
  const zh = entry.zh;
  const head = zh.kicker || zh.headerTag
    ? `<div class="section-heading-row"><div>${zh.kicker ? `<span class="kicker">${escapeHtml(zh.kicker)}</span>` : ""}<h2>${escapeHtml(zh.name)}</h2></div>${zh.headerTag ? `<span class="tag">${escapeHtml(zh.headerTag)}</span>` : ""}</div>`
    : `<h2>${escapeHtml(zh.name)}</h2>`;
  const summary = zh.summary ? `<p>${escapeHtml(zh.summary)}</p>` : "";
  const groups = zh.groups.map((g) => {
    const h = g.heading ? `<h3${g.id ? ` id="${g.id}"` : ""}>${escapeHtml(g.heading)}</h3>` : "";
    const confirmed = g.facts.filter((f) => f.badge !== "unknown");
    const pending = g.facts.filter((f) => f.badge === "unknown");
    const items = confirmed.map((f) => `<li>${escapeHtml(f.text)}${zhBadge(f.badge)}${renderZhSources(f.sourceIds)}</li>`).join("");
    const pendingBlock = pending.length > 0
      ? `<details class="pending-facts"><summary>${pending.length} 条待验证 — 展开</summary><ul class="evidence-list pending-list">${pending.map((f) => `<li>${escapeHtml(f.text)}${zhBadge(f.badge)}${renderZhSources(f.sourceIds)}</li>`).join("")}</ul></details>`
      : "";
    return `${h}${items ? `<ul class="evidence-list">${items}</ul>` : ""}${pendingBlock}`;
  }).join("");
  const decision = zh.whenNeeded ? `<div class="entity-decision"><strong>什么时候查</strong><p>${escapeHtml(zh.whenNeeded)}</p></div>` : "";
  return `    <section class="evidence-ledger animal-profile"><div id="${entry.id}" data-search-entry data-search-title="${escapeHtml(zh.searchTitle)}" data-search-tags="${escapeHtml(zh.searchTags)}">${head}${summary}${decision}</div>${renderNativeAnimalReference(entry, 'zh')}${renderBuildReference(entry, 'zh')}${entry.buildReference ? `<details class="database-outline"><summary>更多照料证据与待验证项</summary>${groups}</details>` : groups}</section>`;
}

function renderZhExtra(extra) {
  const sections = extra.sections.map((s) => {
    const paras = (s.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
    const badge = s.badge ? zhBadge(s.badge) : "";
    const steps = s.steps ? `<ol>${s.steps.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ol>` : "";
    const notice = s.notice ? `<div class="notice">${escapeHtml(s.notice)}</div>` : "";
    return `    <section id="${s.id}" data-search-entry data-search-title="${escapeHtml(s.searchTitle)}" data-search-tags="${escapeHtml(s.searchTags)}"><h2>${escapeHtml(s.heading)}</h2>${paras}${badge}${steps}${notice}</section>`;
  }).join("\n");
  const related = `<section class="related"><h2>继续查询</h2><p>${extra.related.map((r) => `<a href="${escapeHtml(r.href)}">${escapeHtml(r.label)}</a>`).join(" · ")}</p></section>`;
  return `${sections}\n    ${related}`;
}

const zhTocItems = data.species.filter((a) => a.zh).map((a) => `<li><a href="#${a.id}">${escapeHtml(a.zh.tocLabel)}</a></li>`).join("")
  + data.zhExtra.sections.map((s) => `<li><a href="#${s.id}">${escapeHtml(s.tocLabel)}</a></li>`).join("");

let zhHtml = `<!DOCTYPE html>
<!-- GENERATED by scripts/build-animals.cjs from data/animals.json (zh blocks) — do not edit directly. -->
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Ranchers 中文动物数据库 | 鸡、牛、山羊与兔</title>
  <meta name="description" content="The Ranchers 中文动物数据库：鸡舍、喂食、饮水、温控、产蛋、疾病和动物消失排查，逐条标注证据状态。">
  <link rel="canonical" href="https://theranchersguide.com/zh/database/animals">
  <link rel="alternate" hreflang="en" href="https://theranchersguide.com/database/animals"><link rel="alternate" hreflang="zh-CN" href="https://theranchersguide.com/zh/database/animals"><link rel="alternate" hreflang="x-default" href="https://theranchersguide.com/database/animals">
  <meta property="og:type" content="website"><meta property="og:title" content="The Ranchers 中文动物数据库"><meta property="og:description" content="按版本和证据整理动物照料资料。"><meta property="og:url" content="https://theranchersguide.com/zh/database/animals"><meta property="og:image" content="https://theranchersguide.com/assets/img/db-animals.jpg">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css?v=20260821-ui1"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4804883741146501" crossorigin="anonymous"></script>
</head>
<body>
  <header class="site-header"><nav class="nav-inner" aria-label="主导航"><a class="logo" href="/zh/"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide<small>非官方中文玩家指南</small></span></a><button class="nav-toggle" aria-expanded="false" aria-label="展开导航">☰</button><ul class="nav-links"><li><a href="/zh/guides/beginners-guide">新手</a></li><li><a class="active" href="/zh/database">知识库</a></li><li><a href="/zh/map">地图</a></li><li><a href="/zh/problems">问题</a></li><li><a href="/zh/search">搜索</a></li><li><a class="nav-cta" href="/contribute">投稿</a></li></ul></nav></header>
  <main><article class="article" style="max-width:980px">
    <nav class="breadcrumb" aria-label="面包屑"><a href="/zh/">首页</a> / <a href="/zh/database">知识库</a> / 动物</nav><h1>The Ranchers 中文动物数据库</h1><p class="meta">页面基线 ${escapeHtml(data.meta.build)} · 视频证据录制于 ${escapeHtml(data.meta.videoBuild)} · ${escapeHtml(data.meta.lastUpdated)} 更新 · 旧版本内容单独标注</p>
    <div class="evidence-status"><strong>证据说明：</strong>“官方”来自开发者说明；“视频观测”来自保留版本号的画面；“多人印证”只证明多人遇到同类行为；“单一线索”不能直接当成确定机制。</div>
    <figure class="page-banner"><img src="/assets/img/db-animals.webp" width="800" height="450" alt="The Ranchers 牧场中的牛与红色谷仓"></figure>
    <section class="evidence-ledger" aria-labelledby="animal-quick-start-zh">
      <div class="section-heading-row"><div><span class="kicker">先从这里开始</span><h2 id="animal-quick-start-zh">第一次养动物：先走这条照料路径</h2></div><a class="text-link" href="/zh/guides/animal-guide">打开动物排障指南</a></div>
      <p>目前只有鸡的当前版本照料链条有较完整证据。先按这个顺序操作，再考虑价格或收益比较：</p>
      <ol>
        <li>在 Angela 处完成购买提示，然后到她房屋后方的围栏区域把鸡带回牧场。</li>
        <li>确认鸡舍已关联，补满室内食槽的干草和水；日常喂养不要求额外放置室外食槽。</li>
        <li>使用 Angela 出售的鸡舍专用暖气，并安装在鸡舍外墙；市政厅的住宅装饰暖气不能替代它。</li>
        <li>想提高大鸡蛋出现机会时，保持需求和满意度较高、每天抚摸，并准备封闭的室外活动区；这只是提高机会，不保证下一枚就是大鸡蛋。</li>
        <li>如果动物消失，先把游戏更新到 0.8.10.842 或更高版本，再按<a href="/zh/guides/animal-guide">当前排障清单</a>记录问题，不要直接套用旧版本规避法。</li>
      </ol>
      <div class="notice info"><strong>数据边界：</strong>牛、山羊和兔的当前购买价、生产周期与收益排名仍未验证。下面的条目是带证据状态的记录，不是完整经济表。</div>
    </section>
    <nav class="toc" aria-label="动物目录"><strong>快速跳转：</strong><ul>${zhTocItems}</ul></nav>
${data.species.filter((a) => a.zh).map(renderZhEntry).join("\n")}
${renderWildlifeReference('zh')}
${renderEnemyReference('zh')}
${renderZhExtra(data.zhExtra)}
  </article></main>
  <footer class="site-footer"><div class="container"><div class="footer-bottom"><span>&copy; <span data-year></span> The Ranchers Guide</span><span>证据等级与版本标注与英文页一致</span></div></div></footer><script src="/assets/js/main.js?v=20260810-nav1" defer></script>
</body></html>
`;

const { decoratePage } = require('./render-database-browser.cjs');
html = decoratePage(html, data, 'animals', 'en');
zhHtml = decoratePage(zhHtml, data, 'animals', 'zh');

const output = path.join(root, "database", "animals.html");
const zhOutput = path.join(root, "zh", "database", "animals.html");

if (process.argv.includes("--check")) {
  let failed = false;
  if (!fs.existsSync(output) || fs.readFileSync(output, "utf8") !== html) {
    console.error("FAIL: database/animals.html is missing or out of sync with data/animals.json. Re-run: node scripts/build-animals.cjs");
    failed = true;
  }
  if (!fs.existsSync(zhOutput) || fs.readFileSync(zhOutput, "utf8") !== zhHtml) {
    console.error("FAIL: zh/database/animals.html is missing or out of sync with data/animals.json. Re-run: node scripts/build-animals.cjs");
    failed = true;
  }
  if (failed) process.exit(1);
  console.log(`PASS: database/animals.html + zh/database/animals.html are in sync with data/animals.json (${data.species.length} species, ${variantCount} variants).`);
} else {
  fs.writeFileSync(output, html, "utf8");
  fs.mkdirSync(path.dirname(zhOutput), { recursive: true });
  fs.writeFileSync(zhOutput, zhHtml, "utf8");
  console.log(`Wrote database/animals.html + zh/database/animals.html: ${data.species.length} species profiles, ${variantCount} historical variants.`);
}
