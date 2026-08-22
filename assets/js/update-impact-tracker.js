(function () {
  var root = document.querySelector("[data-update-impact-tracker]");
  if (!root) return;

  var isZh = document.documentElement.lang.toLowerCase().indexOf("zh") === 0;
  var select = root.querySelector("[data-update-select]");
  var status = root.querySelector("[data-update-status]");
  var list = root.querySelector("[data-update-list]");
  var storageKey = "ranchers-guide-update-impact-selection-v1";
  var updates = [];

  function text(value) {
    return typeof value === "object" ? (isZh ? value.zh : value.en) : value;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readSelection() {
    try { return localStorage.getItem(storageKey); } catch (error) { return null; }
  }

  function saveSelection(id) {
    try { localStorage.setItem(storageKey, id); } catch (error) { /* private browsing may block storage */ }
  }

  function routeFor(action) {
    return isZh ? action.routeZh : action.route;
  }

  function statusLabel(value) {
    var labels = {
      current: { en: "Current", zh: "当前" },
      historical: { en: "Historical", zh: "历史" },
      editorial: { en: "Editorial context", zh: "编辑整理" }
    };
    return text(labels[value] || labels.editorial);
  }

  function render(update) {
    var changes = update.changes.map(function (item) { return "<li>" + escapeHtml(text(item)) + "</li>"; }).join("");
    var affectedRoutes = (update.affectedRoutes || []).map(function (item) {
      return '<li><a href="' + escapeHtml(routeFor(item)) + '">' + escapeHtml(text(item)) + "</a></li>";
    }).join("");
    var actions = update.actions.map(function (action) {
      return '<a class="btn btn-outline btn-compact" href="' + escapeHtml(routeFor(action)) + '">' + escapeHtml(text(action)) + "</a>";
    }).join("");
    var sourceLabel = isZh ? update.source.labelZh : update.source.label;
    list.innerHTML = '<article class="quest-tracker-card update-impact-card">' +
      '<div class="quest-tracker-card-head"><div><span class="kicker">' + escapeHtml(update.version) + '</span><h2>' + escapeHtml(text(update.title)) + '</h2></div><span class="quest-tracker-progress">' + escapeHtml(statusLabel(update.status)) + '</span></div>' +
      '<p class="quest-tracker-summary">' + escapeHtml(text(update.summary)) + '</p>' +
      '<div class="quest-tracker-relations"><div><strong>' + (isZh ? "日期" : "Date") + '</strong> <span>' + escapeHtml(update.dateLabel) + '</span></div><div><strong>' + (isZh ? "来源" : "Source") + '</strong> <a class="quest-tracker-link" href="' + escapeHtml(update.source.url) + '" rel="noopener noreferrer">' + escapeHtml(sourceLabel) + '</a></div></div>' +
      '<div class="answer-box"><h3>' + (isZh ? "这次改了什么" : "What changed") + '</h3><ul>' + changes + '</ul></div>' +
      '<div class="answer-box"><h3>' + (isZh ? "受影响的页面" : "Affected pages") + '</h3><ul class="plain-steps">' + affectedRoutes + '</ul></div>' +
      '<div class="quest-tracker-card-foot"><div class="quest-tracker-related"><strong>' + (isZh ? "现在去哪里" : "What to check next") + '</strong><div>' + actions + '</div></div></div>' +
      '</article>';
    status.textContent = (isZh ? "显示版本：" : "Showing version: ") + update.version;
  }

  function populate(data) {
    updates = data.updates || [];
    var saved = readSelection();
    var selected = updates.some(function (update) { return update.id === saved; }) ? saved : updates[0].id;
    select.innerHTML = updates.map(function (update) {
      return '<option value="' + escapeHtml(update.id) + '">' + escapeHtml(update.version + " — " + text(update.title)) + '</option>';
    }).join("");
    select.value = selected;
    render(updates.find(function (update) { return update.id === selected; }));
    select.addEventListener("change", function () {
      saveSelection(select.value);
      render(updates.find(function (update) { return update.id === select.value; }));
    });
  }

  fetch("/data/updates.json")
    .then(function (response) { if (!response.ok) throw new Error("updates data unavailable"); return response.json(); })
    .then(populate)
    .catch(function () {
      status.textContent = isZh ? "更新数据暂时无法读取，请直接查看更新中心。" : "Update data is unavailable. Open the Updates hub for the current notes.";
      list.innerHTML = '<p class="notice warning"><a href="' + (isZh ? "/zh/updates" : "/updates") + '">' + (isZh ? "返回更新中心" : "Return to the Updates hub") + '</a></p>';
    });
}());
