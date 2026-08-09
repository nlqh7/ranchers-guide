/* Build a prebuilt search index (search-index.json) from the site's HTML pages.
 *
 * The runtime search (assets/js/search.js) fetches /search-index.json first and
 * only falls back to live page-fetching when the file is missing — so this
 * script must be re-run after any content edit. It mirrors the extraction logic
 * in search.js (extractDocument) and reuses search-core.js for expansion, so the
 * prebuilt index is byte-compatible with the live-built one.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const RanchersSearch = require("../assets/js/search-core.js");

/* Locale page lists are the single source of truth in assets/js/search.js. */
const searchJs = fs.readFileSync(path.join(root, "assets", "js", "search.js"), "utf8");
function readPagePaths(name) {
  const block = searchJs.match(new RegExp(`${name} = \\[([\\s\\S]*?)\\];`));
  if (!block) throw new Error(`${name} not found in assets/js/search.js`);
  return Array.from(block[1].matchAll(/"([^"]+)"/g), (match) => match[1]);
}
const EN_PAGE_PATHS = readPagePaths("EN_PAGE_PATHS");
const ZH_PAGE_PATHS = readPagePaths("ZH_PAGE_PATHS");

function routeToFile(route) {
  if (route === "/") return "index.html";
  if (route === "/zh/") return "zh/index.html";
  if (route === "/database") return "database.html";
  return `${route.replace(/^\//, "")}.html`;
}

function decodeEntities(text) {
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&copy;/g, "©")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function cleanTitle(title) {
  return String(title || "").replace(/\s*[|—]\s*The Ranchers Guide\s*$/i, "").trim();
}

function pageType(route) {
  if (route.indexOf("/zh/") === 0) {
    if (route.indexOf("/zh/guides/") === 0) return "攻略";
    if (route === "/zh/database") return "知识库";
    if (route.indexOf("/zh/database/") === 0) return "数据库";
    if (route === "/zh/map") return "地图";
    if (route === "/zh/problems") return "问题排查";
    if (route === "/zh/") return "首页";
    return "站点";
  }
  if (route.indexOf("/guides/") === 0) return "Guide";
  if (route === "/database") return "Knowledge Base";
  if (route.indexOf("/database/") === 0) return "Database";
  if (route === "/map") return "Map";
  if (route.indexOf("/problems/") === 0 || route === "/problems") return "Problem";
  if (route === "/community") return "Community";
  if (route === "/research") return "Research";
  if (route.indexOf("/tools/") === 0) return "Tool";
  if (route === "/") return "Home";
  return "Site";
}

function parseAttributes(raw) {
  const attrs = {};
  for (const match of raw.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[match[1]] = decodeEntities(match[2]);
  return attrs;
}

function extractEntries(mainHtml) {
  const entries = [];
  const entryPattern = /<(\w+)([^>]*\bdata-search-entry\b[^>]*)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = entryPattern.exec(mainHtml)) !== null) {
    const [, tag, rawAttrs, inner] = match;
    const attrs = parseAttributes(rawAttrs);
    if (!attrs.id) continue;
    let text;
    if (tag.toLowerCase() === "tr") {
      const cells = Array.from(inner.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g), (cell) => stripTags(cell[1]));
      text = cells.join(" · ");
    } else {
      const heading = inner.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/);
      text = stripTags(inner);
      if (!attrs["data-search-title"] && heading) attrs["data-search-title"] = stripTags(heading[1]);
    }
    entries.push({
      id: attrs.id,
      title: attrs["data-search-title"] || attrs.id,
      text,
      tags: attrs["data-search-tags"] || "",
      status: attrs["data-search-status"] || "Community data",
    });
  }
  return entries;
}

function extractSections(mainHtml) {
  /* Remove non-content blocks and search entries, mirroring search.js. */
  let cleaned = mainHtml
    .replace(/<(form|script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(\w+)([^>]*\bdata-search-entry\b[^>]*)>[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]*class="[^"]*\bad-slot\b[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/g, " ")
    .replace(/<[^>]*class="[^"]*\bfield-note-list\b[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/g, " ");

  const sections = [];
  const seen = new Set();
  let heading = "Overview";
  let headingId = "";
  const tokenPattern = /<h([123])([^>]*)>([\s\S]*?)<\/h\1>|<(p|li|summary|th|td)([^>]*)>([\s\S]*?)<\/\4>/g;
  let match;
  while ((match = tokenPattern.exec(cleaned)) !== null) {
    if (match[1]) {
      const level = match[1];
      const attrs = parseAttributes(match[2] || "");
      const text = stripTags(match[3]);
      heading = text || heading;
      if (attrs.id) headingId = attrs.id;
      else if (level !== "3") headingId = "";
      continue;
    }
    const text = stripTags(match[6]);
    if (text.length < 18 || seen.has(text)) continue;
    seen.add(text);
    sections.push({ id: headingId, heading, text: text.slice(0, 520) });
  }
  return sections;
}

function extractDocument(html, route) {
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const descriptionMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const mainHtml = mainMatch ? mainMatch[1] : "";

  return {
    title: cleanTitle(titleMatch ? decodeEntities(titleMatch[1]).trim() : ""),
    url: route,
    type: pageType(route),
    sectionAnswers: ["/", "/database", "/problems", "/research"].indexOf(route) === -1,
    description: descriptionMatch ? decodeEntities(descriptionMatch[1]) : "",
    sections: extractSections(mainHtml),
    entries: extractEntries(mainHtml),
  };
}

function buildLocale(pagePaths, outputRelative) {
  const documents = pagePaths.map((route) => {
    const file = routeToFile(route);
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) throw new Error(`Missing page for route ${route}: ${file}`);
    return extractDocument(fs.readFileSync(absolute, "utf8"), route);
  });
  const index = documents.reduce((all, doc) => all.concat(RanchersSearch.expandEntryDocuments(doc)), []);
  const output = path.join(root, outputRelative);
  const serialized = JSON.stringify(index);
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(output) || fs.readFileSync(output, "utf8") !== serialized) {
      console.error(`FAIL: ${outputRelative} is missing or out of sync. Re-run: node scripts/build-search-index.cjs`);
      process.exitCode = 1;
      return;
    }
    console.log(`PASS: ${outputRelative} is in sync (${index.length} documents from ${documents.length} pages).`);
    return;
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, serialized, "utf8");
  console.log(`Wrote ${outputRelative}: ${index.length} documents from ${documents.length} pages (${(Buffer.byteLength(serialized) / 1024).toFixed(1)} KB).`);
}

buildLocale(EN_PAGE_PATHS, "search-index.json");
buildLocale(ZH_PAGE_PATHS, "zh/search-index.json");
