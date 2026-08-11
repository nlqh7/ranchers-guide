const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const problemPages = [
  "problems/offline-mode-loading.html",
  "problems/friend-session-join.html",
  "problems/vehicle-recovery.html",
  "problems/fast-travel-subway.html",
  "problems/failed-quest-replay.html",
];

const hub = read("problems.html");
problemPages.forEach((relativePath) => {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} must exist`);
  const html = read(relativePath);
  const route = `/${relativePath.replace(/\.html$/, "")}`;
  assert.match(html, new RegExp(`<link rel="canonical" href="https://theranchersguide\\.com${route.replaceAll("/", "\\/")}"`));
  assert.match(html, /data-evidence-status="(?:official|corroborated)"/);
  assert.match(html, /0\.8\.10\.455/);
  assert.match(html, /https:\/\/steamcommunity\.com\/app\/1501310/);
  assert.match(hub, new RegExp(`href="${route.replaceAll("/", "\\/")}"`));
});

const research = read("research.html");
assert.match(research, /id="roof-quest"/);
assert.match(research, /id="furniture-placement"/);
assert.match(research, /id="power-to-the-bench"/);
assert.match(research, /id="aubergine-regrow"/);
assert.match(research, /id="chicks-disappear"/);
assert.match(research, /id="excess-electricity"/);
assert.match(research, /id="exterior-walls"/);
assert.match(research, /sharedfiles\/filedetails\/\?id=2883435340/);
assert.match(research, /Official[\s\S]*Video-observed[\s\S]*Community-confirmed[\s\S]*Player-tested[\s\S]*Unverified lead[\s\S]*Historical[\s\S]*Obsolete/);

const earlyAccessStatus = read("guides/release-time-checklist.html");
assert.match(earlyAccessStatus, /data-evidence-status="official"/);
assert.match(earlyAccessStatus, /0\.8\.10\.455/);
assert.match(earlyAccessStatus, /Current version at a glance/);
assert.match(earlyAccessStatus, /0\.8\.10\.562/);
assert.match(earlyAccessStatus, /Current roadmap: available now vs\. planned/);
assert.match(earlyAccessStatus, /Launch-week player reports/);
assert.match(earlyAccessStatus, /reddit\.com\/r\/CozyGamers\/comments\/1vb46yx/);

const contribute = read("contribute.html");
assert.match(contribute, /name="robots" content="noindex,follow"/);
assert.doesNotMatch(contribute, /adsbygoogle/);
assert.match(contribute, /data-contribution-form/);
assert.match(contribute, /mailto:contribute@theranchersguide\.com/);

const contributionScript = read("assets/js/contribute.js");
assert.match(contributionScript, /mailto:contribute@theranchersguide\.com/);

const contact = read("contact.html");
for (const address of ["hello", "corrections", "business"]) {
  assert.match(contact, new RegExp(`mailto:${address}@theranchersguide\\.com`));
}

for (const relativePath of ["404.html", "search.html", "about.html", "contact.html", "privacy.html", "problems.html", "tools/field-notes.html"]) {
  assert.doesNotMatch(read(relativePath), /adsbygoogle/, `${relativePath} must not request automatic ads`);
}

const contributionCore = require("../assets/js/contribute-core.js");
const body = contributionCore.buildSubmissionBody({
  topic: "Crop data",
  build: "0.8.10.455",
  platform: "Windows",
  finding: "Garlic took five occupied days in a control plot.",
  method: "Planted after waking and checked once per in-game morning.",
  source: "Screenshot attached",
  credit: "RanchTester",
});
assert.match(body, /Build: 0\.8\.10\.455/);
assert.match(body, /Method: Planted after waking/);
assert.match(body, /Credit: RanchTester/);

const searchScript = read("assets/js/search.js");
for (const route of [
  "/problems",
  "/research",
  "/guides/release-time-checklist",
  ...problemPages.map((file) => `/${file.replace(/\.html$/, "")}`),
]) {
  assert.match(searchScript, new RegExp(`"${route.replaceAll("/", "\\/")}"`));
}
assert.match(searchScript, /ranchers-search-index-v17/);
assert.match(searchScript, /ranchers-search-index-zh-v3/);

const chineseProblems = read("zh/problems.html");
assert.match(chineseProblems, /data-problem-search/);
assert.match(chineseProblems, /data-problem-filter-value="solved"/);
assert.match(chineseProblems, /data-problem-filter-value="reported"/);
assert.equal((chineseProblems.match(/data-problem-entry/g) || []).length, 9, "Chinese problem finder must cover all nine published records");
assert.match(chineseProblems, /assets\/js\/problems\.js/);

const sitemap = read("sitemap.xml");
assert.match(sitemap, /https:\/\/theranchersguide\.com\/problems/);
assert.match(sitemap, /https:\/\/theranchersguide\.com\/research/);
assert.match(sitemap, /https:\/\/theranchersguide\.com\/guides\/release-time-checklist/);
assert.doesNotMatch(sitemap, /https:\/\/theranchersguide\.com\/contribute/);

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) return htmlFiles(target);
    return entry.isFile() && entry.name.endsWith(".html") ? [target] : [];
  });
}

for (const file of htmlFiles(root)) {
  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  const isChinese = relative.startsWith(`zh${path.sep}`);
  assert.match(html, isChinese ? /href="\/zh\/problems"/ : /href="\/problems"/, `${relative} needs a locale-matched Problems link`);
  if (!isChinese) assert.match(html, /href="\/research"/, `${relative} needs a Research link`);
  assert.match(html, /href="\/contribute(?:"|\?)/, `${relative} needs a Contribute link`);
}

console.log(`PASS: research hub, ${problemPages.length} sourced problem pages, contribution flow and discovery links are complete.`);
