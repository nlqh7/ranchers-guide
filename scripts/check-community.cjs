const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const data = JSON.parse(read("data/community.json"));
const english = read("community.html");
const chinese = read("zh/community.html");
const materialQuestion = data.sources.find(entry => entry.id === "coal-zirconite");
const mergedMaterialQuestion = data.sources.find(entry => entry.id === "coal-zerkonite-question");
assert.equal(mergedMaterialQuestion.mergedInto, materialQuestion.id, "Duplicate scan records must share one player-facing material answer, while retaining both originals");
assert.equal(materialQuestion.date, "2026-08-20");
assert.equal(mergedMaterialQuestion.date, "2026-08-22");

assert.equal(data.build, "0.8.10.842");
assert.ok(data.sources.length >= 8, "community radar should have a useful source snapshot");
assert.ok(data.externalResources.length >= 5, "community page should expose classified external resources");
assert.ok(data.externalResources.some((entry) => entry.id === "official-press-kit"));
assert.ok(data.externalResources.some((entry) => entry.id === "crop-yield-lead"));
assert.ok(data.externalResources.every((entry) => /^https:\/\//.test(entry.url)));
assert.ok(data.sources.some((entry) => entry.status === "official"));
assert.ok(data.sources.some((entry) => entry.status === "question"));
assert.ok(data.sources.some((entry) => entry.status === "reported"));
assert.ok(data.sources.every((entry) => /^https:\/\//.test(entry.url)));
assert.ok(data.sources.every((entry) => entry.summary && entry.summaryZh && entry.why && entry.whyZh));
assert.ok(data.sources.every((entry) => entry.risk && entry.riskZh));
assert.ok(data.sources.every((entry) => entry.relatedEntity && entry.relatedEntityZh));
assert.ok(data.sources.every((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date)), "every community signal needs an ISO report date");
assert.ok(data.sources.every((entry) => entry.relatedRoute && entry.relatedLabel && entry.relatedLabelZh), "every community signal needs a next-step route");
assert.ok(data.sources.every((entry) => /^\//.test(entry.relatedRoute)), "community next-step routes must be root-relative");
assert.ok(data.sources.filter((entry) => entry.relatedEntityRoute).every((entry) => /^\//.test(entry.relatedEntityRoute)));
assert.ok(data.sources.filter((entry) => entry.status === "reported").every((entry) => entry.sourceLinks?.every((source) => /^https:\/\//.test(source.url)) ?? true));

for (const [page, language, canonical, alternate] of [
  [english, "en", "https://theranchersguide.com/community", "https://theranchersguide.com/zh/community"],
  [chinese, "zh-CN", "https://theranchersguide.com/zh/community", "https://theranchersguide.com/community"],
]) {
  assert.match(page, new RegExp(`<html lang="${language}">`));
  assert.match(page, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`));
  assert.match(page, new RegExp(`hreflang="${language === "en" ? "zh-CN" : "en"}" href="${alternate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(page, /data-community-query/);
  assert.match(page, /data-community-filter/);
  assert.match(page, /data-question-builder/);
  assert.match(page, /data-copy-question/);
  assert.match(page, /data-open-steam/);
  assert.match(page, /data-send-report/);
  assert.match(page, /steamcommunity\.com\/app\/1501310\/discussions/);
  assert.match(page, /reference-desk/);
  const cards = page.match(/<article class="community-radar-card(?: community-answer-card)?"[\s\S]*?<\/article>/g) || [];
  assert.equal(cards.length, data.sources.filter(entry => !entry.mergedInto).length, "generated page must render one card per canonical topic");
  const materialCard = cards.find(card => card.includes('id="coal-zirconite"'));
  assert.ok(materialCard.includes('id="coal-zerkonite-question"'), "The merged record's old hash must land inside the same visible material card");
  const knownAnswer = materialCard.indexOf(language === 'en' ? 'Zirconite purchase route' : '锆矿购买路线');
  const history = materialCard.indexOf('<details');
  assert.ok(knownAnswer >= 0 && history > knownAnswer, "Known material answers must precede folded scan history");
  assert.ok(materialCard.includes(language === 'en' ? 'Charcoal' : '木炭'), "Do not silently equate an unresolved Coal label with Charcoal");
  assert.ok(materialCard.includes('2026-08-20') && materialCard.includes('2026-08-22'), "Both scan snapshots must remain available");
  const charcoalCard = cards.find(card => card.includes('id="charcoal-current-lead"'));
  assert.ok(charcoalCard.includes('592942202593765840'), 'The stale Charcoal lead must link the existing staff answer rather than imply only an Alpha lead exists');
  assert.ok(charcoalCard.includes('3492005739869963615'), 'The original Alpha source must remain in folded history, not be silently lost');
  assert.ok(cards.every((card) => /community-card-meta/.test(card) && /\d{4}-\d{2}-\d{2}/.test(card) && ["Source date:", "Last reported:", "来源日期:", "最后报告:", "Scan dates:", "收录日期:"].some((label) => card.includes(label))), "every signal card must show a labelled source or scan date");
  assert.ok(cards.every((card) => /community-card-actions/.test(card) && /href="\//.test(card)), "every signal card must expose an internal next step");
  assert.match(page, /Official Press Kit|官方 Press Kit/);
  assert.doesNotMatch(page, /community-card-meta">(?:official|community|asset)<\/span>/);
}

const css = read("assets/css/style.css");
assert.match(css, /\.community-reference-grid\s*\{[^}]*grid-template-columns:\s*1fr/);
assert.match(css, /@media \(min-width: 1100px\)[\s\S]*\.community-reference-grid\s*\{[^}]*repeat\(3/);

assert.match(read("assets/js/community.js"), /data-community-card/);
assert.match(read("assets/js/community.js"), /navigator\.clipboard/);
assert.match(read("assets/js/community.js"), /contribute@theranchersguide\.com/);
assert.match(read("sitemap.xml"), /https:\/\/theranchersguide\.com\/community/);
assert.match(read("sitemap.xml"), /https:\/\/theranchersguide\.com\/zh\/community/);
assert.match(chinese, /href="\/zh\/database\/animals#chicken"/);
assert.match(chinese, /href="\/zh\/guides\/animal-guide"/);
assert.doesNotMatch(chinese, /href="\/(?:database|guides|problems|tools|updates)(?:\/|#)/);

const search = require('../assets/js/search-core.js');
for (const locale of ['en', 'zh']) {
  const index = JSON.parse(read(locale === 'zh' ? 'zh/search-index.json' : 'search-index.json'));
  const prefix = locale === 'zh' ? '/zh' : '';
  const results = search.searchDocuments(index, locale === 'zh' ? '煤和锆矿在哪里找' : 'where to find coal and zirconite', index.length);
  const scans = results.filter(result => result.url === prefix + '/community#coal-zirconite' || result.url === prefix + '/community#coal-zerkonite-question');
  assert.deepEqual(scans.map(result => result.url), [prefix + '/community#coal-zirconite'], 'Two scans must yield one useful material answer in search');
  assert.ok(scans[0].snippet.includes('Meriam'), 'The material result should start with the known route, not scan-management prose');
  assert.ok(!/Why it matters|为什么值得看/.test(scans[0].snippet));
  const oreOnlyResults = search.searchDocuments(index, locale === 'zh' ? '锆矿怎么获得' : 'where to buy zerkonite', index.length);
  assert.ok(!oreOnlyResults.some(result => result.url === prefix + '/community#coal-zerkonite-question'), 'A pure ore question must not retrieve a second copy of the same scan');
}
console.log(`PASS: ${data.sources.length} retained source records form ${data.sources.filter(entry => !entry.mergedInto).length} community cards, with one material answer and preserved legacy hashes.`);
