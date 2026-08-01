(function () {
  "use strict";

  var PAGE_PATHS = [
    "/",
    "/guides/release-time-checklist",
    "/guides/beginner-mistakes",
    "/guides/beginners-guide",
    "/guides/money-making",
    "/guides/money-making-guide",
    "/guides/multiplayer-coop",
    "/guides/animal-guide",
    "/database/crops",
    "/database/animals",
    "/tools/profit-calculator",
    "/tools/field-notes",
    "/about",
    "/contact",
    "/privacy"
  ];
  var CACHE_KEY = "ranchers-search-index-v1";
  var documents = [];
  var form = document.querySelector("[data-search-form]");
  var input = document.querySelector("[data-search-input]");
  var results = document.querySelector("[data-search-results]");
  var status = document.querySelector("[data-search-status]");
  var suggestions = document.querySelectorAll("[data-search-suggestion]");

  function cleanTitle(title) {
    return String(title || "").replace(/\s*[|—]\s*The Ranchers Guide\s*$/i, "").trim();
  }

  function pageType(path) {
    if (path.indexOf("/guides/") === 0) return "Guide";
    if (path.indexOf("/database/") === 0) return "Database";
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
    var heading = "Overview";

    if (main) {
      main.querySelectorAll("form, script, style, noscript, .ad-slot, .field-note-list").forEach(function (node) {
        node.remove();
      });
      main.querySelectorAll("h1, h2, h3, p, li, summary, th, td").forEach(function (node) {
        var text = node.textContent.replace(/\s+/g, " ").trim();
        if (/^H[1-3]$/.test(node.tagName)) {
          heading = text || heading;
          return;
        }
        if (text.length < 18 || seen.has(text)) return;
        seen.add(text);
        sections.push({ heading: heading, text: text.slice(0, 520) });
      });
    }

    return {
      title: cleanTitle(parsed.title),
      url: path,
      type: pageType(path),
      description: description ? description.content : "",
      sections: sections
    };
  }

  function loadCachedIndex() {
    try {
      var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      return Array.isArray(cached) && cached.length === PAGE_PATHS.length ? cached : null;
    } catch (_) {
      return null;
    }
  }

  function loadIndex() {
    var cached = loadCachedIndex();
    if (cached) return Promise.resolve(cached);

    return Promise.all(PAGE_PATHS.map(function (path) {
      return fetch(path, { credentials: "same-origin" }).then(function (response) {
        if (!response.ok) throw new Error(path + " returned " + response.status);
        return response.text();
      }).then(function (html) {
        return extractDocument(html, path);
      });
    })).then(function (index) {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(index)); } catch (_) { /* Search still works without cache. */ }
      return index;
    });
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function resultElement(item) {
    var article = document.createElement("article");
    article.className = "search-result";

    var meta = document.createElement("p");
    meta.className = "search-result-type";
    meta.textContent = item.type;

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
    path.textContent = item.url;

    article.append(meta, heading, snippet, path);
    return article;
  }

  function render(query, updateUrl) {
    var trimmed = query.trim();
    results.replaceChildren();
    if (!trimmed) {
      setStatus("Enter a topic to search the guide.");
      if (updateUrl) history.replaceState(null, "", "/search");
      return;
    }

    var matches = RanchersSearch.searchDocuments(documents, trimmed, 12);
    setStatus(matches.length === 1 ? "1 result" : matches.length + " results");
    matches.forEach(function (item) { results.appendChild(resultElement(item)); });

    if (!matches.length) {
      var empty = document.createElement("div");
      empty.className = "search-empty";
      empty.innerHTML = "<h2>No matching guide yet</h2><p>Try a shorter term or check the spelling.</p>";
      results.appendChild(empty);
    }
    if (updateUrl) history.replaceState(null, "", "/search?q=" + encodeURIComponent(trimmed));
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
    clearTimeout(timer);
    timer = setTimeout(function () { runSearch(input.value, true); }, 120);
  });

  suggestions.forEach(function (button) {
    button.addEventListener("click", function () {
      input.value = button.dataset.searchSuggestion;
      input.focus();
      runSearch(input.value, true);
    });
  });

  setStatus("Loading guide index...");
  loadIndex().then(function (index) {
    documents = index;
    var initial = new URLSearchParams(location.search).get("q") || "";
    input.value = initial;
    render(initial, false);
  }).catch(function () {
    setStatus("Search could not load. Refresh the page and try again.");
  });
})();
