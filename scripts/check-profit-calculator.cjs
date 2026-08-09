const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "calculator.js"), "utf8");

assert.doesNotMatch(source, /\+\s*["'] g["']/, "calculator still uses the unrelated 'g' currency suffix");
assert.match(source, /\+\s*["']C["']/, "calculator must display The Ranchers currency as C");

console.log("PASS: profit calculator uses the site's C currency notation.");
