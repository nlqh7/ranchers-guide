const assert = require("node:assert/strict");
const path = require("node:path");
const { resolveRequestPath } = require("./serve-local.cjs");

const root = path.resolve(__dirname, "..");

assert.equal(resolveRequestPath(root, "/"), path.join(root, "index.html"));
assert.equal(resolveRequestPath(root, "/zh/"), path.join(root, "zh", "index.html"));
assert.equal(
  resolveRequestPath(root, "/zh/guides/police-wanted-levels"),
  path.join(root, "zh", "guides", "police-wanted-levels.html"),
);
assert.equal(
  resolveRequestPath(root, "/assets/css/style.css"),
  path.join(root, "assets", "css", "style.css"),
);
assert.equal(resolveRequestPath(root, "/missing-page"), null);
assert.equal(resolveRequestPath(root, "/..%2Fsecret.txt"), null);

console.log("PASS: local preview resolves canonical extensionless routes safely.");
