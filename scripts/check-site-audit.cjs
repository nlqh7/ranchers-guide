const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
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

for (const route of ["/404", "/contribute", "/search", "/zh/search"]) {
  const page = audit.pages.find((candidate) => candidate.route === route);
  assert.ok(page, `${route} must be audited`);
  assert.equal(page.inSitemap, false, `${route} must stay outside the sitemap`);
  assert.equal(page.noindex, true, `${route} must stay noindex`);
}

console.log(`PASS: ${audit.totals.html} HTML pages and ${audit.totals.sitemap} sitemap routes satisfy the index audit.`);
