/* The Ranchers Guide — Profit Calculator
   Compare crops & livestock by profit-per-day. All values are user-entered. */
(function () {
  "use strict";

  var form = document.getElementById("calc-form");
  var resultsEl = document.getElementById("calc-results");
  if (!form || !resultsEl) return;

  var STORAGE_KEY = "ranchers-calc-entries-v1";
  var entries = [];
  var editingIndex = -1;
  var removedEntries = null;
  var undoBox = document.createElement("div");
  var undoStatus = document.createElement("p");
  undoStatus.setAttribute("role", "status");
  var undoButton = document.createElement("button");
  undoButton.type = "button";
  undoButton.className = "btn btn-outline";
  undoButton.textContent = "Undo removal";
  undoButton.hidden = true;
  undoBox.appendChild(undoStatus);
  undoBox.appendChild(undoButton);
  resultsEl.insertAdjacentElement("beforebegin", undoBox);
  function rememberRemoval() {
    removedEntries = entries.slice();
    undoStatus.textContent = "Entries removed. You can undo this until your next change or page reload.";
    undoButton.hidden = false;
  }
  undoButton.addEventListener("click", function () {
    if (!removedEntries) return;
    entries = removedEntries;
    removedEntries = null;
    resetEditor();
    save(); render();
    undoButton.hidden = true;
    undoStatus.textContent = "Entries restored.";
    form.name.focus();
  });
  var submitButton = form.querySelector('[type="submit"]');
  var cancelEdit = document.createElement("button");
  cancelEdit.type = "button";
  cancelEdit.className = "btn btn-outline";
  cancelEdit.style.marginTop = "8px";
  cancelEdit.textContent = "Cancel editing";
  cancelEdit.hidden = true;
  submitButton.insertAdjacentElement("afterend", cancelEdit);

  function resetEditor() {
    editingIndex = -1;
    form.reset();
    form.units.value = 1;
    submitButton.textContent = "Add & Rank";
    cancelEdit.hidden = true;
    typeFields();
  }
  cancelEdit.addEventListener("click", function () {
    resetEditor();
    form.name.focus();
  });

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) entries = JSON.parse(raw) || [];
    } catch (e) { entries = []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch (e) {}
  }

  function fmt(n) {
    if (!isFinite(n)) return "—";
    var rounded = Math.round(n * 100) / 100;
    return rounded.toLocaleString("en-US", { maximumFractionDigits: 2 }) + "C";
  }

  /* Compute profit-per-day for one entry.
     crop:    (sellPrice*yield - seedCost) / growthDays
     animal:  (productPrice * productsPerCycle - feedCostPerCycle) / cycleDays
     Both then scaled by plotCount / animalCount. */
  function compute(e) {
    if (e.type === "crop") {
      var grow = Math.max(1, e.growthDays);
      var perPlot = e.sellPrice * e.yieldAmount - e.seedCost;
      var perDay = (perPlot / grow) * e.units;
      return { perDay: perDay, cycleProfit: perPlot * e.units, cycleDays: grow };
    }
    var cycle = Math.max(1, e.cycleDays);
    var perCycle = e.sellPrice * e.yieldAmount - e.seedCost; // seedCost reused as feed cost per cycle
    return { perDay: (perCycle / cycle) * e.units, cycleProfit: perCycle * e.units, cycleDays: cycle };
  }

  function typeFields() {
    var isCrop = form.type.value === "crop";
    document.querySelectorAll("[data-when]").forEach(function (el) {
      var active = el.getAttribute("data-when") === form.type.value;
      el.style.display = active ? "" : "none";
      el.querySelectorAll("input, select, textarea").forEach(function (field) { field.disabled = !active; });
    });
    document.getElementById("seed-label").textContent = isCrop
      ? "Seed cost (per plot)"
      : "Feed / upkeep cost (per cycle)";
    document.getElementById("sell-label").textContent = isCrop
      ? "Sell price (per item)"
      : "Product sell price (per item)";
    document.getElementById("yield-label").textContent = isCrop
      ? "Harvest yield (items per plot)"
      : "Products per cycle (per animal)";
    document.getElementById("units-label").textContent = isCrop
      ? "Number of plots"
      : "Number of animals";
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    if (!entries.length) {
      resultsEl.innerHTML =
        '<div class="calc-empty"><div class="big"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21V9"/><path d="M12 9C12 6 10 4 7.5 4 7.5 6.5 9.5 9 12 9z"/><path d="M12 9c0-3 2-5 4.5-5C16.5 6.5 14.5 9 12 9z"/><path d="M12 14c-2.8 0-5-2-5-4.8C9.8 9.2 12 11.2 12 14z"/><path d="M12 14c2.8 0 5-2 5-4.8C14.2 9.2 12 11.2 12 14z"/><path d="M12 19c-2.8 0-5-2-5-4.8C9.8 14.2 12 16.2 12 19z"/><path d="M12 19c2.8 0 5-2 5-4.8C14.2 14.2 12 16.2 12 19z"/></svg></div>' +
        "<p>Add your first crop or animal on the left.<br>Entries are ranked by profit per in-game day.</p></div>";
      return;
    }
    var ranked = entries.map(function (e, i) {
      return { e: e, i: i, r: compute(e) };
    }).sort(function (a, b) { return b.r.perDay - a.r.perDay; });

    var max = Math.max.apply(null, ranked.map(function (x) { return Math.max(0, x.r.perDay); })) || 1;

    var html = ranked.map(function (x, idx) {
      var e = x.e, r = x.r;
      var top = idx === 0 ? " top1" : "";
      var width = Math.max(2, Math.round((Math.max(0, r.perDay) / max) * 100));
      var neg = r.perDay < 0 ? " neg" : "";
      var sub = e.type === "crop"
        ? "Crop · " + e.growthDays + "d grow · " + e.units + " plot" + (e.units > 1 ? "s" : "")
        : "Animal · " + e.cycleDays + "d cycle · " + e.units + " animal" + (e.units > 1 ? "s" : "");
      return (
        '<div class="result-card' + top + '">' +
          '<div class="result-rank">#' + (idx + 1) + "</div>" +
          '<div class="result-main">' +
            '<div class="rname">' + esc(e.name) + "</div>" +
            '<div class="rsub">' + sub + " · cycle profit " + fmt(r.cycleProfit) + "</div>" +
          "</div>" +
          '<div class="result-profit">' +
            '<div class="rval' + neg + '">' + fmt(r.perDay) + "</div>" +
            '<div class="rlabel">per day</div>' +
          "</div>" +
          '<div class="result-bar"><div style="width:' + width + '%"></div></div>' +
          '<div class="result-actions">' +
            '<button type="button" class="icon-btn" data-edit="' + x.i + '" aria-label="Edit ' + esc(e.name) + '">Edit</button>' +
            '<button class="icon-btn" data-del="' + x.i + '" title="Remove">✕ remove</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");

    resultsEl.innerHTML = html;
    resultsEl.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        editingIndex = parseInt(btn.getAttribute("data-edit"), 10);
        var entry = entries[editingIndex];
        Object.keys(entry).forEach(function (key) {
          var field = form.elements.namedItem(key);
          if (field) field.value = entry[key];
        });
        typeFields();
        submitButton.textContent = "Save changes & Rank";
        cancelEdit.hidden = false;
        form.name.focus();
      });
    });
    resultsEl.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        rememberRemoval();
        entries.splice(parseInt(btn.getAttribute("data-del"), 10), 1);
        if (editingIndex !== -1) resetEditor();
        save(); render();
      });
    });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var isCrop = form.type.value === "crop";
    var entry = {
      type: form.type.value,
      name: form.name.value.trim() || (isCrop ? "Unnamed crop" : "Unnamed animal"),
      sellPrice: parseFloat(form.sellPrice.value) || 0,
      yieldAmount: parseFloat(form.yieldAmount.value) || 0,
      seedCost: parseFloat(form.seedCost.value) || 0,
      units: Math.max(1, parseInt(form.units.value, 10) || 1),
      growthDays: isCrop ? Math.max(1, parseInt(form.growthDays.value, 10) || 1) : 0,
      cycleDays: isCrop ? 0 : Math.max(1, parseInt(form.cycleDays.value, 10) || 1)
    };
    removedEntries = null;
    undoButton.hidden = true;
    undoStatus.textContent = "";
    if (editingIndex === -1) entries.push(entry);
    else entries[editingIndex] = entry;
    save(); render();
    resetEditor();
  });

  form.type.addEventListener("change", typeFields);

  var clearBtn = document.getElementById("calc-clear");
  if (clearBtn) clearBtn.addEventListener("click", function () {
    if (!entries.length) return;
    rememberRemoval();
    entries = []; resetEditor(); save(); render();
  });

  load(); typeFields(); render();
})();
