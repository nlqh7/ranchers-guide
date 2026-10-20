const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inspectPublicRelease } = require('./check-public-release.cjs');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'ranchers-release-profile-'));
function put(file, value = '') {
  const target = path.join(fixture, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
}
const routes = ['/games/fs25/', '/games/fs25/tools/production-planner/', '/zh/games/fs25/', '/zh/games/fs25/tools/production-planner/'];
try {
  for (const file of ['index.html', 'zh/index.html', 'assets/js/search.js']) put(file);
  put('search-index.json', '[]'); put('zh/search-index.json', '[]'); put('sitemap.xml', '<urlset></urlset>');
  assert.equal(inspectPublicRelease(fixture).failures.length, 0, 'the original Ranchers-only profile still works');
  for (const route of routes) put(route.slice(1) + 'index.html', '<meta name="robots" content="index,follow"><link rel="canonical" href="https://theranchersguide.com' + route + '">');
  for (const file of ['assets/js/fs25-planner.js', 'assets/js/fs25-planner-data.js', 'assets/css/game-tools.css', 'scripts/build-fs25.cjs', 'scripts/check-fs25-planner.cjs', 'scripts/check-fs25-planner-ui.cjs', 'scripts/check-fs25-v1.cjs']) put(file);
  put('data/fs25/production.json', JSON.stringify({ game: { id: 'fs25' }, chain: { id: 'bread', steps: [{ id: 'bakery' }, { id: 'mill' }] } }));
  put('data/game-catalog.json', JSON.stringify({ releaseProfile: 'fs25-bread-v1' }));
  put('index.html', '<main><a href="/games/fs25/">FS25</a></main>');
  put('zh/index.html', '<main><a href="/zh/games/fs25/">FS25</a></main>');
  put('search-index.json', JSON.stringify(routes.slice(0, 2).map(url => ({ url }))));
  put('zh/search-index.json', JSON.stringify(routes.slice(2).map(url => ({ url }))));
  put('sitemap.xml', '<urlset>' + routes.map(route => '<url><loc>https://theranchersguide.com' + route + '</loc></url>').join('') + '</urlset>');
  assert.ok(inspectPublicRelease(fixture).failures.length > 0, 'new support never silently broadens the default profile');
  put('assets/js/search-game-scope.js'); put('assets/css/search-game-scope.css');
  for (const file of ['search.html', 'zh/search.html']) put(file, '<select data-search-game></select><script src="/assets/js/search-game-scope.js"></script>');
  assert.deepEqual(inspectPublicRelease(fixture, 'fs25-bread-v1').failures, [], 'the explicitly bounded bread profile permits only the agreed subset');
  fs.unlinkSync(path.join(fixture, 'assets/js/search-game-scope.js'));
  assert.ok(inspectPublicRelease(fixture, 'fs25-bread-v1').failures.some(f => f.includes('search-game-scope')), 'a bread release must require the real scoped-search dependency');
  put('assets/js/search-game-scope.js');
  put('games/fs25/tools/oil/index.html', 'unfinished');
  assert.ok(inspectPublicRelease(fixture, 'fs25-bread-v1').failures.some(f => f.includes('oil')), 'an unapproved chain is rejected');
  put('games/fs25/tools/production-planner/index.html', '<meta name="robots" content="noindex,follow">');
  assert.ok(inspectPublicRelease(fixture, 'fs25-bread-v1').failures.some(f => f.includes('noindex')), 'a discoverable profile cannot quietly ship a noindex tool');
  assert.ok(inspectPublicRelease(fixture, 'typo').failures.some(f => f.includes('profile')), 'unknown profiles fail closed');
  console.log('PASS: default Ranchers isolation, explicit FS25 bread allowlist, noindex and unknown-profile protection.');
} finally {
  // This directory was just created by this test, never a repository or user data directory.
  assert.ok(path.resolve(fixture).startsWith(path.resolve(os.tmpdir()) + path.sep + 'ranchers-release-profile-'));
  fs.rmSync(fixture, { recursive: true });
}
