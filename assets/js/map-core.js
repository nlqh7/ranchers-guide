(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RanchersMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function editDistance(left, right) {
    var a = normalize(left);
    var b = normalize(right);
    var rows = Array.from({ length: a.length + 1 }, function () {
      return new Array(b.length + 1).fill(0);
    });
    var i;
    var j;
    for (i = 0; i <= a.length; i += 1) rows[i][0] = i;
    for (j = 0; j <= b.length; j += 1) rows[0][j] = j;
    for (i = 1; i <= a.length; i += 1) {
      for (j = 1; j <= b.length; j += 1) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
        }
      }
    }
    return rows[a.length][b.length];
  }

  function locationScore(location, query) {
    var needle = normalize(query);
    if (!needle) return 1;
    var title = normalize(location.title);
    var id = normalize(location.id);
    var aliases = normalize(location.aliases);
    var haystack = normalize([location.title, location.id, location.category, location.aliases, location.keywords].join(" "));
    if (needle === title || needle === id || (aliases && aliases.split(" ").includes(needle))) return 100;
    if (haystack.indexOf(needle) !== -1) return 70;

    var words = haystack.split(" ").filter(Boolean);
    var tokens = needle.split(" ").filter(Boolean);
    var tokenMatch = tokens.every(function (token) {
      if (haystack.indexOf(token) !== -1) return true;
      if (token.length < 4) return false;
      return words.some(function (word) {
        return Math.abs(word.length - token.length) <= 1 && editDistance(word, token) <= 1;
      });
    });
    return tokenMatch ? 40 : 0;
  }

  function filterLocations(locations, query, category) {
    var selectedCategory = normalize(category || "all");
    return locations.map(function (location, index) {
      var matchesCategory = selectedCategory === "all" || normalize(location.category) === selectedCategory;
      return { location: location, score: matchesCategory ? locationScore(location, query) : 0, index: index };
    }).filter(function (candidate) {
      return candidate.score > 0;
    }).sort(function (left, right) {
      return right.score - left.score || left.index - right.index;
    }).map(function (candidate) {
      return candidate.location;
    });
  }

  function findBestLocation(locations, query, category) {
    return filterLocations(locations, query, category || "all")[0] || null;
  }

  function buildQueryString(query, category) {
    var parts = [];
    var trimmed = String(query || "").trim();
    var selectedCategory = String(category || "all");
    if (trimmed) parts.push("q=" + encodeURIComponent(trimmed));
    if (selectedCategory && selectedCategory !== "all") parts.push("category=" + encodeURIComponent(selectedCategory));
    return parts.length ? "?" + parts.join("&") : "";
  }

  return {
    normalize: normalize,
    filterLocations: filterLocations,
    findBestLocation: findBestLocation,
    buildQueryString: buildQueryString,
  };
});
