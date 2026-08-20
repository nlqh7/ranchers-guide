const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const page = read("community.html");
assert.match(page, /<link rel="canonical" href="https:\/\/theranchersguide\.com\/community">/);
assert.match(page, /405 Steam reviews/);
assert.match(page, /241 positive/);
assert.match(page, /164 negative/);
assert.match(page, /59\.5%/);
assert.match(page, /403 retrievable review texts/);
assert.match(page, /Bugs and stability[\s\S]*115/);
assert.match(page, /Content depth[\s\S]*105/);
assert.match(page, /Promising is not the same as ready/);
assert.match(page, /href="https:\/\/steamcommunity\.com\/app\/1501310\/discussions\/"/);
assert.match(page, /No site account required/);
assert.match(page, /mailto:contribute@theranchersguide\.com/);

const problems = read("problems.html");
assert.match(problems, /data-problem-search/);
assert.match(problems, /data-problem-filter/);
assert.match(problems, /data-problem-entry/g);
assert.match(problems, /Seed plots partially disappear overnight/);
assert.match(problems, /Exiting a vehicle can drop the player through the map/);
assert.match(problems, /Open reports/);
assert.match(problems, /href="\/community"/);

const problemScript = read("assets/js/problems.js");
assert.match(problemScript, /data-problem-search/);
assert.match(problemScript, /data-problem-filter/);
assert.match(problemScript, /data-problem-entry/);

const search = read("assets/js/search.js");
assert.match(search, /"\/community"/);
assert.match(search, /ranchers-search-index-v20/);
assert.match(search, /ranchers-search-index-zh-v6/);

const sitemap = read("sitemap.xml");
assert.match(sitemap, /https:\/\/theranchersguide\.com\/community/);

console.log("PASS: community pulse, discussion routes and searchable problem coverage are complete.");
