const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = execFileSync(process.execPath, [path.join(__dirname, "audit-site.cjs"), "--json"], {
  cwd: root,
  encoding: "utf8",
});
const audit = JSON.parse(output);

assert.equal(audit.totals.html, audit.pages.length, "Audit must include every HTML page");
assert.deepEqual(audit.issues.sitemapNoindex, [], "Sitemap must not contain noindex routes");
assert.deepEqual(audit.issues.sitemapMissingCanonical, [], "Every sitemap route needs a canonical");
assert.deepEqual(audit.issues.sitemapMissingDescription, [], "Every sitemap route needs a description");
assert.deepEqual(audit.issues.orphaned, [], "Every sitemap route needs an internal discovery path");
assert.deepEqual(audit.issues.duplicateTitles, [], "Page titles must be unique");
assert.deepEqual(audit.issues.duplicateDescriptions, [], "Page descriptions must be unique");

for (const route of ["/404", "/contribute", "/search", "/zh/search", "/research", "/tools/field-notes", "/tools/player-report", "/zh/tools/player-report"]) {
  const page = audit.pages.find((candidate) => candidate.route === route);
  assert.ok(page, `${route} must be audited`);
  assert.equal(page.inSitemap, false, `${route} must stay outside the sitemap`);
  assert.equal(page.noindex, true, `${route} must stay noindex`);
}

for (const relative of ["404.html", "contribute.html", "search.html", "zh/search.html", "research.html", "tools/field-notes.html", "tools/player-report.html", "zh/tools/player-report.html"]) {
  const html = fs.readFileSync(path.join(root, relative), "utf8");
  assert.doesNotMatch(html, /pagead2\.googlesyndication\.com/, `${relative} must not load ads on a noindex utility surface`);
}

const farming = fs.readFileSync(path.join(root, "guides", "farming-fields.html"), "utf8");
assert.match(farming, /There is currently no manual delete tool/i, "English farming guide needs the official plot-removal answer");
assert.match(farming, /587307627624745847/, "English farming answer needs the official moderator source");
const farmingZh = fs.readFileSync(path.join(root, "zh", "guides", "farming-fields.html"), "utf8");
assert.match(farmingZh, /目前没有手动删除农田格的工具/, "Chinese farming guide needs the official plot-removal answer");
assert.match(farmingZh, /587307627624745847/, "Chinese farming answer needs the official moderator source");

console.log(`PASS: ${audit.totals.html} HTML pages and ${audit.totals.sitemap} sitemap routes satisfy the index audit.`);
