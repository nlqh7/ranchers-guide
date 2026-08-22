const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const data = JSON.parse(read("data/updates.json"));
const sitemapRoutes = new Set([...read("sitemap.xml").matchAll(/<loc>https:\/\/theranchersguide\.com([^<]*)<\/loc>/g)].map((match) => match[1]));
const privateToolRoutes = new Set([
  "/tools/quest-tracker",
  "/zh/tools/quest-tracker",
  "/tools/update-impact-tracker",
  "/zh/tools/update-impact-tracker",
]);

assert.equal(data.meta.currentBuild, "0.8.10.842");
assert.equal(data.updates.length, 4);
assert.ok(data.updates.every((update) => update.id && update.version && update.title && update.summary));
assert.ok(data.updates.every((update) => update.changes.length > 0 && update.actions.length > 0));
assert.ok(data.updates.every((update) => update.source && update.source.url));
for (const update of data.updates) {
  assert.ok(Array.isArray(update.affectedRoutes) && update.affectedRoutes.length > 0, `${update.id}: missing affected pages`);
  for (const route of update.affectedRoutes) {
    assert.ok(route.en && route.zh && route.route && route.routeZh, `${update.id}: incomplete affected page`);
    assert.ok(sitemapRoutes.has(route.route.split("#")[0]) || privateToolRoutes.has(route.route.split("#")[0]), `${update.id}: missing English affected route ${route.route}`);
    assert.ok(sitemapRoutes.has(route.routeZh.split("#")[0]) || privateToolRoutes.has(route.routeZh.split("#")[0]), `${update.id}: missing Chinese affected route ${route.routeZh}`);
  }
}

for (const relative of ["tools/update-impact-tracker.html", "zh/tools/update-impact-tracker.html"]) {
  const html = read(relative);
  assert.match(html, /name="robots" content="noindex,follow"/i, `${relative}: tracker must remain noindex`);
  assert.doesNotMatch(html, /pagead2\.googlesyndication\.com/i, `${relative}: tracker must not load ads`);
  assert.match(html, /data-update-impact-tracker/);
  assert.match(html, /assets\/js\/update-impact-tracker\.js/);
}

for (const relative of ["updates.html", "zh/updates.html"]) {
  const html = read(relative);
  assert.match(html, /update-impact-tracker/, `${relative}: updates hub must link to the tracker`);
}

const script = read("assets/js/update-impact-tracker.js");
assert.match(script, /data\/updates\.json/);
assert.match(script, /localStorage/);
assert.match(script, /actions/);
assert.match(script, /affectedRoutes/);

console.log(`PASS: bilingual update impact tracker uses ${data.updates.length} structured updates, affected-page routes, local-only selection state and noindex/no-ad boundaries.`);
