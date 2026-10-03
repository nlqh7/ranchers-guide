const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pages = [
  {
    locale: "en",
    multiplayer: ["id=\"cashin-coop\"", "CashIn", "does not specify", "low-value", "host", "guest"],
    farming: ["id=\"season-choice\"", "Red Lettuce", "Garlic", "Strawberry", "profit ranking", "CashIn"],
  },
  {
    locale: "zh",
    multiplayer: ["id=\"cashin-coop\"", "CashIn", "没有说明", "低价值", "房主", "访客"],
    farming: ["id=\"season-choice\"", "红生菜", "大蒜", "草莓", "收益排名", "CashIn"],
  },
];

for (const page of pages) {
  const prefix = page.locale === "zh" ? "zh/" : "";
  const multiplayer = fs.readFileSync(path.join(root, `${prefix}guides/multiplayer-coop.html`), "utf8");
  const farming = fs.readFileSync(path.join(root, `${prefix}guides/farming-fields.html`), "utf8");
  for (const token of page.multiplayer) assert.match(multiplayer, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${page.locale} multiplayer answer missing ${token}`);
  for (const token of page.farming) assert.match(farming, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${page.locale} farming decision missing ${token}`);
}

console.log("PASS: R9 co-op CashIn boundary and seasonal crop decision answers are present in both locales.");
