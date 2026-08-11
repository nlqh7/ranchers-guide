(function () {
  "use strict";

  var EN_PAGE_PATHS = [
    "/",
    "/guides/release-time-checklist",
    "/guides/beginner-mistakes",
    "/guides/beginners-guide",
    "/guides/money-making",
    "/guides/multiplayer-coop",
    "/guides/animal-guide",
    "/guides/electricity-power",
    "/guides/building-construction",
    "/guides/roof-quest-stuck",
    "/guides/gigi-large-egg-quest",
    "/guides/police-wanted-levels",
    "/guides/controls-camera-settings",
    "/database",
    "/database/crops",
    "/database/animals",
    "/map",
    "/problems",
    "/problems/offline-mode-loading",
    "/problems/friend-session-join",
    "/problems/vehicle-recovery",
    "/problems/fast-travel-subway",
    "/problems/failed-quest-replay",
    "/community",
    "/research",
    "/tools/profit-calculator",
    "/tools/field-notes",
    "/methodology",
    "/about",
    "/contact",
    "/privacy"
  ];
  var ZH_PAGE_PATHS = [
    "/zh/",
    "/zh/guides/beginners-guide",
    "/zh/guides/animal-guide",
    "/zh/guides/gigi-large-egg-quest",
    "/zh/guides/roof-quest-stuck",
    "/zh/guides/money-making",
    "/zh/guides/police-wanted-levels",
    "/zh/problems/vehicle-recovery",
    "/zh/database",
    "/zh/database/crops",
    "/zh/database/animals",
    "/zh/map",
    "/zh/problems"
  ];
  var IS_ZH = document.documentElement.lang.toLowerCase() === "zh-cn";
  var PAGE_PATHS = IS_ZH ? ZH_PAGE_PATHS : EN_PAGE_PATHS;
  var SEARCH_ROUTE = IS_ZH ? "/zh/search" : "/search";
  var CACHE_KEY = IS_ZH ? "ranchers-search-index-zh-v3" : "ranchers-search-index-v17";
  var documents = [];
  var form = document.querySelector("[data-search-form]");
  var input = document.querySelector("[data-search-input]");
  var clearButton = document.querySelector("[data-search-clear]");
  var results = document.querySelector("[data-search-results]");
  var status = document.querySelector("[data-search-status]");
  var suggestions = document.querySelectorAll("[data-search-suggestion]");

  function cleanTitle(title) {
    return String(title || "").replace(/\s*[|—]\s*(?:The Ranchers Guide|牧场主指南)\s*$/i, "").trim();
  }

  function pageType(path) {
    if (path.indexOf("/zh/") === 0) {
      if (path.indexOf("/zh/guides/") === 0) return "攻略";
      if (path === "/zh/database") return "知识库";
      if (path.indexOf("/zh/database/") === 0) return "数据库";
      if (path === "/zh/map") return "地图";
      if (path === "/zh/problems") return "问题排查";
      if (path === "/zh/") return "首页";
      return "站点";
    }
    if (path.indexOf("/guides/") === 0) return "Guide";
    if (path === "/database") return "Knowledge Base";
    if (path.indexOf("/database/") === 0) return "Database";
    if (path === "/map") return "Map";
    if (path.indexOf("/problems/") === 0 || path === "/problems") return "Problem";
    if (path === "/community") return "Community";
    if (path === "/research") return "Research";
    if (path.indexOf("/tools/") === 0) return "Tool";
    if (path === "/") return "Home";
    return "Site";
  }

  function extractDocument(html, path) {
    var parsed = new DOMParser().parseFromString(html, "text/html");
    var main = parsed.querySelector("main");
    var description = parsed.querySelector('meta[name="description"]');
    var sections = [];
    var seen = new Set();
    var heading = IS_ZH ? "概览" : "Overview";
    var headingId = "";
    var entries = [];

    parsed.querySelectorAll("[data-search-entry][id]").forEach(function (node) {
      var entryHeading = node.querySelector("h2, h3");
      entries.push({
        id: node.id,
        title: node.dataset.searchTitle || (entryHeading ? entryHeading.textContent.trim() : (node.cells && node.cells[0] ? node.cells[0].textContent.trim() : node.id)),
        text: node.cells
          ? Array.from(node.cells).map(function (cell) { return cell.textContent.replace(/\s+/g, " ").trim(); }).join(" · ")
          : node.textContent.replace(/\s+/g, " ").trim(),
        tags: node.dataset.searchTags || "",
        status: node.dataset.searchStatus || (IS_ZH ? "社区资料" : "Community data")
      });
    });

    if (main) {
      main.querySelectorAll("form, script, style, noscript, .ad-slot, .field-note-list, [data-search-entry]").forEach(function (node) {
        node.remove();
      });
      main.querySelectorAll("h1, h2, h3, p, li, summary, th, td").forEach(function (node) {
        var text = node.textContent.replace(/\s+/g, " ").trim();
        if (/^H[1-3]$/.test(node.tagName)) {
          heading = text || heading;
          if (node.id) headingId = node.id;
          else if (node.tagName !== "H3") headingId = "";
          return;
        }
        if (text.length < 18 || seen.has(text)) return;
        seen.add(text);
        sections.push({ id: headingId, heading: heading, text: text.slice(0, 520) });
      });
    }

    return {
      title: cleanTitle(parsed.title),
      url: path,
      type: pageType(path),
      sectionAnswers: ["/", "/database", "/problems", "/research"].indexOf(path) === -1,
      description: description ? description.content : "",
      sections: sections,
      entries: entries
    };
  }

  function loadCachedIndex() {
    try {
      var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      return Array.isArray(cached) && cached.length >= PAGE_PATHS.length ? cached : null;
    } catch (_) {
      return null;
    }
  }

  function loadIndex() {
    var cached = loadCachedIndex();
    if (cached) return Promise.resolve(cached);

    function buildLiveIndex() {
      return Promise.all(PAGE_PATHS.map(function (path) {
        return fetch(path, { credentials: "same-origin" }).then(function (response) {
          if (!response.ok) throw new Error(path + " returned " + response.status);
          return response.text();
        }).then(function (html) {
          return extractDocument(html, path);
        });
      })).then(function (pages) {
        return pages.reduce(function (all, page) {
          return all.concat(RanchersSearch.expandEntryDocuments(page));
        }, []);
      });
    }

    /* Prefer the prebuilt index (scripts/build-search-index.cjs); fall back to live fetching. */
    var indexPath = IS_ZH ? "/zh/search-index.json" : "/search-index.json";
    return fetch(indexPath, { credentials: "same-origin" }).then(function (response) {
      if (!response.ok) throw new Error(indexPath + " returned " + response.status);
      return response.json();
    }).then(function (index) {
      if (!Array.isArray(index) || index.length < PAGE_PATHS.length) throw new Error("search-index.json is incomplete");
      return index;
    }).catch(function () {
      return buildLiveIndex();
    }).then(function (index) {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(index)); } catch (_) { /* Search still works without cache. */ }
      return index;
    });
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function syncClearButton() {
    if (clearButton) clearButton.hidden = !input.value.trim();
  }

  function resultElement(item) {
    var article = document.createElement("article");
    article.className = "search-result";

    var meta = document.createElement("p");
    meta.className = "search-result-type";
    meta.textContent = item.parentTitle ? item.type + " · " + item.parentTitle : item.type;

    var heading = document.createElement("h2");
    var link = document.createElement("a");
    link.href = item.url;
    link.textContent = item.title;
    heading.appendChild(link);

    var snippet = document.createElement("p");
    snippet.className = "search-result-snippet";
    snippet.textContent = item.snippet;

    var path = document.createElement("span");
    path.className = "search-result-path";
    path.textContent = item.url.indexOf("#") === -1 ? (IS_ZH ? "打开页面" : "Open page") : (IS_ZH ? "直达答案" : "Jump to answer");

    article.append(meta, heading, snippet, path);
    return article;
  }

  function render(query, updateUrl) {
    var trimmed = query.trim();
    results.replaceChildren();
    if (!trimmed) {
      setStatus(IS_ZH ? "输入物品、任务、地点或问题。" : "Enter a topic to search the guide.");
      if (updateUrl) history.replaceState(null, "", SEARCH_ROUTE);
      return;
    }

    var matches = RanchersSearch.searchDocuments(documents, trimmed, 12);
    setStatus(IS_ZH ? matches.length + " 条结果" : (matches.length === 1 ? "1 result" : matches.length + " results"));
    matches.forEach(function (item) { results.appendChild(resultElement(item)); });

    if (!matches.length) {
      var empty = document.createElement("div");
      empty.className = "search-empty";
      empty.innerHTML = IS_ZH
        ? '<h2>暂时没有匹配答案</h2><p>试试只输入物品名或任务名，也可以<a href="/zh/database">浏览知识库</a>。</p>'
        : '<h2>No matching answer yet</h2><p>Try the item or quest name on its own, <a href="/database">browse the knowledge base</a>, or <a href="/contribute">send the missing question</a>.</p>';
      results.appendChild(empty);
    }
    if (updateUrl) history.replaceState(null, "", SEARCH_ROUTE + "?q=" + encodeURIComponent(trimmed));
  }

  function runSearch(query, updateUrl) {
    if (!documents.length) return;
    render(query, updateUrl);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    runSearch(input.value, true);
  });

  var timer;
  input.addEventListener("input", function () {
    syncClearButton();
    clearTimeout(timer);
    timer = setTimeout(function () { runSearch(input.value, true); }, 120);
  });

  if (clearButton) {
    clearButton.addEventListener("click", function () {
      input.value = "";
      syncClearButton();
      runSearch("", true);
      input.focus();
    });
  }

  suggestions.forEach(function (button) {
    button.addEventListener("click", function () {
      input.value = button.dataset.searchSuggestion;
      input.focus();
      runSearch(input.value, true);
    });
  });

  setStatus(IS_ZH ? "正在加载中文索引..." : "Loading guide index...");
  loadIndex().then(function (index) {
    documents = index;
    var initial = new URLSearchParams(location.search).get("q") || "";
    input.value = initial;
    syncClearButton();
    render(initial, false);
  }).catch(function () {
    setStatus(IS_ZH ? "搜索索引加载失败，请刷新后重试。" : "Search could not load. Refresh the page and try again.");
  });
})();
