const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const data = JSON.parse(read("data/community.json"));
const english = read("community.html");
const chinese = read("zh/community.html");

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
  const cards = page.match(/<article class="community-radar-card"[\s\S]*?<\/article>/g) || [];
  assert.equal(cards.length, data.sources.length, "generated page must render every community signal");
  assert.ok(cards.every((card) => /community-card-meta/.test(card) && /\d{4}-\d{2}-\d{2}/.test(card) && ["Source date:", "Last reported:", "来源日期:", "最后报告:"].some((label) => card.includes(label))), "every signal card must show a labelled date");
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

console.log(`PASS: community radar has ${data.sources.length} source-linked cards, bilingual question builder and external discussion routes.`);
