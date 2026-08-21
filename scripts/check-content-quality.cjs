const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pages = [
  {
    en: "guides/farming-fields.html",
    zh: "zh/guides/farming-fields.html",
    required: ["start-farming", "CashIn", "fertilizer", "unverified"],
    requiredZh: ["start-farming", "CashIn", "肥料", "未验证"],
  },
  {
    en: "guides/electricity-power.html",
    zh: "zh/guides/electricity-power.html",
    required: ["start-power", "Victor", "City Hall", "Energy", "1,000C"],
    requiredZh: ["start-power", "Victor", "市政厅", "Energy", "1000C"],
  },
  {
    en: "guides/resources-and-materials.html",
    zh: "zh/guides/resources-and-materials.html",
    required: ["answer-box", "current", "sources", "materials"],
    requiredZh: ["answer-box", "当前", "来源", "材料"],
  },
  {
    en: "updates.html",
    zh: "zh/updates.html",
    required: ["answer-box", "0.8.10.562", "hotfix", "sources"],
    requiredZh: ["answer-box", "0.8.10.562", "热修", "来源"],
  },
  {
    en: "updates/launch-hotfix-0-8-10-455.html",
    zh: "zh/updates/launch-hotfix-0-8-10-455.html",
    required: ["answer-box", "0.8.10.455", "offline", "co-op"],
    requiredZh: ["answer-box", "0.8.10.455", "离线", "联机"],
  },
  {
    en: "updates/transport-update.html",
    zh: "zh/updates/transport-update.html",
    required: ["answer-box", "parking", "subway", "vehicle"],
    requiredZh: ["answer-box", "停车", "地铁", "车辆"],
  },
];

function read(relativePath) {
  const file = path.join(root, relativePath);
  assert.ok(fs.existsSync(file), `missing quality-audit page: ${relativePath}`);
  return fs.readFileSync(file, "utf8");
}

function checkPage(relativePath, required) {
  const html = read(relativePath);
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  assert.ok(description && description[1].length >= 80, `${relativePath}: description is too thin`);
  assert.match(html, /<h1\b/i, `${relativePath}: missing h1`);
  assert.match(html, /class="answer-box"/i, `${relativePath}: missing direct-answer block`);
  assert.match(html, /0\.8\.10\.562|当前版本|current official version/i, `${relativePath}: missing current-build boundary`);
  assert.match(html, /methodology|证据|来源|sources/i, `${relativePath}: missing evidence/transparency path`);
  assert.match(html, /related|相关|继续|next/i, `${relativePath}: missing next-step navigation`);
  for (const token of required) {
    assert.match(html, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${relativePath}: missing required content token ${token}`);
  }
  console.log(`PASS: content quality contract — ${relativePath}`);
}

for (const page of pages) {
  checkPage(page.en, page.required);
  checkPage(page.zh, page.requiredZh);
}

console.log("PASS: core content pages expose direct answers, evidence boundaries and next steps.");
