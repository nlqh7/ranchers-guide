const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { searchDocuments } = require('../assets/js/search-core.js');

const root = path.resolve(__dirname, '..');
const config = require('../data/b2-entry-pages.json');
const materials = require('../data/materials.json').materials;
const quests = require('../data/quests.json').quests;
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');
const canonicalRoutes = new Set();
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function assertFactBoundary(html, fact, file) {
  const text = esc(fact.text);
  assert.ok(html.includes(text), `${file} lost its source fact: ${fact.text}`);
  if (fact.validity === 'historical') {
    assert.ok(html.includes(`<li class="fact-historical"><p>${text}`), `${file} upgraded a historical fact: ${fact.text}`);
  }
  if (fact.build) assert.ok(html.includes(esc(fact.build)), `${file} lost the recorded build for: ${fact.text}`);
}

for (const locale of ['en', 'zh']) {
  const zh = locale === 'zh';
  const prefix = zh ? 'zh/' : '';
  const routePrefix = zh ? '/zh' : '';
  for (const id of config.materials) {
    const record = materials.find(item => item.id === id);
    const relative = `${prefix}database/materials/${id}.html`;
    const file = path.join(root, relative);
    const html = fs.readFileSync(file, 'utf8');
    const route = `/database/materials/${id}`;
    const canonical = `https://theranchersguide.com${routePrefix}${route}`;
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`), `${relative} has the wrong canonical`);
    assert.ok(html.includes(`hreflang="en" href="https://theranchersguide.com${route}"`), `${relative} lacks its English alternate`);
    assert.ok(html.includes(`hreflang="zh-CN" href="https://theranchersguide.com/zh${route}"`), `${relative} lacks its Chinese alternate`);
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), `${relative} is missing from sitemap.xml`);
    assert.ok(!canonicalRoutes.has(canonical), `${canonical} is reused by another entity`);
    canonicalRoutes.add(canonical);
    for (const heading of zh ? ['快速答案', '如何获取', '在哪里获取', '主要用途与关联内容', '玩家下一步', '价格与奖励：分开记录'] : ['Quick answer', 'How to get it', 'Where to look', 'Main uses and linked content', 'What to do next', 'Prices and rewards: recorded separately']) {
      assert.ok(html.includes(`<h2>${heading}</h2>`), `${relative} is missing ${heading}`);
    }
    for (const key of ['acquisition', 'locations', 'nextSteps']) {
      for (const item of record.playerGuide[key]) assert.ok(html.includes(esc(zh ? item.zhText : item.text)), `${relative} lost ${key} guidance`);
    }
    assert.ok(html.includes(zh ? '购买价' : 'Purchase price') && html.includes(zh ? '出售价' : 'Sell price') && html.includes(zh ? '任务奖励' : 'Quest reward'), `${relative} mixes or omits price/reward concepts`);
    assert.ok(html.includes('class="material-evidence-ledger"'), `${relative} must keep evidence secondary to player guidance`);
    for (const fact of record.facts) assertFactBoundary(html, { ...fact, text: zh ? fact.zhText : fact.text }, relative);
  }

  for (const id of config.quests) {
    const record = quests.find(item => item.id === id);
    const relative = `${prefix}database/quests/${id}.html`;
    const html = fs.readFileSync(path.join(root, relative), 'utf8');
    const route = `/database/quests/${id}`;
    const canonical = `https://theranchersguide.com${routePrefix}${route}`;
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`), `${relative} has the wrong canonical`);
    assert.ok(html.includes(`hreflang="en" href="https://theranchersguide.com${route}"`), `${relative} lacks its English alternate`);
    assert.ok(html.includes(`hreflang="zh-CN" href="https://theranchersguide.com/zh${route}"`), `${relative} lacks its Chinese alternate`);
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), `${relative} is missing from sitemap.xml`);
    assert.ok(!canonicalRoutes.has(canonical), `${canonical} is reused by another entity`);
    canonicalRoutes.add(canonical);
    for (const heading of zh ? ['快速答案', '目标与可执行步骤', '容易卡住的检查', '失败、恢复与后续'] : ['Quick answer', 'Objectives and actionable steps', 'Checks that can cause a stop', 'Failure, recovery and continuation']) {
      assert.ok(html.includes(`<h2>${heading}</h2>`), `${relative} is missing ${heading}`);
    }
    assert.ok(html.includes(`<div class="quest-route-flow" data-quest-route-flow="${id}">`), `${relative} hides failure/recovery in a disclosure`);
    assert.ok(html.includes('data-quest-route-position') && html.includes('class="quest-evidence-ledger"'), `${relative} lacks continuation or secondary evidence`);
    assert.ok(html.includes(zh ? '配置记录，未逐项实测' : 'configuration record, not individually play-tested'), `${relative} upgrades configuration to runtime testing`);
    assert.ok(html.includes(zh ? '相关攻略与下一步' : 'Related guides and next steps'), `${relative} lacks onward guidance`);
    for (const fact of record.facts) assertFactBoundary(html, { ...fact, text: zh ? fact.zhText : fact.text }, relative);
  }
}

for (const line of redirects.split(/\r?\n/)) {
  const source = line.trim().split(/\s+/)[0];
  assert.ok(!/^\/(?:zh\/)?database\/(?:materials|quests)\//.test(source), `Standalone entity route must not redirect to a directory: ${line}`);
}

for (const locale of ['en', 'zh']) {
  const zh = locale === 'zh';
  const prefix = zh ? '/zh' : '';
  const index = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const knowledge = JSON.parse(fs.readFileSync(path.join(root, prefix, 'knowledge-index.json'), 'utf8'));
  for (const id of config.materials) {
    const record = materials.find(item => item.id === id);
    const expected = `${prefix}/database/materials/${id}#${id}`;
    const results = searchDocuments(index, zh ? record.zhSearchTitle : record.searchTitle);
    assert.equal(results[0]?.url, expected, `${locale} ${id} search must open its standalone answer`);
    assert.ok(!index.some(entry => entry.url === `${prefix}/database/materials#${id}`), `${locale} ${id} directory duplicate remains indexed`);
    assert.equal(knowledge.entities.find(entity => entity.id === `material:${id}`)?.route, `${prefix}/database/materials/${id}`);
  }
  for (const id of config.quests) {
    const record = quests.find(item => item.id === id);
    const expected = `${prefix}/database/quests/${id}#${id}`;
    const results = searchDocuments(index, zh ? record.zhName : record.name);
    assert.equal(results[0]?.url, expected, `${locale} ${id} search must open its standalone answer`);
    assert.ok(!index.some(entry => entry.url === `${prefix}/database/quests#${id}`), `${locale} ${id} directory duplicate remains indexed`);
    assert.equal(knowledge.entities.find(entity => entity.id === `quest:${id}`)?.route, `${prefix}/database/quests/${id}`);
  }
}

console.log(`PASS: ${config.materials.length} materials and ${config.quests.length} quests keep independent bilingual answers, direct search routes and source-evidence boundaries.`);
