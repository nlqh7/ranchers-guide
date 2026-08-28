const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const animals = require('../data/animals.json');
const crops = require('../data/crops.json');
for (const prefix of ['', 'zh/']) {
  for (const suffix of ['.html', '/animals.html', '/crops.html', '/materials.html', '/quests.html', '/npcs.html']) {
    const html = fs.readFileSync(path.join(root, `${prefix}database${suffix}`), 'utf8');
    assert.equal((html.match(/database-browser\.css\?v=20260828-4/g) || []).length, 1, 'every database loads the current shared theme once');
    assert.doesNotMatch(html, /<article[^>]*style="[^"]*max-width/, `${prefix}${suffix}: page-specific inline width must not override the shared layout`);
    assert.match(html, /favicon-32\.png/, 'theme changes preserve favicon markup');
    assert.match(html, /main\.js\?v=/, 'theme changes preserve shared navigation');
  }
}
for (const prefix of ['', 'zh/']) {
  for (const kind of ['quests', 'npcs']) {
    const html = fs.readFileSync(path.join(root, prefix, 'database', `${kind}.html`), 'utf8');
    const browser = html.match(/<section[^>]*id="browse-entries"[\s\S]*?<\/section>/)?.[0];
    assert.ok(browser, `${prefix}${kind}: common name directory must precede profiles`);
    assert.match(html, new RegExp(`href="/${prefix}database/${kind}" aria-current="page"`), 'category navigation identifies the current page');
    for (const item of require(`../data/${kind}.json`)[kind]) {
      assert.ok(browser.includes(`href="#${item.id}"`));
      const profile = html.match(new RegExp(`<section[^>]*id="${item.id}"[^>]*>[\\s\\S]*?<\\/section>`))?.[0];
      assert.ok(profile?.includes('href="#browse-entries"'), `${item.id}: return link preserves quick lookup`);
      for (const fact of item.facts) assert.ok(profile.includes((prefix ? fact.zhText : fact.text).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]))), `${item.id}: existing evidence is retained`);
    }
    assert.doesNotMatch(html, /class="answer-box npc-lookup-guide"|class="entity-decision"/, 'avoid repeated introductory panels');
  }
}
for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'database/materials.html'), 'utf8');
  const browser = html.match(/<section[^>]*id="browse-entries"[\s\S]*?<\/section>/)?.[0];
  assert.ok(browser, `${prefix}materials: players can choose a material before reading reference notes`);
  for (const item of require('../data/materials.json').materials) {
    assert.ok(browser.includes(`href="#${item.id}"`), `${item.id}: material has a direct lookup link`);
    assert.ok(html.includes(`id="${item.id}"`), `${item.id}: old material destination is preserved`);
  }
  assert.ok(html.indexOf('id="browse-entries"') < html.indexOf('class="evidence-ledger material-profile"'));
  const wood = html.match(/<section[^>]*id="wood-log"[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.match(wood, /<table\b/, 'building uses are an aligned comparison, not repeated paragraphs');
  for (const target of require('../data/building-checklists.json').targets) {
    const need = target.materials.find(m => m.id === 'wood-log');
    if (!need) continue;
    const name = prefix ? target.zhName : target.name;
    assert.ok(wood.includes(name) && wood.includes(`<td>${need.required}</td>`), `${name}: preserve documented material quantity`);
    assert.ok(wood.includes(target.build), `${name}: preserve source build`);
  }
  assert.doesNotMatch(wood, /class="entity-decision/, 'do not repeat uses inside prominent explanation boxes');
}
for (const prefix of ['', 'zh/']) {
  for (const kind of ['animals', 'crops']) {
    const html = fs.readFileSync(path.join(root, prefix, 'database', `${kind}.html`), 'utf8');
    const browser = html.match(/<section[^>]*id="browse-entries"[\s\S]*?<\/section>/)?.[0];
    assert.ok(browser, `${prefix}${kind}: named entry browser must exist`);
    assert.ok(html.indexOf('id="browse-entries"') < html.indexOf('class="evidence-status"'), 'entry browser precedes evidence notices');
    const entries = kind === 'animals' ? animals.species : crops.buildRoster.entries;
    for (const item of entries) {
      const target = item.id;
      assert.ok(browser.includes(`href="#${target}"`), `${prefix}${kind}: ${item.id} has a direct link`);
      assert.ok(html.includes(`id="${target}"`), `${target}: destination exists`);
      if (kind === 'crops') {
        const profile = html.match(new RegExp(`<section[^>]*id="${target}"[^>]*>[\\s\\S]*?<\\/section>`))?.[0];
        assert.ok(profile?.includes('class="database-facts"'), `${target}: labeled configuration must appear in its profile`);
        assert.ok(profile.includes(`${item.daysToFirstHarvest} ${prefix ? '天' : 'days'}`), 'first-harvest value must come from the roster');
        assert.ok(profile.includes(prefix ? '尚未逐项实测' : 'not individually gameplay-tested'), 'configuration is not a gameplay measurement');
        if (item.townSeedVendor !== 'listed') assert.ok(profile.includes(prefix ? '购买途径未确认' : 'acquisition is unconfirmed'));
        assert.ok(html.includes(`id="build-${target}"`), 'old table anchors remain valid');
      }
    }
    assert.match(html, /database-browser\.css\?v=20260828-4/);
    assert.doesNotMatch(html, /class="entity-decision"/, 'lookup explanation must not repeat the profile summary');
    assert.match(html, /class="database-reference-notes"/, 'page metadata belongs in one secondary disclosure');
    assert.doesNotMatch(html, />1 days</, 'English one-day values use singular units');
  }
}
for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(root, prefix, 'database.html'), 'utf8');
  const browse = html.match(/<!-- DATABASE BROWSER START -->[\s\S]*?<!-- DATABASE BROWSER END -->/)?.[0];
  assert.ok(browse, `${prefix}database: generated direct-entry directory required`);
  for (const animal of animals.species) assert.ok(browse.includes(`/${prefix}database/animals#${animal.id}`));
  for (const category of ['animals', 'crops', 'materials', 'quests', 'npcs']) assert.ok(browse.includes(`/${prefix}database/${category}`));
  assert.doesNotMatch(browse, /coverage-summary|knowledge-category-number/);
  assert.match(browse, /class="database-hub-heading"/, 'category labels have a consistent alignment column');
  assert.match(browse, /class="database-hub-content"/, 'names occupy a separate aligned content column');
  assert.doesNotMatch(browse, /查看全部资料|Open full reference/, 'avoid repeating the same category link in each block');
}
console.log('PASS: bilingual database entry browsers preserve direct destinations.');
