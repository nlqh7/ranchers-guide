const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = require('../data/b2-entry-pages.json');
const materialsData = require('../data/materials.json');
for (const prefix of ['', 'zh/']) {
  for (const id of config.quests) {
    const file = path.join(root, prefix, 'database/quests', `${id}.html`);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /data-search-entry/);
    assert.match(html, /Recorded build reference|已记录版本/);
    assert.match(html, /database\/quests(?:%2F|\/)/);
    assert.match(html, /Source:|来源/);
    assert.match(html, /database\/quests#(seeds-of-success|feathered-foes)/);
  }
  for (const id of config.materials) {
    const file = path.join(root, prefix, 'database/materials', `${id}.html`);
    const html = fs.readFileSync(file, 'utf8');
    const record = materialsData.materials.find(material => material.id === id);
    assert.ok(record, `missing material source record for ${id}`);
    assert.match(html, /data-search-entry/);
    assert.match(html, /Sources and evidence|获取与证据/);
    assert.match(html, /database\/materials#/);
    for (const route of record.relatedRoutes || []) {
      assert.ok(!html.includes(`>${route}</a>`), `${file} exposes raw related route label ${route}`);
    }
  }
}
for (const [file, routes] of [
  ['database/quests.html', config.quests.map(id => `/database/quests/${id}`)],
  ['zh/database/quests.html', config.quests.map(id => `/zh/database/quests/${id}`)],
  ['database/materials.html', config.materials.map(id => `/database/materials/${id}`)],
  ['zh/database/materials.html', config.materials.map(id => `/zh/database/materials/${id}`)],
]) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const route of routes) assert.ok(html.includes(`href="${route}"`), `${file} missing ${route}`);
}
console.log('PASS: B2 independent quest/material entries have bilingual routes, source boundaries and directory links.');
