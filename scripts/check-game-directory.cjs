const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const scope = require('../assets/js/search-game-scope.js');

// A player can choose either supported game without JavaScript or a dead-end hub.
for (const prefix of ['', 'zh/']) {
  const html = read(`${prefix}games/index.html`);
  assert.match(html, /<main[\s>]/);
  for (const route of ['games/the-ranchers/', 'games/fs25/']) {
    assert.ok(html.includes(`href="/${prefix}${route}"`), `${prefix} chooser exposes ${route}`);
    assert.ok(fs.existsSync(path.join(root, prefix, route, 'index.html')), 'game hub is a real page');
  }
  assert.ok(html.includes('name="game"') && html.includes('value="fs25"') && html.includes('value="ranchers"'), 'search offers explicit game choices');
}
for (const prefix of ['', 'zh/']) {
  const home = read(`${prefix}index.html`);
  const main = home.match(/<main>[\s\S]*?<\/main>/)?.[0] || '';
  assert.doesNotMatch(main, /id="choose-game"/, 'large game chooser belongs to directory, not homepage');
  assert.equal((main.match(/<section\b/g) || []).length, 8, 'home retains all eight content sections in each language');
  assert.ok(main.indexOf('class="hero"') < main.indexOf('id="player-routes"'), 'brand hero precedes task routes');
  assert.match(main, /name="game" value="ranchers"/, 'Ranchers hero searches within its own game');
  const fs25Section = main.match(/<section[^>]*aria-labelledby="fs25-tools-title"[\s\S]*?<\/section>/)?.[0] || '';
  assert.ok(fs25Section.includes(`href="/${prefix}games/"`), 'small all-games link accompanies FS25 tools');
  assert.match(fs25Section, prefix ? /菜籽油.*温室/ : /canola oil.*greenhouse/, 'FS25 copy covers the three existing tools');
  assert.ok(home.includes(`href="/${prefix}games/"`), 'home exposes the directory');
}
assert.equal(scope.gameForUrl('/games/the-ranchers/'), 'ranchers', 'Ranchers hub stays in Ranchers search');
assert.equal(scope.gameForUrl('/zh/games/the-ranchers/'), 'ranchers');
assert.equal(scope.gameForUrl('/games/'), null, 'cross-game directory is not a Ranchers answer');
assert.equal(scope.gameForUrl('/games'), null, 'extensionless directory has the same scope');
assert.equal(scope.gameForUrl('/'), null, 'portal home is not a Ranchers-only answer');
assert.equal(scope.gameForUrl('/zh/'), null, 'Chinese portal home has the same scope');
const catalog = JSON.parse(read('data/game-catalog.json'));
function routeFile(route) {
  const url = new URL(route, 'https://theranchersguide.com');
  const clean = url.pathname.replace(/^\//, '');
  const options = [clean + 'index.html', clean + '.html', clean];
  const file = options.find(candidate => fs.existsSync(path.join(root, candidate)) && fs.statSync(path.join(root, candidate)).isFile());
  assert.ok(file, `real destination: ${route}`);
  if (url.hash) assert.ok(read(file).includes(`id="${url.hash.slice(1)}"`), `real section: ${route}`);
  return file;
}
for (const prefix of ['', 'zh/']) {
  const main = read(`${prefix}index.html`).match(/<main>[\s\S]*?<\/main>/)[0];
  for (const match of main.matchAll(/href="(\/[^"]*)"/g)) routeFile(match[1]);
}
for (const game of catalog.games) {
  assert.ok(game.tasks.length > 0, 'no placeholder game cards');
  for (const route of [game.hubRoute, game.zhHubRoute, ...game.tasks.flatMap(task => [task.route, task.zhRoute])]) routeFile(route);
}
for (const prefix of ['', 'zh/']) {
  for (const route of ['games/', 'games/the-ranchers/']) {
    const html = read(`${prefix}${route}index.html`);
    assert.ok(read('sitemap.xml').includes(`<loc>https://theranchersguide.com/${prefix}${route}</loc>`), 'new hub discoverable in sitemap');
    assert.ok(html.includes('hreflang="zh-CN"') && html.includes('hreflang="en"'), 'paired locales');
  }
  for (const file of ['games/fs25/index.html', 'games/fs25/tools/production-planner/index.html']) {
    assert.ok(read(prefix + file).includes(`href="/${prefix}games/"`), 'FS25 has a way back to game directory');
    assert.ok(!read(prefix + file).includes(`href="/${prefix}">The Ranchers`), 'portal home is not mislabelled as a game home');
  }
}
console.log('PASS: bilingual directory/home discovery, scoped search, live task anchors, sitemap and game return paths.');
