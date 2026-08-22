const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "creator-notes.json"), "utf8"));
const english = fs.readFileSync(path.join(root, "creator-notes.html"), "utf8");
const chinese = fs.readFileSync(path.join(root, "zh", "creator-notes.html"), "utf8");

assert.equal(data.notes.length, 12);
assert.equal(new Set(data.notes.map((note) => note.id)).size, data.notes.length);
assert.ok(data.notes.every((note) => note.sourceUrl.startsWith("https://")));
assert.ok(data.notes.every((note) => note.build && note.scope && note.zhScope && note.use && note.zhUse && note.risk && note.zhRisk));
assert.ok(data.notes.every((note) => note.related.length >= 2));

for (const [page, lang, canonical, alternate] of [
  [english, "en", "https://theranchersguide.com/creator-notes", "https://theranchersguide.com/zh/creator-notes"],
  [chinese, "zh-CN", "https://theranchersguide.com/zh/creator-notes", "https://theranchersguide.com/creator-notes"],
]) {
  assert.match(page, new RegExp(`<html lang="${lang}">`));
  assert.match(page, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`));
  assert.match(page, new RegExp(`hreflang="${lang === "en" ? "zh-CN" : "en"}" href="${alternate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(page, /creator-note-card/);
  assert.match(page, /sourceUrl|youtube\.com|steamcommunity\.com|wiki\.ranchers\.game/);
  assert.match(page, /Use risk|使用风险/);
  assert.match(page, /Continue with|继续查找/);
}

assert.equal((english.match(/class="creator-note-card"/g) || []).length, data.notes.length);
assert.equal((chinese.match(/class="creator-note-card"/g) || []).length, data.notes.length);
assert.match(chinese, /href="\/zh\/tools\/ranch-checklist#build-goal"/);
assert.doesNotMatch(chinese, /href="\/tools\/ranch-checklist#build-goal"/);
assert.doesNotMatch(english, /<img[^>]+(?:youtube|wiki\.ranchers)/i);
assert.doesNotMatch(chinese, /<img[^>]+(?:youtube|wiki\.ranchers)/i);
assert.match(fs.readFileSync(path.join(root, "sitemap.xml"), "utf8"), /https:\/\/theranchersguide\.com\/creator-notes/);
assert.match(fs.readFileSync(path.join(root, "sitemap.xml"), "utf8"), /https:\/\/theranchersguide\.com\/zh\/creator-notes/);

console.log(`PASS: bilingual Creator Notes pages expose ${data.notes.length} source-linked notes without copied media.`);
