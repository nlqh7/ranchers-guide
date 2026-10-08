const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { activeNavHref } = require("../assets/js/main.js");

const cases = [
  ["/guides/money-making", false, "/guides/beginners-guide"],
  ["/database/animals", false, "/database"],
  ["/tools/profit-calculator", false, "/database"],
  ["/problems/vehicle-recovery", false, "/problems"],
  ["/community", false, "/research"],
  ["/zh/guides/money-making", true, "/zh/guides/beginners-guide"],
  ["/zh/database/crops", true, "/zh/database"],
  ["/zh/problems/vehicle-recovery", true, "/zh/problems"],
  ["/about", false, ""],
  ["/zh", true, ""],
];

for (const [pathname, isChinese, expected] of cases) {
  assert.equal(activeNavHref(pathname, isChinese), expected, pathname);
}

const root = path.resolve(__dirname, "..");
const htmlFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory() && !entry.name.startsWith(".")) return htmlFiles(target);
  return entry.isFile() && entry.name.endsWith(".html") ? [target] : [];
});
const sharedNavPages = htmlFiles(root).filter((file) => fs.readFileSync(file, "utf8").includes("assets/js/main.js?v="));
assert.ok(sharedNavPages.length > 80, "shared navigation should cover the site");
for (const file of sharedNavPages) {
  assert.match(
    fs.readFileSync(file, "utf8"),
    /assets\/js\/main\.js\?v=20261003-r15/,
    `${path.relative(root, file)} must invalidate the previous navigation behavior`,
  );
}

const cjsFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory() && !entry.name.startsWith(".")) return cjsFiles(target);
  return entry.isFile() && entry.name.endsWith(".cjs") ? [target] : [];
});
const styleReferenceFiles = [...htmlFiles(root), ...cjsFiles(root)]
  .filter((file) => !path.basename(file).startsWith("check-"))
  .filter((file) => fs.readFileSync(file, "utf8").includes("style.css?v="));
assert.ok(styleReferenceFiles.length > 100, "style.css should be referenced by the site surfaces");
for (const file of styleReferenceFiles) {
  assert.match(
    fs.readFileSync(file, "utf8"),
    /style\.css\?v=20261003-r15/,
    `${path.relative(root, file)} must use the current stylesheet cache token`,
  );
}

console.log(`PASS: ${cases.length} routes, ${sharedNavPages.length} navigation pages and ${styleReferenceFiles.length} stylesheet references use current behavior.`);
