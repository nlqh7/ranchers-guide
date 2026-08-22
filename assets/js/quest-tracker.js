(function () {
  "use strict";

  var root = document.querySelector("[data-quest-tracker]");
  if (!root) return;

  var list = root.querySelector("[data-quest-list]");
  var status = root.querySelector("[data-quest-status]");
  var overview = root.querySelector("[data-quest-overview]");
  var isChinese = document.documentElement.lang.toLowerCase() === "zh-cn";
  var storageKey = "ranchers-guide-quest-tracker-v1";
  var state = {};
  var records = [];
  var filters = {
    category: root.querySelector('[data-quest-filter="category"]'),
    npc: root.querySelector('[data-quest-filter="npc"]'),
    location: root.querySelector('[data-quest-filter="location"]')
  };

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

  function relationIds(record, type) {
    return (record.relations || []).filter(function (relation) {
      return relation.target && relation.target.type === type && relation.target.id;
    }).map(function (relation) { return relation.target.id; });
  }

  function relationLabel(id) {
    var labels = isChinese ? {
      victor: "Victor", angela: "Angela", gigi: "Gigi",
      "city-hall": "市政厅", "bykii-terminal": "Bykii 终端"
    } : {
      victor: "Victor", angela: "Angela", gigi: "Gigi",
      "city-hall": "City Hall", "bykii-terminal": "Bykii terminal"
    };
    return labels[id] || id;
  }

  function addOptions(select, values, firstLabel, labelGetter) {
    if (!select) return;
    select.innerHTML = '<option value="all">' + escapeHtml(firstLabel) + "</option>" + values.map(function (value) {
      return '<option value="' + escapeHtml(value) + '">' + escapeHtml(labelGetter(value)) + "</option>";
    }).join("");
  }

  function populateFilters() {
    var categories = Array.from(new Set(records.map(function (record) { return record.category; }).filter(Boolean))).sort();
    var npcs = Array.from(new Set(records.reduce(function (all, record) { return all.concat(relationIds(record, "npc")); }, []))).sort();
    var locations = Array.from(new Set(records.reduce(function (all, record) { return all.concat(relationIds(record, "location")); }, []))).sort();
    addOptions(filters.category, categories, isChinese ? "全部分类" : "All categories", function (value) {
      var record = records.find(function (item) { return item.category === value; });
      return isChinese ? (record.zhCategory || value) : value.charAt(0).toUpperCase() + value.slice(1);
    });
    addOptions(filters.npc, npcs, isChinese ? "全部 NPC" : "All NPCs", relationLabel);
    addOptions(filters.location, locations, isChinese ? "全部地点" : "All locations", relationLabel);
  }

  function recordMatches(record) {
    var category = filters.category ? filters.category.value : "all";
    var npc = filters.npc ? filters.npc.value : "all";
    var location = filters.location ? filters.location.value : "all";
    return (category === "all" || record.category === category) &&
      (npc === "all" || relationIds(record, "npc").indexOf(npc) !== -1) &&
      (location === "all" || relationIds(record, "location").indexOf(location) !== -1);
  }

  function progressFor(record) {
    var facts = Array.isArray(record.facts) ? record.facts : [];
    var done = facts.reduce(function (count, fact, index) {
      return count + (state[record.id + "::" + index] === true ? 1 : 0);
    }, 0);
    return { done: done, total: facts.length };
  }

  function updateOverview(filtered) {
    if (!overview) return;
    var progress = filtered.reduce(function (total, record) {
      var current = progressFor(record);
      total.done += current.done;
      total.total += current.total;
      return total;
    }, { done: 0, total: 0 });
    overview.textContent = isChinese
      ? "显示 " + filtered.length + " / " + records.length + " 条任务 · 已核对 " + progress.done + " / " + progress.total + " 个目标"
      : "Showing " + filtered.length + " of " + records.length + " quests · " + progress.done + " of " + progress.total + " objectives checked";
  }

  function nextObjectiveFor(record) {
    var facts = Array.isArray(record.facts) ? record.facts : [];
    for (var index = 0; index < facts.length; index += 1) {
      if (state[record.id + "::" + index] !== true) return { fact: facts[index], index: index };
    }
    return null;
  }

  function nextObjectiveHtml(record) {
    var next = nextObjectiveFor(record);
    if (!next) {
      return '<div class="quest-tracker-next is-complete" data-quest-next><strong>' + (isChinese ? "这条任务的已记录目标已全部核对" : "All documented objectives checked") + '</strong></div>';
    }
    var fact = next.fact;
    var text = isChinese ? fact.zhText : fact.text;
    var prefix = isPending(fact) ? (isChinese ? "待验证：" : "TBD: ") : "";
    return '<div class="quest-tracker-next" data-quest-next><strong>' + (isChinese ? "下一步" : "Next objective") + '</strong><span>' + escapeHtml(prefix + text) + '</span>' + displayEvidence(fact) + '</div>';
  }

  function renderRecord(record) {
    var facts = Array.isArray(record.facts) ? record.facts : [];
    var name = isChinese ? record.zhName : record.name;
    var summary = isChinese ? record.zhSummary : record.summary;
    var category = isChinese ? record.zhCategory : record.category;
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
    return '<article class="quest-tracker-card" data-quest-card="' + titleKey + '"><div class="quest-tracker-card-head"><div><span class="kicker">' + (isChinese ? "任务记录" : "Quest record") + '</span><h2>' + escapeHtml(name) + '</h2>' + (category ? '<span class="tag">' + escapeHtml(category) + '</span>' : '') + '</div><div class="quest-tracker-progress" data-quest-progress>0 / ' + facts.length + (isChinese ? " 已核对" : " checked") + '</div></div><p class="quest-tracker-summary">' + escapeHtml(summary) + '</p>' + nextObjectiveHtml(record) + relationLinks(record) + '<ul class="quest-tracker-items">' + factHtml + '</ul><div class="quest-tracker-card-foot"><div class="quest-tracker-related"><strong>' + (isChinese ? "继续查找" : "Continue with") + '</strong><div>' + related + '</div></div><button class="btn btn-outline btn-compact" type="button" data-quest-reset="' + titleKey + '">' + (isChinese ? "重置任务" : "Reset quest") + '</button></div></article>';
  }

  function renderRecords() {
    var filtered = records.filter(recordMatches);
    updateOverview(filtered);
    list.innerHTML = filtered.length
      ? filtered.map(renderRecord).join("")
      : '<p class="notice info">' + (isChinese ? "没有符合这些筛选条件的任务。" : "No quests match these filters.") + "</p>";
    wireCards();
  }

  function updateProgress(card) {
    var checks = Array.from(card.querySelectorAll("[data-quest-fact]"));
    var done = checks.filter(function (check) { return check.checked; }).length;
    var progress = card.querySelector("[data-quest-progress]");
    if (progress) progress.textContent = done + " / " + checks.length + (isChinese ? " 已核对" : " checked");
    var record = records.find(function (item) { return item.id === card.dataset.questCard; });
    var next = card.querySelector("[data-quest-next]");
    if (record && next) next.outerHTML = nextObjectiveHtml(record);
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
      var loadedRecords = Array.isArray(data) ? data : data.quests;
      if (!Array.isArray(loadedRecords) || !loadedRecords.length) throw new Error("empty-quest-data");
      records = loadedRecords;
      populateFilters();
      Object.keys(filters).forEach(function (key) {
        if (filters[key]) filters[key].addEventListener("change", renderRecords);
      });
      status.textContent = isChinese ? "已载入 " + records.length + " 条任务记录。" : records.length + " quest records loaded.";
      renderRecords();
    })
    .catch(function () {
      status.textContent = isChinese ? "任务记录暂时无法载入，请先打开任务数据库。" : "Quest records could not be loaded. Open the quest database instead.";
      list.innerHTML = '<p class="notice warning"><a href="' + (isChinese ? "/zh/database/quests" : "/database/quests") + '">' + (isChinese ? "打开任务数据库" : "Open the quest database") + "</a></p>";
    });
})();
