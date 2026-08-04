(function () {
  "use strict";

  var search = document.querySelector("[data-problem-search]");
  var filter = document.querySelector("[data-problem-filter]");
  var entries = Array.from(document.querySelectorAll("[data-problem-entry]"));
  var count = document.querySelector("[data-problem-count]");
  var empty = document.querySelector("[data-problem-empty]");
  if (!search || !filter || !entries.length) return;

  var activeStatus = "all";

  function normalize(value) {
    return String(value || "").toLowerCase().trim();
  }

  function render() {
    var query = normalize(search.value);
    var visibleCount = 0;

    entries.forEach(function (entry) {
      var statusMatch = activeStatus === "all" || entry.dataset.problemStatus === activeStatus;
      var haystack = normalize(entry.textContent + " " + (entry.dataset.problemKeywords || ""));
      var queryMatch = !query || query.split(/\s+/).every(function (term) { return haystack.indexOf(term) !== -1; });
      var visible = statusMatch && queryMatch;
      entry.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    count.textContent = visibleCount === 1 ? "1 result" : visibleCount + " results";
    empty.hidden = visibleCount !== 0;
  }

  search.addEventListener("input", render);
  filter.addEventListener("click", function (event) {
    var button = event.target.closest("[data-problem-filter-value]");
    if (!button) return;
    activeStatus = button.dataset.problemFilterValue;
    filter.querySelectorAll("[data-problem-filter-value]").forEach(function (item) {
      var active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", active ? "true" : "false");
    });
    render();
  });

  render();
})();
