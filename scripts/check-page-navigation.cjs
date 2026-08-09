const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const ignoredDirectories = new Set([".git", "node_modules"]);

function listHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function routeForFile(file) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"index.html".length)}`;
  return `/${relative.slice(0, -".html".length)}`;
}

function fileForPathname(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (_) {
    return null;
  }

  const relative = decoded.replace(/^\/+/, "");
  const direct = path.resolve(root, relative);
  const rootPrefix = `${root}${path.sep}`;
  if (direct !== root && !direct.startsWith(rootPrefix)) return null;

  const candidates = [];
  if (!relative || decoded.endsWith("/")) candidates.push(path.join(direct, "index.html"));
  else if (path.extname(direct)) candidates.push(direct);
  else candidates.push(`${direct}.html`, path.join(direct, "index.html"));

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
}

function attributesFrom(tag) {
  const attributes = new Map();
  const pattern = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of tag.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function idsFrom(html) {
  const ids = [];
  for (const match of html.matchAll(/\sid\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)) {
    ids.push(match[1] || match[2]);
  }
  return ids;
}

const files = listHtmlFiles(root).sort();
const htmlByFile = new Map(files.map((file) => [file, fs.readFileSync(file, "utf8")]));
const idsByFile = new Map(files.map((file) => [file, new Set(idsFrom(htmlByFile.get(file))) ]));
const failures = [];
let checkedLinks = 0;
let checkedFragments = 0;

function fail(file, message) {
  failures.push(`${path.relative(root, file).replaceAll(path.sep, "/")}: ${message}`);
}

for (const file of files) {
  const html = htmlByFile.get(file);
  const route = routeForFile(file);
  const ownIds = idsFrom(html);
  const duplicateIds = ownIds.filter((id, index) => ownIds.indexOf(id) !== index);
  if (duplicateIds.length) fail(file, `duplicate id(s): ${[...new Set(duplicateIds)].join(", ")}`);

  const isErrorPage = path.basename(file) === "404.html";
  if (!isErrorPage) {
    if (!/<header\b[^>]*class="[^"]*site-header/i.test(html)) fail(file, "missing shared site header");
    if (!/<button\b[^>]*class="[^"]*nav-toggle/i.test(html)) fail(file, "missing mobile navigation toggle");
    if (!/<ul\b[^>]*class="[^"]*nav-links/i.test(html)) fail(file, "missing navigation link list");
  }

  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    const attributes = attributesFrom(tag);
    if (!attributes.has("href")) {
      fail(file, `anchor without href: ${tag}`);
      continue;
    }

    const href = attributes.get("href").trim();
    if (!href || href.toLowerCase().startsWith("javascript:")) {
      fail(file, `non-navigable anchor href: ${JSON.stringify(href)}`);
      continue;
    }

    const classes = (attributes.get("class") || "").split(/\s+/);
    if (classes.includes("btn") || classes.some((name) => /(?:card|quick|text)-link|nav-cta/.test(name))) {
      if (!href) fail(file, `CTA has no destination: ${tag}`);
    }

    if (/^(?:mailto:|tel:|data:)/i.test(href)) continue;
    let target;
    try {
      target = new URL(href, `https://theranchersguide.com${route}`);
    } catch (_) {
      fail(file, `invalid URL: ${href}`);
      continue;
    }
    if (target.origin !== "https://theranchersguide.com") continue;

    checkedLinks += 1;
    const targetFile = fileForPathname(target.pathname);
    if (!targetFile) {
      fail(file, `internal link does not resolve: ${href}`);
      continue;
    }

    if (target.hash) {
      checkedFragments += 1;
      let id;
      try {
        id = decodeURIComponent(target.hash.slice(1));
      } catch (_) {
        fail(file, `invalid fragment encoding: ${href}`);
        continue;
      }
      if (!idsByFile.get(targetFile)?.has(id)) fail(file, `fragment target not found: ${href}`);
    }
  }

  for (const match of html.matchAll(/<form\b[^>]*>/gi)) {
    const attributes = attributesFrom(match[0]);
    const action = attributes.get("action");
    if (!action || /^(?:https?:|mailto:)/i.test(action)) continue;
    const target = new URL(action, `https://theranchersguide.com${route}`);
    if (!fileForPathname(target.pathname)) fail(file, `form action does not resolve: ${action}`);
  }

  for (const match of html.matchAll(/<(span|div|p)\b[^>]*class\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>/gi)) {
    const className = match[2] || match[3];
    if (/(?:^|\s)(?:card-link|quick-link|text-link|nav-cta)(?:\s|$)/.test(className)) {
      fail(file, `non-interactive element uses link class: ${match[0]}`);
    }
  }
}

if (failures.length) {
  console.error(`FAIL: ${failures.length} navigation issue(s) across ${files.length} HTML pages.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PASS: ${files.length} pages, ${checkedLinks} internal links and ${checkedFragments} fragments have valid navigation targets.`);
