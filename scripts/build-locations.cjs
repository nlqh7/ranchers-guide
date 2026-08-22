/* Keep map.html and zh/map.html in sync with data/locations.json.
 *
 * First migration only:
 *   node scripts/build-locations.cjs --bootstrap
 *
 * Normal maintenance:
 *   node scripts/build-locations.cjs
 *   node scripts/build-locations.cjs --check
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "locations.json");
const pages = {
  en: path.join(root, "map.html"),
  zh: path.join(root, "zh", "map.html"),
};

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function attrs(openingTag) {
  const values = {};
  for (const match of openingTag.matchAll(/([:\w-]+)="([^"]*)"/g)) values[match[1]] = match[2];
  return values;
}

function extractMarkers(html) {
  const section = html.match(/<div class="map-marker-layer"[^>]*>([\s\S]*?)\n\s*<\/div>\n\s*<div class="map-pin-layer"/);
  if (!section) throw new Error("Could not find map marker layer");
  return Array.from(section[1].matchAll(/<button class="map-marker map-marker-([a-z]+)"([\s\S]*?)<\/button>/g)).map((match) => {
    const values = attrs(match[0]);
    const target = values["data-marker-target"] || "";
    const style = values.style || "";
    const x = Number((style.match(/--mx:([\d.]+)%/) || [])[1]);
    const y = Number((style.match(/--my:([\d.]+)%/) || [])[1]);
    const label = (match[0].match(/<span>([\s\S]*?)<\/span>/) || [])[1];
    if (!target || !Number.isFinite(x) || !Number.isFinite(y) || !label) {
      throw new Error(`Invalid marker: ${values["data-marker-title"] || "unknown"}`);
    }
    return {
      id: target.startsWith("#") ? target.slice(1) : null,
      target,
      category: match[1],
      x,
      y,
      title: values["data-marker-title"],
      confidence: values["data-marker-confidence"],
      description: values["data-marker-copy"],
      ariaLabel: values["aria-label"],
      label,
    };
  });
}

function extractEntries(html) {
  const section = html.match(/<div class="location-list">([\s\S]*?<\/article>)\s*<\/div>\s*<div class="search-empty"/);
  if (!section) throw new Error("Could not find location directory");
  return Array.from(section[1].matchAll(/<article data-location-entry([\s\S]*?)<\/article>/g)).map((match) => {
    const opening = match[0].match(/^<article[^>]*>/)[0];
    const values = attrs(opening);
    return {
      id: values.id,
      title: values["data-location-title"],
      category: values["data-location-category"],
      keywords: values["data-location-keywords"],
      entryHtml: match[0].slice(opening.length, -"</article>".length),
    };
  });
}

function inferEvidence(enHtml, marker) {
  const text = `${enHtml} ${marker ? marker.description : ""}`;
  if (/planned upcoming|not confirmed accessible|Future:/i.test(text)) {
    return { evidenceLevel: "official", validity: "planned" };
  }
  if (/Historical|recheck current build|pre-EA/i.test(text)) {
    return { evidenceLevel: "historical", validity: "historical" };
  }
  if (/evidence-video|Video-observed/i.test(text)) {
    return { evidenceLevel: "video-observed", validity: "current" };
  }
  if (/evidence-official|Official source|Officially confirmed/i.test(text)) {
    return { evidenceLevel: "official", validity: "current" };
  }
  if (/fan wiki|community reported|evidence-corroborated/i.test(text)) {
    return { evidenceLevel: "community-reported", validity: "current" };
  }
  return { evidenceLevel: "unverified-lead", validity: "unknown" };
}

function inferSources(enHtml, marker) {
  const text = `${enHtml} ${marker ? marker.description : ""}`;
  const ids = [];
  if (/Games Station|Video-observed/i.test(text)) ids.push("games-station-map");
  if (/Official|official/i.test(text)) ids.push("official-steam-material");
  if (/fan wiki|theranchers\.wiki/i.test(text)) ids.push("fan-wiki-map");
  if (/Community|player report|evidence-reported/i.test(text)) ids.push("community-reports");
  return Array.from(new Set(ids));
}

function precision(confidence) {
  const value = String(confidence || "").toLowerCase();
  if (/region|区域/.test(value)) return "region-only";
  if (/unverified|尚未/.test(value)) return "unverified";
  if (/planned|规划|即将/.test(value)) return "planned";
  return "approximate";
}

function bootstrap() {
  if (fs.existsSync(dataPath)) throw new Error("Refusing to overwrite existing data/locations.json");
  const html = { en: read(pages.en), zh: read(pages.zh) };
  const markers = { en: extractMarkers(html.en), zh: extractMarkers(html.zh) };
  const entries = { en: extractEntries(html.en) };
  const enMarkers = new Map(markers.en.map((marker) => [marker.id, marker]));

  if (markers.en.length !== markers.zh.length) throw new Error("English and Chinese marker counts differ");

  const zhMarkers = new Map(markers.en.map((marker, index) => [marker.id, markers.zh[index]]));

  const locations = entries.en.map((entry) => {
    const enMarker = enMarkers.get(entry.id);
    const zhMarker = zhMarkers.get(entry.id);
    if (!!enMarker !== !!zhMarker) throw new Error(`Marker locale mismatch for ${entry.id}`);
    const evidence = inferEvidence(entry.entryHtml, enMarker);
    return {
      id: entry.id,
      category: entry.category,
      build: evidence.validity === "historical" ? "pre-EA" : "0.8.10.x",
      evidenceLevel: evidence.evidenceLevel,
      validity: evidence.validity,
      sourceIds: inferSources(entry.entryHtml, enMarker),
      locale: {
        en: { title: entry.title, keywords: entry.keywords, entryHtml: entry.entryHtml },
        zh: {
          title: zhMarker ? zhMarker.title : entry.title,
          keywords: zhMarker ? `${zhMarker.title} ${entry.keywords}` : entry.keywords,
          entryHtml: null
        },
      },
      marker: enMarker ? {
        x: enMarker.x,
        y: enMarker.y,
        precision: precision(enMarker.confidence),
        locale: {
          en: {
            title: enMarker.title,
            confidence: enMarker.confidence,
            description: enMarker.description,
            ariaLabel: enMarker.ariaLabel,
            label: enMarker.label,
            target: enMarker.target,
          },
          zh: {
            title: zhMarker.title,
            confidence: zhMarker.confidence,
            description: zhMarker.description,
            ariaLabel: zhMarker.ariaLabel,
            label: zhMarker.label,
            target: zhMarker.target,
          },
        },
      } : null,
    };
  });

  const data = {
    meta: {
      schemaVersion: 1,
      build: "0.8.10.x",
      lastReviewed: "2026-08-07",
      coordinateSystem: "percentage-of-current-player-map",
      markerOrder: markers.en.map((marker) => marker.id),
      note: "Coordinates remain approximate unless a current-build screenshot proves an exact pin.",
    },
    sources: {
      "games-station-map": {
        kind: "player-video",
        title: "Games Station walkthrough - current map at 28:15",
        url: "https://www.youtube.com/watch?v=GrFiYqWcBK0&t=1695s",
        date: "2026-08-02"
      },
      "official-steam-material": {
        kind: "official-news",
        title: "Official The Ranchers Steam news and visual references",
        url: "https://steamcommunity.com/app/1501310/allnews/",
        date: null
      },
      "fan-wiki-map": {
        kind: "fan-wiki",
        title: "The Ranchers fan wiki map and NPC cross-check",
        url: "https://theranchers.wiki/wiki/map/",
        date: null
      },
      "community-reports": {
        kind: "community",
        title: "Current-build Steam community reports",
        url: "https://steamcommunity.com/app/1501310/discussions/",
        date: null
      }
    },
    locations,
  };

  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Bootstrapped data/locations.json with ${locations.length} locations and ${markers.en.length} markers.`);
}

function renderMarker(location, locale) {
  const marker = location.marker;
  const copy = marker.locale[locale];
  return `                <button class="map-marker map-marker-${location.category} map-marker-area map-marker-evidence-${marker.evidenceLayer}" type="button" style="--mx:${marker.x}%;--my:${marker.y}%" data-marker-id="${location.id}" data-marker-category="${location.category}" data-marker-evidence-layer="${marker.evidenceLayer}" data-marker-precision="${marker.precision}" data-marker-title="${copy.title}" data-marker-confidence="${copy.confidence}" data-marker-copy="${copy.description}" data-marker-target="${copy.target}" aria-label="${copy.ariaLabel}"><span>${copy.label}</span></button>`;
}

function renderEntry(location, locale) {
  const copy = location.locale[locale];
  return `        <article data-location-entry data-search-entry id="${location.id}" data-location-title="${copy.title}" data-location-category="${location.category}" data-location-keywords="${copy.keywords}">${copy.entryHtml}</article>`;
}

const zhCategoryLabels = {
  shopping: "购物",
  services: "服务",
  transport: "交通",
  landmarks: "地标",
};

const zhEvidenceLabels = {
  official: "官方来源",
  "video-observed": "视频观测",
  "community-reported": "社区报告",
  "unverified-lead": "待验证线索",
  historical: "历史资料",
};

const zhEvidenceClasses = {
  official: "evidence-official",
  "video-observed": "evidence-video",
  "community-reported": "evidence-corroborated",
  "unverified-lead": "evidence-reported",
  historical: "evidence-historical",
};

const zhLocationLinks = {
  "leafy-market": [["/zh/database/crops", "查看作物数据"], ["/zh/guides/farming-fields", "查看种地指南"]],
  "city-hall": [["/zh/database/npcs#victor", "查看 Victor"], ["/zh/database/quests#power-to-the-bench", "查看供电任务"], ["/zh/guides/electricity-power#two-paths", "查看水电指南"]],
  subway: [["/zh/problems/fast-travel-subway", "快速旅行排查"], ["/zh/guides/vehicles-transport", "查看交通指南"]],
  "car-pound": [["/zh/problems/vehicle-recovery", "车辆找回"], ["/zh/guides/vehicles-transport", "查看交通指南"]],
  quickfix: [["/zh/problems/vehicle-recovery", "车辆排查"], ["/zh/guides/vehicles-transport", "查看交通指南"]],
  "auto-hue": [["/zh/guides/police-wanted-levels", "查看警星指南"], ["/zh/guides/vehicles-transport", "查看交通指南"]],
  airport: [["/zh/database/crops#cashin", "查看 CashIn"], ["/zh/guides/money-making#cashin", "查看出售流程"]],
  "cash-in-box": [["/zh/database/crops#cashin", "查看 CashIn"], ["/zh/guides/money-making#cashin", "查看赚钱指南"]],
  "bykii-terminal": [["/zh/guides/vehicles-transport", "查看交通指南"], ["/zh/problems/vehicle-recovery", "查看车辆问题"]],
  "train-station": [["/zh/guides/multiplayer-coop", "查看联机指南"]],
};

function renderZhDirectoryEntry(location) {
  const copy = location.locale.zh;
  const marker = location.marker;
  const status = zhEvidenceLabels[location.evidenceLevel] || "证据状态待确认";
  const evidenceClass = zhEvidenceClasses[location.evidenceLevel] || "evidence-reported";
  const links = (zhLocationLinks[location.id] || []).map(([href, label]) => `<a class="card-link" href="${href}">${label} →</a>`).join("");
  const markerButton = marker
    ? `<button type="button" class="location-map-button" data-marker-focus="${escapeHtml(marker.locale.zh.title)}">在地图上定位</button>`
    : "";
  const pinStatus = marker
    ? `<span class="pin-pending">${location.marker.precision === "approximate" ? "大致区域，非精确坐标" : "位置仍需当前截图核对"}</span>`
    : `<span class="pin-pending">暂无可验证的精确标记</span>`;
  const searchTitle = copy.searchTitle || copy.title;
  return `        <article data-location-entry data-search-entry id="${location.id}" data-location-title="${escapeHtml(copy.title)}" data-location-category="${location.category}" data-location-keywords="${escapeHtml(copy.keywords)}" data-search-title="${escapeHtml(searchTitle)}" data-search-tags="${escapeHtml(copy.keywords)}"><div><span class="location-category">${zhCategoryLabels[location.category]}</span><h2>${escapeHtml(copy.title)}</h2><p>${escapeHtml(copy.summary || "该地点已有名称或来源记录，但当前用途仍需进一步核对。")}</p></div><div class="location-use"><strong>证据状态</strong><span class="evidence-badge ${evidenceClass}">${status}</span>${markerButton}${pinStatus}${links}</div></article>`;
}

function replaceGenerated(html, data, locale) {
  const markerOrder = new Map(data.meta.markerOrder.map((id, index) => [id, index]));
  const markers = data.locations.filter((location) => location.marker)
    .sort((a, b) => markerOrder.get(a.id) - markerOrder.get(b.id))
    .map((location) => renderMarker(location, locale)).join("\n");
  const entries = locale === "en"
    ? data.locations.map((location) => renderEntry(location, locale)).join("\n")
    : data.locations.map(renderZhDirectoryEntry).join("\n");
  const markerBody = `\n                <!-- MAP_MARKERS:START -->\n${markers}\n                <!-- MAP_MARKERS:END -->`;
  const entryBody = `\n        <!-- LOCATION_DIRECTORY:START -->\n${entries}\n        <!-- LOCATION_DIRECTORY:END -->`;

  const markerPattern = /(<div class="map-marker-layer"[^>]*>)([\s\S]*?)(\n[ \t]*<\/div>\n[ \t]*<div class="map-pin-layer")/;
  if (!markerPattern.test(html)) throw new Error(`Generated marker section missing in ${locale} map`);
  let output = html.replace(markerPattern, `$1${markerBody}$3`);
  const directoryPattern = /(<div class="location-list">)([\s\S]*?)(\n[ \t]*<\/div>\s*<div class="search-empty")/;
  if (!directoryPattern.test(output)) throw new Error(`Generated ${locale} directory section missing`);
  output = output.replace(directoryPattern, `$1${entryBody}$3`);
  return output;
}

if (process.argv.includes("--bootstrap")) bootstrap();
if (!fs.existsSync(dataPath)) throw new Error("data/locations.json does not exist; run with --bootstrap once");

const data = JSON.parse(read(dataPath));
let failed = false;
for (const locale of ["en", "zh"]) {
  const current = read(pages[locale]);
  const rendered = replaceGenerated(current, data, locale);
  if (process.argv.includes("--check")) {
    if (current !== rendered) {
      console.error(`FAIL: ${path.relative(root, pages[locale])} is out of sync with data/locations.json`);
      failed = true;
    }
  } else {
    fs.writeFileSync(pages[locale], rendered, "utf8");
  }
}

if (failed) process.exit(1);
const markerCount = data.locations.filter((location) => location.marker).length;
console.log(`${process.argv.includes("--check") ? "PASS" : "Wrote"}: bilingual map pages from ${data.locations.length} locations and ${markerCount} markers.`);
