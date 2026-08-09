const assert = require("node:assert/strict");
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

console.log(`PASS: ${cases.length} routes map to a consistent active navigation section.`);
