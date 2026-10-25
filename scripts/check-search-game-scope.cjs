const assert = require('node:assert/strict');
const scope = require('../assets/js/search-game-scope.js');

const documents = [
  { url: '/database/materials/stone', title: 'Stone' },
  { url: '/zh/games/fs25/tools/production-planner/#sources', title: '面包' },
  { url: '/games/fs25/', title: 'FS25' },
  { url: '/zh/database/quests/seeds-of-success', title: '种子任务' }
];
assert.deepEqual(scope.filterDocuments(documents, 'fs25').map(d => d.title), ['面包', 'FS25']);
assert.deepEqual(scope.filterDocuments(documents, 'ranchers').map(d => d.title), ['Stone', '种子任务']);
assert.deepEqual(scope.filterDocuments(documents, 'all'), documents);
assert.equal(documents.length, 4, 'scope selection never mutates the shared index');
assert.equal(scope.gameForUrl('/games/fs25-not-real/'), null, 'game route matching respects namespace boundaries');
assert.equal(scope.gameForUrl('https://example.com/database'), null, 'external URLs are not Ranchers entries');
assert.equal(scope.normalize('untrusted'), 'all');
assert.equal(scope.allowsDossier('fs25'), false, 'Ranchers knowledge cards never leak into FS25 scope');
assert.equal(scope.allowsDossier('ranchers'), true);
assert.equal(scope.searchUrl('/search', ' stone ', 'all'), '/search?q=stone', 'legacy q-only links retain their meaning');
assert.equal(scope.searchUrl('/zh/search', '', 'fs25'), '/zh/search?game=fs25', 'clear preserves the selected game');
const deepLink = new URL(scope.searchUrl('/search', 'bread & flour', 'fs25'), 'https://theranchersguide.com');
assert.equal(deepLink.searchParams.get('q'), 'bread & flour');
assert.equal(deepLink.searchParams.get('game'), 'fs25');
console.log('PASS: game-scoped search documents, knowledge isolation and legacy/clear URLs.');

// Exercise the actual page controller as well as the pure routing contract.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const scopeStyles = fs.readFileSync(path.join(root, 'assets/css/search-game-scope.css'), 'utf8');
const entityButtonStyles = scopeStyles.match(/\[data-entity-filters\]\s+button\s*\{([^}]+)\}/)?.[1] || '';
assert.match(entityButtonStyles, /min-height:\s*44px/, 'entity answer filters need a 44px-high touch target');
assert.match(entityButtonStyles, /min-width:\s*44px/, 'short filter labels also need a 44px-wide touch target');
for (const prefix of ['', 'zh/']) {
  const page = fs.readFileSync(path.join(root, prefix, 'search.html'), 'utf8');
  assert.match(page, /search-game-scope\.css\?v=20261022-touch1/, `${prefix || 'en/'} loads the updated filter touch-target stylesheet`);
}
const assertCache = require('./search-cache-contract.cjs');
assert.doesNotThrow(() => assertCache('var CACHE_KEY = IS_ZH ? "ranchers-search-index-zh-v49" : "ranchers-search-index-v63";'));
assert.throws(() => assertCache('var CACHE_KEY = IS_ZH ? "ranchers-search-index-zh-v48" : "ranchers-search-index-v62";'), /cache must invalidate/);
function node() {
  return { value: '', textContent: '', innerHTML: '', hidden: false, disabled: false, children: [], listeners: {}, dataset: {},
    classList: { toggle() {} }, setAttribute() {}, focus() {},
    appendChild(child) { this.children.push(child); }, append(...children) { this.children.push(...children); },
    replaceChildren() { this.children = []; this.innerHTML = ''; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    fire(type) { this.listeners[type]?.({ preventDefault() {} }); }
  };
}
async function pageController(lang) {
  const selectors = ['[data-search-form]', '[data-search-input]', '[data-search-clear]', '[data-search-results]',
    '[data-knowledge-dossier]', '[data-search-status]', '[data-search-game]', '[data-entity-filters]', '.search-suggestions'];
  const nodes = Object.fromEntries(selectors.map(selector => [selector, node()]));
  const entityFilters = [node()];
  entityFilters[0].dataset.entityFilter = 'location';
  const alternate = 'https://theranchersguide.com' + (lang === 'en' ? '/zh/search' : '/search');
  const languageLink = { href: alternate + '?q=bread', getAttribute() { return alternate; } };
  nodes['.nav-language-link'] = languageLink;
  const { languageContextHref } = require('../assets/js/main.js');
  function historyWrite(url) {
    lastUrl = url;
    // The real shared navigation synchronizes after every history write.
    const next = new URL(url, 'https://theranchersguide.com');
    languageLink.href = languageContextHref(alternate, lang === 'en' ? '/search' : '/zh/search', next.search, '');
  }
  const location = { search: '?game=fs25&q=bread' };
  let lastUrl = '', scoredKnowledge = 0;
  const window = { RanchersSearchScope: scope, listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; } };
  const core = require('../assets/js/search-core.js');
  const search = { ...core, entityScore(...args) { scoredKnowledge++; return core.entityScore(...args); } };
  window.RanchersSearch = search;
  const docs = Array.from({ length: 200 }, (_, i) => ({ title: 'Bread guide', url: '/guides/bread-' + i, type: 'Guide', description: 'bread', sections: [] }));
  const fs25Url = (lang === 'en' ? '' : '/zh') + '/games/fs25/tools/production-planner/';
  docs.push({ title: 'FS25 Bread planner', url: fs25Url, type: 'FS25 tool', description: 'bread', sections: [] });
  const previousCacheKey = lang === 'en' ? 'ranchers-search-index-v57' : 'ranchers-search-index-zh-v43';
  const freshCacheKey = lang === 'en' ? 'ranchers-search-index-v63' : 'ranchers-search-index-zh-v49';
  const staleUrl = (lang === 'en' ? '' : '/zh') + '/games/fs25/tools/stale-planner/';
  const staleIndex = docs.map(doc => ({ ...doc, title: 'STALE CACHED INDEX', url: staleUrl }));
  const cacheStore = { [previousCacheKey]: JSON.stringify(staleIndex) };
  const knowledge = JSON.parse(fs.readFileSync(path.join(root, 'knowledge-index.json'), 'utf8'));
  const fetchCalls = [];
  const context = vm.createContext({
    window, RanchersSearch: search, URL, URLSearchParams, location,
    document: { documentElement: { lang }, querySelector: selector => nodes[selector] || null,
      querySelectorAll: selector => selector === '[data-entity-filter]' ? entityFilters : [], createElement: () => node() },
    history: { replaceState(_a, _b, url) { historyWrite(url); }, pushState(_a, _b, url) { historyWrite(url); } },
    sessionStorage: { getItem: key => (key in cacheStore ? cacheStore[key] : null), setItem(key, value) { cacheStore[key] = String(value); } },
    fetch: async (url, options) => { fetchCalls.push({ url, options }); return { ok: true, json: async () => url.includes('knowledge') ? knowledge : docs }; },
    setTimeout: fn => { fn(); return 1; }, clearTimeout() {}
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/search.js'), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetchCalls.find(call => call.url.includes('knowledge-index'))?.options?.cache, 'no-cache', 'Knowledge updates must be revalidated rather than silently using an old HTTP cache entry');
  const game = nodes['[data-search-game]'];
  const results = nodes['[data-search-results]'];
  const links = () => results.children.map(article => article.children[1]?.children[0]?.href).filter(Boolean);
  assert.equal(game.value, 'fs25');
  assert.equal(languageLink.href, alternate + '?q=bread&game=fs25', 'switching locale keeps the initial query and game');
  assert.deepEqual(links(), [fs25Url], 'the shipped controller filters out Ranchers documents before ranking');
  assert.ok(!links().includes(staleUrl), 'the controller never serves documents from a previous cache key');
  assert.ok(cacheStore[previousCacheKey], 'a pre-seeded previous cache entry stays untouched, never migrated or deleted');
  assert.equal(JSON.parse(cacheStore[freshCacheKey] || 'null')?.length, docs.length, 'the controller persists the fresh index under the new cache key');
  assert.equal(scoredKnowledge, 0, 'FS25 never even scores the Ranchers dossier');
  assert.equal(nodes['[data-entity-filters]'].hidden, true);
  game.value = 'ranchers'; game.fire('change');
  assert.ok(links().length > 0 && links().every(url => !url.includes('/games/fs25/')));
  assert.equal(new URL(lastUrl, 'https://theranchersguide.com').searchParams.get('game'), 'ranchers');
  assert.equal(new URL(languageLink.href).searchParams.get('game'), 'ranchers', 'explicit scope changes also update the counterpart after shared history sync');
  if (lang === 'en') {
    nodes['[data-search-input]'].value = 'zirconite';
    entityFilters[0].fire('click');
    assert.match(nodes['[data-knowledge-dossier]'].innerHTML, /href="\/map#city-hall"/, 'the location filter keeps its keyword fallback even when another type has a named match');
  }
  nodes['[data-search-clear]'].fire('click');
  assert.ok(lastUrl.endsWith('?game=ranchers'), 'clear preserves scope in the real page URL');
  assert.equal(languageLink.href, alternate + '?game=ranchers', 'clear retains the game in the language switch');
  location.search = '?game=fs25&q=bread'; window.listeners.popstate();
  assert.equal(game.value, 'fs25');
  assert.deepEqual(links(), [fs25Url], 'back/forward restores scope and query together');
  assert.equal(languageLink.href, alternate + '?q=bread&game=fs25', 'back/forward also restores the language counterpart');
}
(async () => {
  await pageController('en');
  await pageController('zh-CN');
  console.log('PASS: bilingual real search controller scoping, dossier isolation, clear and history restoration.');
})().catch(error => { console.error(error); process.exitCode = 1; });
