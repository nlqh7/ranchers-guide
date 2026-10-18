// Inspect the actual Ranchers-only artifact, not robots metadata or Git intent.
const fs = require('node:fs');
const path = require('node:path');

function inspectPublicRelease(root) {
  const failures = [];
  const files = [];
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
    if (forbiddenFile.test(file)) failures.push(`${file}: unpublished FS25 file is in the artifact`);
  }
  function inspectReference(file, value) {
    let decoded = value.replace(/&amp;/gi, '&').replace(/&#(x[0-9a-f]+|\d+);/gi,
      (_, code) => String.fromCodePoint(parseInt(code.replace(/^x/i, ''), /^x/i.test(code) ? 16 : 10)));
    try { decoded = decodeURIComponent(decoded); } catch { /* URL parser still checks the literal path. */ }
    let url;
    try { url = new URL(decoded, `https://theranchersguide.com/${file}`); } catch { return; }
    if (!['theranchersguide.com', 'www.theranchersguide.com'].includes(url.hostname.toLowerCase())) return;
    if (forbiddenFile.test(url.pathname.replace(/^\/+/, ''))) {
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
  return { failures, fileCount: files.length };
}

if (require.main === module) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--root') {
      throw new Error('Usage: node scripts/check-public-release.cjs --root <actual-public-candidate>');
    }
    const root = path.resolve(process.argv[3]);
    const result = inspectPublicRelease(root);
    for (const failure of result.failures) console.error(`FAIL: ${failure}`);
    if (result.failures.length) process.exitCode = 1;
    else console.log(`PASS: ${result.fileCount} artifact files checked for FS25 payload and public references. This is isolation evidence, not full QA or AdSense approval.`);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { inspectPublicRelease };
