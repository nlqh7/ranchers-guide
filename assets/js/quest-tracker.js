(function () {
  "use strict";

  var root = document.querySelector("[data-quest-tracker]");
  if (!root) return;

  var list = root.querySelector("[data-quest-list]");
  var status = root.querySelector("[data-quest-status]");
  var isChinese = document.documentElement.lang.toLowerCase() === "zh-cn";
  var storageKey = "ranchers-guide-quest-tracker-v1";
  var state = {};

  try { state = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (_) { state = {}; }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) { /* Private mode still keeps the page usable. */ }
  }

  function displayEvidence(fact) {
    var level = fact.evidenceLevel || "unverified-lead";
    var labels = isChinese
      ? { official: "官方", "video-observed": "视频观测", "community-confirmed": "社区互证", "player-tested": "玩家实测", "unverified-lead": "未验证线索" }
      : { official: "Official", "video-observed": "Video-observed", "community-confirmed": "Community-confirmed", "player-tested": "Player-tested", "unverified-lead": "Unverified lead" };
    return '<span class="tag evidence-' + escapeHtml(level.replace(/[^a-z-]/g, "")) + '">' + escapeHtml(labels[level] || level) + "</span>";
  }

  function isPending(fact) {
    return fact.validity === "unknown" || fact.evidenceLevel === "unverified-lead";
  }

  function routeLabel(route) {
    var labels = isChinese ? {
      "/problems/vehicle-recovery": "车辆找回",
      "/guides/electricity-power": "电力攻略",
      "/guides/animal-guide": "动物攻略",
      "/tools/chicken-troubleshooter": "鸡排查器",
      "/guides/roof-quest-stuck": "屋顶任务排查",
      "/guides/building-construction": "建造攻略",
      "/problems/failed-quest-replay": "任务恢复",
      "/guides/gigi-large-egg-quest": "大鸡蛋任务",
      "/guides/police-wanted-levels": "警星攻略"
    } : {
      "/problems/vehicle-recovery": "Vehicle recovery",
      "/guides/electricity-power": "Electricity guide",
      "/guides/animal-guide": "Animal guide",
      "/tools/chicken-troubleshooter": "Chicken troubleshooter",
      "/guides/roof-quest-stuck": "Roof quest recovery",
      "/guides/building-construction": "Building guide",
      "/problems/failed-quest-replay": "Failed quest recovery",
      "/guides/gigi-large-egg-quest": "Large-egg quest",
      "/guides/police-wanted-levels": "Wanted-level guide"
    };
    var base = route.split("#")[0];
    return labels[base] || (isChinese ? "关联页面" : "Related page");
  }

  function localizedRoute(route) {
    if (!isChinese || route.indexOf("/zh/") === 0 || route.indexOf("http") === 0) return route;
    return "/zh" + route;
  }

  function relationLinks(record) {
    var relations = (record.relations || []).map(function (relation) {
      var target = relation.target || {};
      var prefix = target.type === "location" ? "/map#" : "/database/" + (target.type === "npc" ? "npcs#" : "quests#");
      var label = target.type === "location" ? (target.id === "city-hall" ? (isChinese ? "市政厅" : "City Hall") : target.id) : target.id;
      if (target.type === "npc" && target.id === "victor") label = "Victor";
      if (target.type === "npc" && target.id === "angela") label = "Angela";
      if (target.type === "npc" && target.id === "gigi") label = "Gigi";
      return '<a class="quest-tracker-link" href="' + escapeHtml(localizedRoute(prefix + target.id)) + '">' + escapeHtml(label) + "</a>";
    });
    return relations.length ? '<div class="quest-tracker-relations"><strong>' + (isChinese ? "关联实体" : "Connected entities") + "</strong><div>" + relations.join("") + "</div></div>" : "";
  }

  function renderRecord(record) {
    var facts = Array.isArray(record.facts) ? record.facts : [];
    var name = isChinese ? record.zhName : record.name;
    var summary = isChinese ? record.zhSummary : record.summary;
    var titleKey = escapeHtml(record.id);
    var factHtml = facts.map(function (fact, index) {
      var key = record.id + "::" + index;
      var text = isChinese ? fact.zhText : fact.text;
      var pending = isPending(fact);
      var prefix = pending ? (isChinese ? "待验证：" : "TBD: ") : "";
      return '<li class="quest-tracker-item' + (pending ? " is-pending" : "") + '"><label><input type="checkbox" data-quest-fact="' + titleKey + '::' + index + '"' + (state[key] === true ? " checked" : "") + '><span>' + escapeHtml(prefix + text) + '</span></label><span class="quest-tracker-fact-meta">' + displayEvidence(fact) + (fact.build ? '<small>' + escapeHtml(fact.build) + "</small>" : "") + "</span></li>";
    }).join("");
    var related = (record.relatedRoutes || []).map(function (route) {
      return '<a class="btn btn-outline btn-compact" href="' + escapeHtml(localizedRoute(route)) + '">' + escapeHtml(routeLabel(route)) + "</a>";
    }).join("");
    return '<article class="quest-tracker-card" data-quest-card="' + titleKey + '"><div class="quest-tracker-card-head"><div><span class="kicker">' + (isChinese ? "任务记录" : "Quest record") + '</span><h2>' + escapeHtml(name) + '</h2></div><div class="quest-tracker-progress" data-quest-progress>0 / ' + facts.length + (isChinese ? " 已核对" : " checked") + '</div></div><p class="quest-tracker-summary">' + escapeHtml(summary) + '</p>' + relationLinks(record) + '<ul class="quest-tracker-items">' + factHtml + '</ul><div class="quest-tracker-card-foot"><div class="quest-tracker-related"><strong>' + (isChinese ? "继续查找" : "Continue with") + '</strong><div>' + related + '</div></div><button class="btn btn-outline btn-compact" type="button" data-quest-reset="' + titleKey + '">' + (isChinese ? "重置任务" : "Reset quest") + '</button></div></article>';
  }

  function updateProgress(card) {
    var checks = Array.from(card.querySelectorAll("[data-quest-fact]"));
    var done = checks.filter(function (check) { return check.checked; }).length;
    var progress = card.querySelector("[data-quest-progress]");
    if (progress) progress.textContent = done + " / " + checks.length + (isChinese ? " 已核对" : " checked");
  }

  function wireCards() {
    root.querySelectorAll("[data-quest-fact]").forEach(function (check) {
      check.addEventListener("change", function () {
        state[check.dataset.questFact] = check.checked;
        save();
        updateProgress(check.closest("[data-quest-card]"));
      });
    });
    root.querySelectorAll("[data-quest-reset]").forEach(function (button) {
      button.addEventListener("click", function () {
        var card = button.closest("[data-quest-card]");
        if (!card) return;
        card.querySelectorAll("[data-quest-fact]").forEach(function (check) {
          check.checked = false;
          delete state[check.dataset.questFact];
        });
        save();
        updateProgress(card);
      });
    });
    root.querySelectorAll("[data-quest-card]").forEach(updateProgress);
  }

  fetch("/data/quests.json", { headers: { Accept: "application/json" } })
    .then(function (response) { if (!response.ok) throw new Error("quest-data"); return response.json(); })
    .then(function (data) {
      var records = Array.isArray(data) ? data : data.quests;
      if (!Array.isArray(records) || !records.length) throw new Error("empty-quest-data");
      list.innerHTML = records.map(renderRecord).join("");
      status.textContent = isChinese ? "已载入 " + records.length + " 条任务记录。" : records.length + " quest records loaded.";
      wireCards();
    })
    .catch(function () {
      status.textContent = isChinese ? "任务记录暂时无法载入，请先打开任务数据库。" : "Quest records could not be loaded. Open the quest database instead.";
      list.innerHTML = '<p class="notice warning"><a href="' + (isChinese ? "/zh/database/quests" : "/database/quests") + '">' + (isChinese ? "打开任务数据库" : "Open the quest database") + "</a></p>";
    });
})();
