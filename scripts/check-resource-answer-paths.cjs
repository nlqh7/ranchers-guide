const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

for (const locale of ['', 'zh/']) {
  const file = locale + 'guides/resources-and-materials.html';
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const answer = html.match(/<section class="answer-box"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(answer, file + ': direct answer absent');
  for (const id of ['zirconite', 'charcoal', 'missing-tools']) {
    assert.ok(answer.includes('href="#' + id + '"'), file + ': first answer must link to ' + id);
    assert.equal((html.match(new RegExp('\\bid="' + id + '"', 'g')) || []).length, 1, file + ': destination must remain unique: ' + id);
  }
  assert.ok(html.indexOf(answer) < html.indexOf('<!-- BEGIN SHOP REFERENCE -->'), file + ': player answer must precede configuration tables');
  assert.ok(answer.includes('Meriam') && /City Hall|市政厅/.test(answer), file + ': ore seller must be visible before tables');
  assert.ok(/burn|燃烧/.test(answer) && /not buy|不是购买|而非购买/.test(answer), file + ': charcoal is not a purchase claim');
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert.ok(title && description, file + ': descriptive metadata required');
  assert.equal(html.match(/<meta property="og:title" content="([^"]+)"/)?.[1], title, file + ': share title must reflect the same player task');
  assert.equal(html.match(/<meta property="og:description" content="([^"]+)"/)?.[1], description, file + ': share description must not retain an old promise');
  assert.match(title, /Charcoal|木炭/, file + ': name the supported material lookup');
  assert.match(description, /Zerkonite/, file + ': retain the game item spelling');
  const links = [...answer.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
  for (const id of links) assert.ok(html.includes('id="' + id + '"'), file + ': first-answer link is broken: ' + id);
}
const search = require('../assets/js/search-core.js').searchDocuments;
for (const [locale, query, anchor] of [
  ['', 'where to buy zerkonite', 'zirconite'],
  ['', 'where to buy zirconite', 'zirconite'],
  ['', 'how to make charcoal', 'charcoal'],
  ['', 'lost hoe', 'missing-tools'],
  ['zh/', '锆矿在哪买', 'zirconite'],
  ['zh/', '木炭怎么做', 'charcoal'],
  ['zh/', '锄头丢了', 'missing-tools'],
]) {
  const index = JSON.parse(fs.readFileSync(path.join(root, locale, 'search-index.json'), 'utf8'));
  const results = search(index, query, 3);
  const expected = '/' + locale + 'guides/resources-and-materials#' + anchor;
  assert.ok(results.some(r => r.url === expected), query + ': needs the dedicated actionable answer in top three, not only configuration: ' + results.map(r => r.url).join(', '));
}
for (const locale of ['', 'zh/']) {
  const index = JSON.parse(fs.readFileSync(path.join(root, locale, 'search-index.json'), 'utf8'));
  assert.equal(search(index, 'Zerkonite', 1)[0]?.url, '/' + locale + 'database/materials#zirconite', 'Bare native name should open its full material profile, not the new broad guide title');
}
console.log('PASS: bilingual resource pages expose direct material answers and usable old destinations before tables.');
