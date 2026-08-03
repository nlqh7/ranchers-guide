(function () {
  "use strict";

  var search = document.querySelector("[data-location-search]");
  var category = document.querySelector("[data-location-category]");
  var entries = Array.from(document.querySelectorAll("[data-location-entry]"));
  var count = document.querySelector("[data-location-count]");
  var empty = document.querySelector("[data-location-empty]");
  if (!search || !category || !entries.length || !window.RanchersMap) return;

  var locations = entries.map(function (entry) {
    return {
      element: entry,
      title: entry.dataset.locationTitle,
      category: entry.dataset.locationCategory,
      keywords: entry.dataset.locationKeywords,
    };
  });

  function render() {
    var matches = window.RanchersMap.filterLocations(locations, search.value, category.value);
    var visible = new Set(matches.map(function (item) { return item.element; }));
    entries.forEach(function (entry) { entry.hidden = !visible.has(entry); });
    count.textContent = matches.length === 1 ? "1 location" : matches.length + " locations";
    empty.hidden = matches.length !== 0;
  }

  search.addEventListener("input", render);
  category.addEventListener("change", render);
  render();
})();
