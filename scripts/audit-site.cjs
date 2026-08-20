const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sitemapText = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sitemapRoutes = new Set(
  [...sitemapText.matchAll(/<loc>https:\/\/theranchersguide\.com([^<]*)<\/loc>/g)].map((match) => match[1] || "/")
);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function routeFor(file) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"index.html".length)}`;
  return `/${relative.slice(0, -".html".length)}`;
}

function decodeEntities(value) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function textFrom(html) {
  return decodeEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function capture(html, expression) {
  return (html.match(expression) || [])[1]?.trim() || "";
}

function visibleWordCount(text, language) {
  if (language.toLowerCase().startsWith("zh")) {
    const han = (text.match(/[\u3400-\u9fff]/g) || []).length;
    const latin = (text.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) || []).length;
    return Math.round(han / 2 + latin);
  }
  return (text.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) || []).length;
}

function pageKind(route, html) {
  if (route === "/" || route === "/zh/") return "home";
  if (route === "/404") return "error";
  if (route === "/search" || route === "/zh/search") return "search-shell";
  if (route.startsWith("/guides/") || route.startsWith("/zh/guides/")) return "guide";
  if (route.startsWith("/problems/") || route.startsWith("/zh/problems/")) return "problem-guide";
  if (route.startsWith("/database/") || route.startsWith("/zh/database/")) return "database";
  if (route.startsWith("/tools/") || route.startsWith("/zh/tools/")) return "tool";
  if (route.endsWith("/map") || route === "/map") return "map";
  if (["/database", "/zh/database", "/problems", "/zh/problems"].includes(route)) return "hub";
  if (["/about", "/contact", "/privacy", "/methodology"].includes(route)) return "trust";
  if (["/research", "/community", "/contribute"].includes(route)) return "editorial-support";
  return html.includes("data-search-form") ? "utility" : "page";
}

function classify(page) {
  if (page.kind === "error") return ["D", "Error page; must stay outside sitemap and index."];
  if (page.kind === "search-shell") return ["D", "Search-results shell has no stable standalone search intent."];
  if (page.route === "/contribute") return ["D", "Submission workflow supports the site but is not a search landing page."];
  if (page.kind === "trust") return ["C", "Required trust/support page, not a primary gameplay landing page."];
  if (page.route === "/research") return ["C", "Evidence hub supports credibility but exposes research-state language prominently."];
  if (page.route === "/community") return ["B", "Original community analysis with sources, but freshness and player task value need review."];
  if (page.kind === "home") return ["A", "Primary discovery page with search and actionable routes."];
  if (page.kind === "map") return ["A", "Interactive map plus original location directory and evidence grading."];
  if (page.kind === "database" && page.words >= 500) return ["A", "Substantial structured reference data with searchable anchors."];
  if (page.kind === "tool" && page.words >= 350 && page.scriptCount > 0) return ["A", "Working interactive tool with explanatory content."];
  if (["guide", "problem-guide"].includes(page.kind) && page.words >= 650 && page.nextSteps > 0) {
    return page.uncertaintyRate > 0.03
      ? ["B", "Substantial guide, but unresolved-state language is unusually prominent."]
      : ["A", "Substantial task-focused guide with actionable next steps."];
  }
  if (["guide", "problem-guide", "hub", "database", "tool"].includes(page.kind) && page.words >= 250) {
    return ["B", "Useful public page, but depth, completion, or direct-answer framing needs review."];
  }
  return ["C", "Limited standalone gameplay value or thin supporting content."];
}

const files = walk(root).sort();
const pages = files.map((file) => {
  const html = fs.readFileSync(file, "utf8");
  const route = routeFor(file);
  const main = capture(html, /<main\b[^>]*>([\s\S]*?)<\/main>/i) || html;
  const language = capture(html, /<html\b[^>]*\blang="([^"]+)"/i) || "unknown";
  const visible = textFrom(main);
  const mainLinks = [...main.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map((match) => match[1]);
  const allLinks = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map((match) => match[1]);
  const internalNextSteps = mainLinks.filter((href) => href.startsWith("/") && !href.startsWith(`${route}#`));
  const uncertainty = (visible.match(/\b(?:pending|unknown|unverified|hold|research|tbd)\b|待验证|未知|尚未验证|研究中/gi) || []).length;
  const words = visibleWordCount(visible, language);
  const schemaTypes = [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((match) => match[1]);
  const page = {
    file: path.relative(root, file).replaceAll("\\", "/"),
    route,
    kind: pageKind(route, html),
    language,
    title: textFrom(capture(html, /<title>([\s\S]*?)<\/title>/i)),
    description: capture(html, /<meta\s+name="description"\s+content="([^"]*)"/i),
    canonical: capture(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i),
    noindex: /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html),
    inSitemap: sitemapRoutes.has(route),
    words,
    uncertainty,
    uncertaintyRate: words ? uncertainty / words : 0,
    directAnswer: /answer-box|quick-answer|Answer first|Quick answer|先说答案|直接答案|先给结论/i.test(main),
    nextSteps: new Set(internalNextSteps).size,
    scriptCount: (html.match(/<script\b/gi) || []).length,
    schemaTypes: [...new Set(schemaTypes)],
    links: allLinks
  };
  [page.grade, page.reason] = classify(page);
  return page;
});

const routeSet = new Set(pages.map((page) => page.route));
const inbound = new Map([...routeSet].map((route) => [route, 0]));
for (const page of pages) {
  for (const href of new Set(page.links)) {
    if (!href.startsWith("/")) continue;
    const target = href.split(/[?#]/)[0] || "/";
    if (inbound.has(target) && target !== page.route) inbound.set(target, inbound.get(target) + 1);
  }
}
for (const page of pages) page.inbound = inbound.get(page.route) || 0;

const indexable = pages.filter((page) => page.inSitemap);
const gradeCounts = Object.fromEntries(["A", "B", "C", "D"].map((grade) => [grade, pages.filter((page) => page.grade === grade).length]));
const duplicateTitles = Object.entries(Object.groupBy(pages.filter((page) => page.title), (page) => page.title))
  .filter(([, group]) => group.length > 1)
  .map(([title, group]) => ({ title, routes: group.map((page) => page.route) }));
const duplicateDescriptions = Object.entries(Object.groupBy(pages.filter((page) => page.description), (page) => page.description))
  .filter(([, group]) => group.length > 1)
  .map(([description, group]) => ({ description, routes: group.map((page) => page.route) }));

const result = {
  generatedAt: new Date().toISOString(),
  totals: {
    html: pages.length,
    sitemap: indexable.length,
    languages: Object.fromEntries(Object.entries(Object.groupBy(pages, (page) => page.language)).map(([key, value]) => [key, value.length])),
    grades: gradeCounts
  },
  issues: {
    sitemapNoindex: pages.filter((page) => page.inSitemap && page.noindex).map((page) => page.route),
    sitemapMissingCanonical: pages.filter((page) => page.inSitemap && !page.canonical).map((page) => page.route),
    sitemapMissingDescription: pages.filter((page) => page.inSitemap && !page.description).map((page) => page.route),
    orphaned: pages.filter((page) => page.inSitemap && page.inbound === 0 && page.route !== "/").map((page) => page.route),
    duplicateTitles,
    duplicateDescriptions
  },
  pages: pages.map(({ links, uncertaintyRate, ...page }) => page)
};

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  console.log(`HTML: ${result.totals.html} | Sitemap: ${result.totals.sitemap} | A/B/C/D: ${gradeCounts.A}/${gradeCounts.B}/${gradeCounts.C}/${gradeCounts.D}`);
  console.log("Grade | Route | Kind | Words | Unknown | Inbound | Sitemap | Direct answer | Reason");
  for (const page of pages) {
    console.log(`${page.grade} | ${page.route} | ${page.kind} | ${page.words} | ${page.uncertainty} | ${page.inbound} | ${page.inSitemap ? "yes" : "no"} | ${page.directAnswer ? "yes" : "no"} | ${page.reason}`);
  }
  for (const [name, values] of Object.entries(result.issues)) {
    if (values.length) console.log(`ISSUE ${name}: ${JSON.stringify(values)}`);
  }
}
