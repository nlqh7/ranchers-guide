/* The Ranchers Guide — database tables: client-side search, filter & sort */
(function () {
  "use strict";

  function initDataTable(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var tbody = table.querySelector("tbody");
    var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
    var search = document.querySelector('[data-table-search="' + tableId + '"]');
    var filter = document.querySelector('[data-table-filter="' + tableId + '"]');
    var countEl = document.querySelector('[data-table-count="' + tableId + '"]');
    var sortState = { col: -1, dir: 1 };
    var params = new URLSearchParams(window.location.search);
    var initialQuery = params.get("q");
    var chinese = document.documentElement.lang.toLowerCase().indexOf("zh") === 0;
    var reset = null;
    if (search || filter) {
      reset = document.createElement("button");
      reset.type = "button";
      reset.className = "btn btn-outline";
      reset.textContent = chinese ? "清除筛选" : "Clear filters";
      (filter || search).insertAdjacentElement("afterend", reset);
      reset.addEventListener("click", function () {
        if (search) search.value = "";
        if (filter) filter.value = "";
        var url = new URL(window.location.href);
        url.searchParams.delete("q");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
        applyView();
        (search || filter).focus();
      });
    }

    if (search && initialQuery) search.value = initialQuery;

    function applyView() {
      var q = search ? search.value.trim().toLowerCase() : "";
      var f = filter ? filter.value : "";
      var visible = 0;
      rows.forEach(function (row) {
        var text = row.textContent.toLowerCase();
        var okQ = !q || text.indexOf(q) !== -1;
        var rowFilter = row.getAttribute("data-season") || row.getAttribute("data-category") || "";
        var okF = !f || rowFilter === f || (!rowFilter && text.indexOf(f.toLowerCase()) !== -1);
        var show = okQ && okF;
        row.style.display = show ? "" : "none";
        if (show) visible++;
      });
      if (countEl) {
        countEl.setAttribute("role", "status");
        countEl.textContent = visible ? visible + (chinese ? " 条记录" : " entries") : (chinese ? "没有匹配记录，请修改关键词或清除筛选。" : "No matching entries. Change your search or clear filters.");
      }
      if (reset) reset.hidden = !q && !f;
    }

    function cellVal(row, i) {
      var cell = row.children[i];
      var v = cell.getAttribute("data-sort");
      if (v !== null) return parseFloat(v);
      var t = cell.textContent.trim();
      var n = parseFloat(t.replace(/[^0-9.\-]/g, ""));
      return isNaN(n) ? t.toLowerCase() : n;
    }

    function sortBy(colIdx) {
      if (sortState.col === colIdx) sortState.dir *= -1;
      else { sortState.col = colIdx; sortState.dir = 1; }
      rows.sort(function (a, b) {
        var va = cellVal(a, colIdx), vb = cellVal(b, colIdx);
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * sortState.dir;
        return String(va).localeCompare(String(vb)) * sortState.dir;
      });
      rows.forEach(function (r) { tbody.appendChild(r); });
      table.querySelectorAll("th").forEach(function (th, i) {
        th.classList.toggle("sorted-asc", i === colIdx && sortState.dir === 1);
        th.classList.toggle("sorted-desc", i === colIdx && sortState.dir === -1);
      });
      applyView();
    }

    table.querySelectorAll("th[data-sortable]").forEach(function (th, i) {
      th.addEventListener("click", function () { sortBy(i); });
      th.setAttribute("title", "Click to sort");
    });

    if (search) search.addEventListener("input", applyView);
    if (filter) filter.addEventListener("change", applyView);
    applyView();
  }

  initDataTable("crops-table");
  initDataTable("animals-table");
  initDataTable("crop-records-table");
  initDataTable("animal-records-table");
})();
