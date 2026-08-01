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
  assert.match(fs.readFileSync(file, "utf8"), /href="\/search"/, `${path.relative(root, file)} needs a Search link`);
});
const searchPage = fs.readFileSync(path.join(root, "search.html"), "utf8");
const sharedScript = fs.readFileSync(path.join(root, "assets", "js", "main.js"), "utf8");
assert.match(searchPage, /name="robots" content="noindex,follow"/);
assert.match(searchPage, /data-search-clear[^>]+aria-label="Clear search"/);
assert.match(searchPage, /class="site-search-submit"[^>]+aria-label="Search"/);
assert.match(searchPage, /class="site-search-icon"[^>]+aria-hidden="true"/);
assert.match(sharedScript, /className = "nav-search-form"/);
assert.match(sharedScript, /form\.action = "\/search"/);
assert.match(sharedScript, /input\.name = "q"/);
assert.match(fs.readFileSync(path.join(root, "database", "crops.html"), "utf8"), /id="strawberry-seeds"[^>]+data-search-entry/);
assert.match(fs.readFileSync(path.join(root, "database", "animals.html"), "utf8"), /id="black-chicken"[^>]+data-search-entry/);

console.log(`PASS: site search handles fuzzy queries and is linked from ${pages.length} HTML pages.`);
