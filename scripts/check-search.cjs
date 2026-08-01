const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { searchDocuments } = require("../assets/js/search-core.js");

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
assert.match(fs.readFileSync(path.join(root, "search.html"), "utf8"), /name="robots" content="noindex,follow"/);

console.log(`PASS: site search handles fuzzy queries and is linked from ${pages.length} HTML pages.`);
