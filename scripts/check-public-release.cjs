// Inspect the actual Ranchers-only artifact, not robots metadata or Git intent.
const fs = require('node:fs');
const path = require('node:path');

const FS25_PUBLIC_FILES = [
  'games/fs25/index.html', 'games/fs25/tools/production-planner/index.html',
  'zh/games/fs25/index.html', 'zh/games/fs25/tools/production-planner/index.html',
  'assets/js/fs25-planner.js', 'assets/js/fs25-planner-data.js', 'assets/css/game-tools.css',
  'data/fs25/production.json', 'data/game-catalog.json',
  'scripts/build-fs25.cjs', 'scripts/check-fs25-planner.cjs', 'scripts/check-fs25-planner-ui.cjs', 'scripts/check-fs25-v1.cjs'
];
const FS25_PUBLIC_ROUTES = FS25_PUBLIC_FILES.filter(file => file.endsWith('index.html')).map(file => '/' + file.slice(0, -10));

function inspectPublicRelease(root, profile = 'ranchers') {
  const failures = [];
  const files = [];
  if (!['ranchers', 'fs25-bread-v1'].includes(profile)) failures.push(`Unknown release profile: ${profile}`);
  const breadProfile = profile === 'fs25-bread-v1';
  const allowedFiles = new Set(breadProfile ? FS25_PUBLIC_FILES : []);
  const allowedReferences = new Set(breadProfile ? FS25_PUBLIC_FILES.concat(FS25_PUBLIC_ROUTES.map(route => route.slice(1))) : []);
  function walk(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const relative = prefix + entry.name;
      if (entry.isSymbolicLink()) {
        failures.push(`${relative}: symbolic link prevents a self-contained artifact check`);
      } else if (entry.isDirectory()) {
        walk(path.join(directory, entry.name), `${relative}/`);
      } else {
        files.push(relative);
      }
    }
  }
  walk(root);
  for (const required of ['index.html', 'zh/index.html', 'search-index.json', 'zh/search-index.json', 'sitemap.xml', 'assets/js/search.js']) {
    if (!files.includes(required)) failures.push(`${required}: missing required public release file`);
  }
  const forbiddenFile = /(?:^|\/)(?:games\/fs25|data\/fs25)(?:\/|$)|(?:^|\/)(?:fs25[^/]*|game-catalog\.json|game-tools\.css)$|^scripts\/(?:build|check)-fs25[^/]*$/i;
  for (const file of files) {
    if (forbiddenFile.test(file) && !allowedFiles.has(file)) failures.push(`${file}: unpublished FS25 file is in the artifact`);
  }
  function inspectReference(file, value) {
    let decoded = value.replace(/&amp;/gi, '&').replace(/&#(x[0-9a-f]+|\d+);/gi,
      (_, code) => String.fromCodePoint(parseInt(code.replace(/^x/i, ''), /^x/i.test(code) ? 16 : 10)));
    try { decoded = decodeURIComponent(decoded); } catch { /* URL parser still checks the literal path. */ }
    let url;
    try { url = new URL(decoded, `https://theranchersguide.com/${file}`); } catch { return; }
    if (!['theranchersguide.com', 'www.theranchersguide.com'].includes(url.hostname.toLowerCase())) return;
    const referencedPath = url.pathname.replace(/^\/+/, '');
    if (forbiddenFile.test(referencedPath) && !allowedReferences.has(referencedPath)) {
      failures.push(`${file}: unpublished FS25 reference ${value}`);
    }
  }
  for (const file of files) {
    if (file.endsWith('.html')) {
      const html = fs.readFileSync(path.join(root, file), 'utf8');
      for (const match of html.matchAll(/\b(?:href|src|action|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
        inspectReference(file, match[1] ?? match[2] ?? match[3]);
      }
    }
    if (/(?:search|knowledge)-index\.json$/.test(file)) {
      const index = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      function visit(value) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') {
          for (const [key, child] of Object.entries(value)) {
            if (['url', 'href', 'route'].includes(key) && typeof child === 'string') inspectReference(file, child);
            else if (child && typeof child === 'object') visit(child);
          }
        }
      }
      visit(index);
    }
    if (file.endsWith('.xml')) {
      for (const match of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
        inspectReference(file, match[1].trim());
      }
    }
    if (file.startsWith('assets/js/') && file.endsWith('.js')) {
      const js = fs.readFileSync(path.join(root, file), 'utf8');
      for (const match of js.matchAll(/(["'`])((?:\.{0,2}\/|https?:\/\/)[^"'`\r\n]+)\1/g)) {
        inspectReference(file, match[2]);
      }
    }
  }
  if (breadProfile) {
    for (const file of FS25_PUBLIC_FILES.concat(['assets/js/search-game-scope.js', 'assets/css/search-game-scope.css', 'search.html', 'zh/search.html'])) {
      if (!files.includes(file)) failures.push(`${file}: missing required fs25-bread-v1 file`);
    }
    function read(file) { return files.includes(file) ? fs.readFileSync(path.join(root, file), 'utf8') : ''; }
    for (const file of ['search.html', 'zh/search.html']) {
      if (!read(file).includes('data-search-game') || !read(file).includes('/search-game-scope.js')) failures.push(`${file}: scoped search loader/control missing`);
    }
    try {
      const catalog = JSON.parse(read('data/game-catalog.json'));
      if (catalog.releaseProfile !== profile) failures.push('game-catalog.json: release profile not explicitly declared');
      const data = JSON.parse(read('data/fs25/production.json'));
      if (data.game?.id !== 'fs25' || data.chain?.id !== 'bread' || data.chain.steps?.map(step => step.id).join(',') !== 'bakery,mill') {
        failures.push('production.json: only the agreed bakery/mill bread chain is public');
      }
    } catch (_) { failures.push('FS25 public data must be valid JSON'); }
    for (const route of FS25_PUBLIC_ROUTES) {
      const html = read(route.slice(1) + 'index.html');
      if (/\bnoindex\b/i.test(html)) failures.push(`${route}: noindex is incompatible with the public profile`);
      const indexFile = route.startsWith('/zh/') ? 'zh/search-index.json' : 'search-index.json';
      try {
        if (!JSON.parse(read(indexFile)).some(entry => entry.url?.split('#')[0] === route)) failures.push(`${route}: absent from ${indexFile}`);
      } catch (_) { failures.push(`${indexFile}: invalid search index`); }
      if (!read('sitemap.xml').includes(`<loc>https://theranchersguide.com${route}</loc>`)) failures.push(`${route}: absent from sitemap`);
    }
    for (const [home, route] of [['index.html', '/games/fs25/'], ['zh/index.html', '/zh/games/fs25/']]) {
      const main = read(home).match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0] || '';
      if (!main.includes(`href="${route}"`)) failures.push(`${home}: explicit FS25 entry must be inside main`);
    }
  }
  return { failures, fileCount: files.length, profile };
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--root', '--profile'].includes(args[i]) || !args[i + 1] || options[args[i]]) throw new Error('Usage: node scripts/check-public-release.cjs --root <candidate> [--profile ranchers|fs25-bread-v1]');
      options[args[i]] = args[i + 1];
    }
    if (!options['--root']) throw new Error('An explicit candidate --root is required');
    const root = path.resolve(options['--root']);
    const result = inspectPublicRelease(root, options['--profile'] || 'ranchers');
    for (const failure of result.failures) console.error(`FAIL: ${failure}`);
    if (result.failures.length) process.exitCode = 1;
    else console.log(`PASS: ${result.fileCount} artifact files checked under ${result.profile}. This is scope evidence, not full QA or AdSense approval.`);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { inspectPublicRelease, FS25_PUBLIC_FILES, FS25_PUBLIC_ROUTES };
