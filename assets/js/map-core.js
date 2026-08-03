(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RanchersMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function filterLocations(locations, query, category) {
    var needle = normalize(query);
    var selectedCategory = normalize(category || "all");

    return locations.filter(function (location) {
      var matchesCategory = selectedCategory === "all" || normalize(location.category) === selectedCategory;
      var haystack = normalize([location.title, location.category, location.keywords].join(" "));
      return matchesCategory && (!needle || haystack.indexOf(needle) !== -1);
    });
  }

  return { filterLocations: filterLocations };
});
