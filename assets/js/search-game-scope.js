/* Search scope is derived from site routes, not item names or translated labels. */
(function (root) {
  "use strict";
  function normalize(value) {
    return value === "fs25" || value === "ranchers" ? value : "all";
  }
  function gameForUrl(value) {
    var url;
    try { url = new URL(value, "https://theranchersguide.com"); } catch (_) { return null; }
    if (!["theranchersguide.com", "www.theranchersguide.com"].includes(url.hostname)) return null;
    if (/^\/(?:zh\/)?games\/fs25(?:\/|$)/.test(url.pathname)) return "fs25";
    if (/^\/(?:zh\/)?games\//.test(url.pathname)) return null;
    return "ranchers";
  }
  function filterDocuments(documents, game) {
    game = normalize(game);
    return game === "all" ? documents.slice() : documents.filter(function (item) { return gameForUrl(item.url) === game; });
  }
  function searchUrl(route, query, game) {
    var parts = [];
    query = String(query || "").trim();
    game = normalize(game);
    if (query) parts.push("q=" + encodeURIComponent(query));
    if (game !== "all") parts.push("game=" + game);
    return route + (parts.length ? "?" + parts.join("&") : "");
  }
  var api = { normalize: normalize, gameForUrl: gameForUrl, filterDocuments: filterDocuments, searchUrl: searchUrl,
    allowsDossier: function (game) { return normalize(game) !== "fs25"; } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.RanchersSearchScope = api;
})(typeof window !== "undefined" ? window : null);
