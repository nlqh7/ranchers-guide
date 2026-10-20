const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const fail = (message) => {
  throw new Error(`FAIL: ${message}`);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const routes = [
  { route: "/games/fs25/", file: "games/fs25/index.html", lang: "en", title: "Farming Simulator 25" },
  { route: "/games/fs25/tools/production-planner/", file: "games/fs25/tools/production-planner/index.html", lang: "en", title: "FS25 Bread Production Planner" },
  { route: "/zh/games/fs25/", file: "zh/games/fs25/index.html", lang: "zh-CN", title: "Farming Simulator 25" },
  { route: "/zh/games/fs25/tools/production-planner/", file: "zh/games/fs25/tools/production-planner/index.html", lang: "zh-CN", title: "FS25 面包生产规划器" },
];

const source = JSON.parse(read("data/fs25/production.json"));
const catalog = JSON.parse(read("data/game-catalog.json"));
assert(source.schemaVersion === "fs25-bread-v1", "unexpected FS25 source schema");
assert(source.game.id === "fs25" && source.game.status === "pilot", "FS25 catalog identity is not pilot-scoped");
const fs25Catalog = catalog.games.find((game) => game.id === "fs25");
const publicCandidate = catalog.releaseProfile === "fs25-bread-v1";
assert(fs25Catalog && fs25Catalog.hubRoute === "/games/fs25/" && fs25Catalog.zhHubRoute === "/zh/games/fs25/", "FS25 game catalog routes are incomplete");

for (const item of routes) {
  const html = read(item.file);
  assert(html.includes(`<html lang="${item.lang}">`), `${item.file} has the wrong language`);
  assert(html.includes(`<meta name="robots" content="${publicCandidate ? 'index' : 'noindex'},follow">`), `${item.file} indexability must match the explicitly declared release profile`);
  if (publicCandidate) assert(html.includes('search?game=fs25'), `${item.file} needs game-scoped search navigation`);
  assert(html.includes('rel="canonical"'), `${item.file} is missing canonical metadata`);
  assert(html.includes('hreflang="en"') && html.includes('hreflang="zh-CN"') && html.includes('hreflang="x-default"'), `${item.file} is missing bilingual hreflang metadata`);
  assert(html.includes('/assets/css/game-tools.css'), `${item.file} is missing scoped game-tool CSS`);
  assert(html.includes('class="footer-grid"'), `${item.file} is missing the shared four-column footer`);
  const footer = html.match(/<footer[\s\S]*?<\/footer>/i)?.[0] || "";
  assert(/Farming Simulator 25|FS25/.test(footer), `${item.file} footer does not identify the FS25 pilot`);
  assert(/community reference|社区参考/.test(footer), `${item.file} footer is missing the reference-data boundary`);
  assert(html.includes(item.title), `${item.file} is missing its expected title identity`);
  if (item.file.includes("production-planner")) {
    assert(html.includes('id="fs25-planner"'), `${item.file} is missing planner mount`);
    assert(html.includes('/assets/js/fs25-planner-data.js') && html.includes('/assets/js/fs25-planner.js'), `${item.file} is missing planner scripts`);
    assert(html.includes('1KBP3QLKgKboofOCFQnM2gedq75pu7ugzm960FQDb3EM') && html.includes('1.4.3'), `${item.file} must identify the actual historical reference setup, not imply universal facilities`);
  } else {
    assert(html.includes("production-planner"), `${item.file} is missing the planner entry link`);
  }
}

const searchJs = read("assets/js/search.js");
for (const route of routes.map((item) => item.route)) {
  assert(searchJs.includes(`"${route}"`) === publicCandidate, `FS25 page list must match its release profile: ${route}`);
}
assert(searchJs.includes(publicCandidate ? "ranchers-search-index-v46" : "ranchers-search-index-v45") && searchJs.includes(publicCandidate ? "ranchers-search-index-zh-v32" : "ranchers-search-index-zh-v31"), "search cache keys must match the selected indexed scope");
for (const file of ["search-index.json", "zh/search-index.json"]) {
  const index = JSON.parse(read(file));
  assert(index.some((entry) => entry.url.includes("games/fs25")) === publicCandidate, `${file} FS25 entries must match its release profile`);
}
assert(read("search-index.json").includes("/guides/beginners-guide"), "English Ranchers search route was lost");
assert(read("zh/search-index.json").includes("/zh/guides/beginners-guide"), "Chinese Ranchers search route was lost");
if (publicCandidate) {
  assert(read("index.html").includes('href="/games/fs25/"') && read("zh/index.html").includes('href="/zh/games/fs25/"'), "explicit public tool scope needs a clearly labelled home entry");
  for (const file of ['index.html', 'zh/index.html']) {
    const main = read(file).match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0] || '';
    assert(main.includes('id="fs25-tools-title"'), `${file}: the new game entry must be inside main, never head or before doctype`);
  }
  assert(read("sitemap.xml").includes("/games/fs25/"), "public tool scope must be discoverable in sitemap");
  const search = require('../assets/js/search-core.js');
  const scope = require('../assets/js/search-game-scope.js');
  for (const [file, queries] of [['search-index.json', ['flour shortage', 'one grain mill supply bakery']], ['zh/search-index.json', ['面粉不够', '一个磨坊够吗']]]) {
    const docs = scope.filterDocuments(JSON.parse(read(file)), 'fs25');
    for (const query of queries) {
      const matches = search.searchDocuments(docs, query, 8);
      assert(matches.some(item => item.url.includes('production-planner/#mill-supply')), `${file}: ${query} must reach the actual conditional mill-capacity answer`);
    }
  }
} else {
  assert(!/fs25|farming simulator/i.test(read("index.html")) && !/fs25|farming simulator/i.test(read("zh/index.html")), "FS25 pilot leaked into a public homepage");
  assert(!read("sitemap.xml").includes("/games/fs25/"), "noindex FS25 pilot must not be published in sitemap yet");
}
const gameCss = read("assets/css/game-tools.css");
assert(gameCss.includes("min-height: 44px") && gameCss.includes("grid-template-columns: minmax(0, 1fr)"), "FS25 mobile control/grid contract is missing");

console.log(`PASS: FS25 V1 routes, bilingual metadata, shared footers and ${publicCandidate ? 'explicit bread candidate' : 'private noindex'} discovery boundary are consistent.`);
