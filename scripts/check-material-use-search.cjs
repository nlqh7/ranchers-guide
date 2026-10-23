const assert = require('node:assert/strict');
const { filterUses } = require('../assets/js/material-use-search.js');
const { recipes } = require('../data/build-recipes.json');
const stone = recipes.filter(recipe => recipe.materials.some(item => item.id === 'ressource_rock_simple'))
  .map(recipe => ({ id: recipe.id, text: recipe.name + ' ' + recipe.zhName }));
assert.deepEqual(filterUses(stone, '  basic SPRINKLER ').map(item => item.id), ['sprinkler_n1']);
assert.deepEqual(filterUses(stone, '洒水器 基础').map(item => item.id), ['sprinkler_n1']);
assert.deepEqual(filterUses(stone, 'Sprinkler Basic').map(item => item.id), ['sprinkler_n1']);
assert.deepEqual(filterUses(stone, 'not-a-recipe'), []);
assert.deepEqual(filterUses(stone, '   '), stone);
const fs = require('node:fs');
const path = require('node:path');
for (const prefix of ['', 'zh/']) {
  const html = fs.readFileSync(path.join(__dirname, '..', prefix, 'database/materials.html'), 'utf8');
  assert.equal((html.match(/data-material-uses=/g) || []).length, 5);
  assert.equal((html.match(/class="resource-use-controls" hidden/g) || []).length, 5, 'No-JS readers retain usable static tables, not dead search controls');
  assert.ok(html.includes('material-use-search.js?v=20261023-use2'));
  assert.ok(html.indexOf('/assets/js/main.js?') < html.indexOf('/assets/js/material-use-search.js?'), 'The scoped language sync runs after shared navigation is created');
  assert.ok(html.includes('resource-reference.css?v=20260913-use1'));
  assert.ok(html.includes('data-use-row="sprinkler_n1" data-use-search-text="Basic Sprinkler 基础款洒水器"'));
}
console.log('PASS: material-scoped recipe search finds the intended item.');

// Exercise the shipped controller, including the shared navigation's history hook.
function mountUseSearch(locale, initialUrl) {
  const location = new URL(initialUrl);
  const events = {};
  const base = `https://example.test/${locale === 'zh' ? '' : 'zh/'}database/materials`;
  const languageLink = {href: base};
  const field = () => ({value: '', addEventListener(type, handler) { this[type] = handler; }, focus() { this.focused = true; }});
  const roots = ['stone', 'zirconite'].map(id => {
    const input = field(), clear = field(), count = {textContent: ''}, controls = {hidden: true};
    const rows = ['Basic Sprinkler 基础款洒水器', 'Advanced Sprinkler 进阶款洒水器'].map(text => ({dataset: {useSearchText: text}, hidden: false}));
    const groups = rows.map((row, i) => ({open: i === 0, hidden: false, querySelectorAll: () => [row]}));
    return {dataset: {materialUses: id}, input, clear, count, rows, groups,
      querySelector: selector => ({'[data-use-search]': input, '[data-use-clear]': clear, '[data-use-count]': count, '.resource-use-controls': controls})[selector],
      querySelectorAll: selector => selector === '[data-use-row]' ? rows : selector === '[data-use-group]' ? groups : []};
  });
  require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/material-use-search.js'), 'utf8'), {
    URL, location, document: {documentElement: {lang: locale}, querySelectorAll: selector => selector === '[data-material-uses]' ? roots : selector === '.nav-language-link' ? [languageLink] : []},
    window: {addEventListener(type, handler) { events[type] = handler; }},
    history: {state: null, replaceState(state, title, href) { location.href = href; languageLink.href = base; }}
  });
  return {roots, location, languageLink, events, base};
}
for (const locale of ['en', 'zh']) {
  const fixture = mountUseSearch(locale, `https://example.test/${locale === 'zh' ? 'zh/' : ''}database/materials#zirconite`);
  const lookup = fixture.roots[1];
  lookup.input.value = '基础款洒水器';
  lookup.input.input();
  const counterpart = new URL(fixture.languageLink.href);
  assert.equal(counterpart.searchParams.get('material'), 'zirconite', 'Language switch must preserve the material after shared history synchronization');
  assert.equal(counterpart.searchParams.get('use'), '基础款洒水器');
  assert.equal(counterpart.hash, '#zirconite');
  assert.deepEqual(lookup.rows.map(row => row.hidden), [false, true]);

  lookup.clear.click();
  assert.equal(new URL(fixture.languageLink.href).search, '', 'Clearing must remove stale material/query state from the counterpart');
  assert.equal(new URL(fixture.languageLink.href).hash, '#zirconite');
  assert.equal(lookup.input.focused, true);
  assert.deepEqual(lookup.groups.map(group => group.open), [true, false], 'Clearing restores the pre-search group expansion');

  fixture.location.href = `${fixture.location.origin}${fixture.location.pathname}?material=stone&use=Advanced%20Sprinkler#stone`;
  fixture.events.popstate();
  assert.equal(fixture.roots[0].input.value, 'Advanced Sprinkler');
  assert.equal(lookup.input.value, '');
  assert.deepEqual(fixture.roots[0].rows.map(row => row.hidden), [true, false]);
  assert.equal(new URL(fixture.languageLink.href).searchParams.get('material'), 'stone');
  assert.equal(new URL(fixture.languageLink.href).hash, '#stone');

  const restored = mountUseSearch(locale, `${fixture.location.origin}${fixture.location.pathname}?material=zirconite&use=Basic%20Sprinkler&draft=not-for-navigation&utm_source=sample#zirconite`);
  const restoredLink = new URL(restored.languageLink.href);
  assert.equal(restored.roots[1].input.value, 'Basic Sprinkler');
  assert.equal(restoredLink.searchParams.get('use'), 'Basic Sprinkler', 'A copied lookup must retain its state on the initial language action');
  assert.deepEqual([...restoredLink.searchParams.keys()].sort(), ['material', 'use'], 'Only this lookup state crosses locale boundaries');
  restored.location.hash = '#not-a-material';
  restored.events.hashchange();
  assert.equal(new URL(restored.languageLink.href).hash, '', 'Unknown anchors are not copied');
  const unknown = mountUseSearch(locale, `${fixture.location.origin}${fixture.location.pathname}?material=unknown&use=Basic#unknown`);
  assert.equal(unknown.languageLink.href, unknown.base, 'Unknown material IDs cannot become language-switch context');
}
console.log('PASS: EN/ZH shipped material controller preserves scoped locale context on load, edit, clear and history restore without copying unrelated fields.');
