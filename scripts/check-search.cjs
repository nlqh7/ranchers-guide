const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const RanchersSearch = require("../assets/js/search-core.js");
const { searchDocuments } = RanchersSearch;

const documents = [
  {
    title: "Animal Guide",
    url: "/guides/animal-guide",
    description: "Housing, feed and care for ranch animals.",
    sections: [
      { heading: "Poultry care", text: "Build suitable housing before buying chickens and confirm daily feed requirements." },
    ],
  },
  {
    title: "Multiplayer and Co-op",
    url: "/guides/multiplayer-coop",
    description: "Host, join and divide work with friends.",
    sections: [
      { heading: "Save and rejoin", text: "The host should confirm the save before every player leaves the co-op session." },
    ],
  },
  {
    title: "Crop Database",
    url: "/database/crops",
    description: "Versioned crop observations.",
    sections: [
      { heading: "Growth tests", text: "Record seed price, growth time and harvested yield for the current build." },
    ],
  },
];

assert.equal(searchDocuments(documents, "animal housing")[0].url, "/guides/animal-guide");
assert.equal(searchDocuments(documents, "chikcen")[0].url, "/guides/animal-guide");
assert.equal(searchDocuments(documents, "coop save")[0].url, "/guides/multiplayer-coop");
assert.equal(searchDocuments(documents, "seed yield")[0].url, "/database/crops");
assert.deepEqual(searchDocuments(documents, "spaceship laser"), []);

const chineseDocuments = [
  {
    title: "动物数据库",
    url: "/zh/database/animals",
    description: "鸡的喂养、饮水、鸡舍温控和大鸡蛋条件。",
    sections: [
      { heading: "鸡突然消失", text: "先检查鸡舍关联、围栏、温控和每日需求，再记录存档版本。" },
    ],
  },
  {
    title: "作物数据库",
    url: "/zh/database/crops",
    description: "种子价格、生长时间、季节和 CashIn 出售方式。",
    sections: [
      { heading: "草莓", text: "春季种子价格为 144C，首次成熟需要 7 天，之后每 3 天再次收获。" },
    ],
  },
];

assert.equal(searchDocuments(chineseDocuments, "鸡消失")[0].url, "/zh/database/animals");
assert.equal(searchDocuments(chineseDocuments, "草莓多久成熟")[0].url, "/zh/database/crops");

const naturalLanguageDocuments = [
  {
    title: "Building and Construction Guide",
    url: "/guides/building-construction",
    type: "Guide",
    description: "Materials, blueprints and placement help.",
    sections: [
      { id: "materials", heading: "Materials: charcoal and zirconite", text: "Zirconite is sold by Meriam at City Hall." },
    ],
  },
  {
    title: "Animal Guide",
    url: "/guides/animal-guide",
    type: "Guide",
    description: "Feed and care for chickens.",
    sections: [
      { id: "feed", heading: "Feed and hay", text: "Chickens eat hay from the trough inside the coop." },
    ],
  },
];

assert.equal(searchDocuments(naturalLanguageDocuments, "where can I buy zirconite")[0].url, "/guides/building-construction");
assert.equal(searchDocuments(naturalLanguageDocuments, "how do I get hay for my hens")[0].url, "/guides/animal-guide");

const answerDocuments = RanchersSearch.expandEntryDocuments(naturalLanguageDocuments[0]);
const zirconiteAnswer = searchDocuments(answerDocuments, "where can I buy zirconite")[0];
assert.equal(zirconiteAnswer.url, "/guides/building-construction#materials");
assert.equal(zirconiteAnswer.type, "Guide answer");
assert.match(zirconiteAnswer.title, /charcoal and zirconite/i);

const questVsGeneral = RanchersSearch.expandEntryDocuments({
  title: "Gigi Quest Walkthrough",
  url: "/guides/gigi",
  type: "Guide",
  description: "Quest help.",
  sections: [{ id: "eggs", heading: "Step 1: getting 2 large eggs", text: "Hand the eggs to Gigi." }]
}).concat(RanchersSearch.expandEntryDocuments({
  title: "Animal Guide",
  url: "/guides/animals",
  type: "Guide",
  description: "Animal care.",
  sections: [{ id: "eggs", heading: "Eggs and large eggs", text: "Large eggs are used in the Gigi quest." }]
}));
assert.equal(searchDocuments(questVsGeneral, "Gigi large eggs")[0].url, "/guides/gigi#eggs");
assert.deepEqual(RanchersSearch.queryTokens("where was my car impounded"), ["vehicle", "impounded"]);
assert.deepEqual(RanchersSearch.sectionDocuments({
  title: "Problems directory",
  url: "/problems",
  type: "Problem",
  sectionAnswers: false,
  sections: [{ id: "vehicles", heading: "Vehicle problems", text: "Impounded cars." }]
}), []);

const result = searchDocuments(documents, "daily feed")[0];
assert.match(result.snippet, /daily feed requirements/i);
assert.ok(result.score > 0);

const expandedDocuments = RanchersSearch.expandEntryDocuments({
  title: "The Ranchers Crop Database",
  url: "/database/crops",
  type: "Database",
  description: "Source-backed crop data.",
  sections: [],
  entries: [
    {
      id: "strawberry-seeds",
      title: "Strawberry Seeds",
      text: "Historical community report: Spring seed, daily fruit after maturity, 10-20 berries per plot.",
      tags: "strawberry berry regrow spring",
      status: "Historical community report"
    }
  ]
});
const strawberryResult = searchDocuments(expandedDocuments, "strawbery daily fruit")[0];
assert.equal(strawberryResult.url, "/database/crops#strawberry-seeds");
assert.equal(strawberryResult.type, "Crop data");
assert.match(strawberryResult.snippet, /Historical community report/i);

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) return htmlFiles(target);
    return entry.isFile() && entry.name.endsWith(".html") ? [target] : [];
  });
}

const root = path.resolve(__dirname, "..");
const pages = htmlFiles(root);
assert.ok(pages.length >= 17);
pages.forEach((file) => {
  const html = fs.readFileSync(file, "utf8");
  const searchHref = /<html lang="zh-CN">/.test(html) ? /href="\/zh\/search"/ : /href="\/search"/;
  assert.match(html, searchHref, `${path.relative(root, file)} needs its locale Search link`);
});
const searchPage = fs.readFileSync(path.join(root, "search.html"), "utf8");
const homePage = fs.readFileSync(path.join(root, "index.html"), "utf8");
const knowledgeBasePage = fs.readFileSync(path.join(root, "database.html"), "utf8");
const sharedScript = fs.readFileSync(path.join(root, "assets", "js", "main.js"), "utf8");
assert.match(searchPage, /name="robots" content="noindex,follow"/);
assert.match(searchPage, /data-search-clear[^>]+aria-label="Clear search"/);
assert.match(searchPage, /class="site-search-submit"[^>]+aria-label="Search"/);
assert.match(searchPage, /class="site-search-icon"[^>]+aria-hidden="true"/);
assert.match(sharedScript, /className = "nav-search-form"/);
assert.match(sharedScript, /var searchRoute = isChinese \? "\/zh\/search" : "\/search"/);
assert.match(sharedScript, /form\.action = searchRoute/);
assert.match(sharedScript, /input\.name = "q"/);
assert.match(sharedScript, /target\.scrollIntoView\(\{ block: "start" \}\)/);
assert.match(homePage, /class="hero-search"[^>]+action="\/search"/);
assert.match(knowledgeBasePage, /<h1>The Ranchers Knowledge Base<\/h1>/);
assert.match(knowledgeBasePage, /href="\/guides\/animal-guide#feeding"/);
assert.match(fs.readFileSync(path.join(root, "assets", "js", "search.js"), "utf8"), /"\/database"/);
assert.match(fs.readFileSync(path.join(root, "assets", "js", "search.js"), "utf8"), /search-index\.json/);
assert.match(sharedScript, /pageHasMainSearch = \["\/", "\/database", "\/search", "\/zh", "\/zh\/database", "\/zh\/search"\]/);

/* Prebuilt search index (scripts/build-search-index.cjs — re-run after content edits). */
const prebuiltIndex = JSON.parse(fs.readFileSync(path.join(root, "search-index.json"), "utf8"));
assert.ok(Array.isArray(prebuiltIndex) && prebuiltIndex.length >= pages.length, "search-index.json must cover every page");
/* Drift guard: the committed index must be byte-identical to a fresh build. */
const drift = require("node:child_process").spawnSync(process.execPath, [path.join(root, "scripts", "build-search-index.cjs"), "--check"], { cwd: root, encoding: "utf8" });
assert.equal(drift.status, 0, `search-index.json drift detected — re-run node scripts/build-search-index.cjs\n${drift.stdout}${drift.stderr}`);
const zirconiteHit = searchDocuments(prebuiltIndex, "where can I buy zirconite")[0];
assert.equal(zirconiteHit.url, "/guides/building-construction#materials");
assert.equal(zirconiteHit.type, "Guide answer");
assert.match(fs.readFileSync(path.join(root, "database", "crops.html"), "utf8"), /id="strawberry-seeds"[^>]+data-search-entry/);
assert.match(fs.readFileSync(path.join(root, "database", "animals.html"), "utf8"), /id="black-chicken"[^>]+data-search-entry/);

const chineseIndex = JSON.parse(fs.readFileSync(path.join(root, "zh", "search-index.json"), "utf8"));
const missingChickenResults = searchDocuments(chineseIndex, "鸡消失");
assert.equal(missingChickenResults[0].url, "/zh/problems#animals");
assert.ok(missingChickenResults.some((result) => result.url === "/zh/database/animals#missing"));
assert.equal(searchDocuments(chineseIndex, "草莓多久成熟")[0].url, "/zh/database/crops#strawberry");
assert.equal(searchDocuments(chineseIndex, "种子商店在哪里")[0].url, "/zh/map#leafy-market");

console.log(`PASS: site search handles fuzzy queries and is linked from ${pages.length} HTML pages.`);
