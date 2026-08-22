const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const data = JSON.parse(read("data/updates.json"));

assert.equal(data.meta.currentBuild, "0.8.10.842");
assert.equal(data.updates.length, 4);
assert.ok(data.updates.every((update) => update.id && update.version && update.title && update.summary));
assert.ok(data.updates.every((update) => update.changes.length > 0 && update.actions.length > 0));
assert.ok(data.updates.every((update) => update.source && update.source.url));

for (const relative of ["tools/update-impact-tracker.html", "zh/tools/update-impact-tracker.html"]) {
  const html = read(relative);
  assert.match(html, /name="robots" content="noindex,follow"/i, `${relative}: tracker must remain noindex`);
  assert.doesNotMatch(html, /pagead2\.googlesyndication\.com/i, `${relative}: tracker must not load ads`);
  assert.match(html, /data-update-impact-tracker/);
  assert.match(html, /assets\/js\/update-impact-tracker\.js/);
}

const script = read("assets/js/update-impact-tracker.js");
assert.match(script, /data\/updates\.json/);
assert.match(script, /localStorage/);
assert.match(script, /actions/);

console.log(`PASS: bilingual update impact tracker uses ${data.updates.length} structured updates, local-only selection state and noindex/no-ad boundaries.`);
