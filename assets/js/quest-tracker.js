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
  // Troubleshooting hint selection is intentionally session-only. It must not
  // change the meaning of the existing quest checkbox keys.
  var manualHintSelections = {};
  var records = [];
  // Existing route contracts; null until loaded, empty Set when unavailable.
  var questDetailIds = null;
  var sceneNpcIds = null;
  var keyword = root.querySelector("[data-quest-keyword]");
  var clearKeyword = root.querySelector("[data-quest-search-clear]");
  var filters = {
    progress: root.querySelector('[data-quest-filter="progress"]'),
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
      ? { official: "官方", "video-observed": "视频观测", "community-confirmed": "社区互证", "player-tested": "玩家实测", "unverified-lead": "未验证线索", "build-observed": "游戏构建配置" }
      : { official: "Official", "video-observed": "Video-observed", "community-confirmed": "Community-confirmed", "player-tested": "Player-tested", "unverified-lead": "Unverified lead", "build-observed": "Game-build configuration" };
    return '<span class="tag evidence-' + escapeHtml(level.replace(/[^a-z-]/g, "")) + '">' + escapeHtml(labels[level] || level) + "</span>";
  }

  function isPending(fact) {
    return (fact.validity === "unknown" && fact.evidenceLevel !== 'build-observed') || fact.evidenceLevel === "unverified-lead";
  }

  function routeLabel(route) {
    var labels = isChinese ? {
      "/guides/beginners-guide": "新手路线",
      "/guides/crafting-guide": "制作配方与工具",
      "/guides/farming-fields": "播种与浇水",
      "/guides/resources-and-materials": "收集材料",
      "/guides/money-making": "出售与收入",
      "/guides/vehicles-transport": "交通与车辆",
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
      "/guides/beginners-guide": "Getting started",
      "/guides/crafting-guide": "Recipes & tools",
      "/guides/farming-fields": "Planting & watering",
      "/guides/resources-and-materials": "Find materials",
      "/guides/money-making": "Selling & income",
      "/guides/vehicles-transport": "Travel & vehicles",
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
    if (route.split("#")[0] === "/problems/failed-quest-replay") return route;
    return "/zh" + route;
  }

  // Direct standalone detail when the quest is registered in b2-entry-pages.json;
  // otherwise the existing aggregate quest-database anchor.
  function questRoute(id) {
    var registered = questDetailIds !== null && questDetailIds.has(id);
    return localizedRoute(registered ? "/database/quests/" + id : "/database/quests#" + id);
  }

  // Standalone NPC detail only when the NPC is registered in dialogue-scenes.json;
  // otherwise the current npcs#id fallback.
  function npcRoute(id) {
    var registered = sceneNpcIds !== null && sceneNpcIds.has(id);
    return localizedRoute(registered ? "/database/npcs/" + id : "/database/npcs#" + id);
  }

  function relationLinks(record) {
    var relations = (record.relations || []).map(function (relation) {
      var target = relation.target || {};
      var href = target.type === "location" ? localizedRoute("/map#" + target.id)
        : target.type === "npc" ? npcRoute(target.id)
        : target.type === "quest" ? questRoute(target.id)
        : localizedRoute("/database/quests#" + target.id);
      var label = relationLabel(target.id);
      var routeAttr = target.type === "quest" ? ' data-quest-relation-quest="' + escapeHtml(target.id) + '"'
        : target.type === "npc" ? ' data-quest-relation-npc="' + escapeHtml(target.id) + '"' : '';
      return '<a class="quest-tracker-link"' + routeAttr + ' href="' + escapeHtml(href) + '">' + escapeHtml(label) + "</a>";
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
      airport: "机场", "leafy-market": "绿叶市场",
      victor: "Victor", angela: "Angela", gigi: "Gigi",
      "city-hall": "市政厅", "bykii-terminal": "Bykii 终端"
    } : {
      airport: "Airport", "leafy-market": "Leafy Market",
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
    var query = keyword ? keyword.value.trim().toLowerCase() : "";
    if (query) {
      var haystack = [record.name, record.zhName, record.summary, record.zhSummary].concat(
        objectiveFacts(record).map(function (fact) { return [fact.text, fact.zhText].join(" "); }),
        relationIds(record, "npc").map(relationLabel)
      ).join(" ").toLowerCase();
      if (!query.split(/\s+/).every(function (word) { return haystack.indexOf(word) !== -1; })) return false;
    }
    var progressFilter = filters.progress ? filters.progress.value : "all";
    var progress = progressFor(record);
    var fullyChecked = progress.total > 0 && progress.done === progress.total;
    var category = filters.category ? filters.category.value : "all";
    var npc = filters.npc ? filters.npc.value : "all";
    var location = filters.location ? filters.location.value : "all";
    return (progressFilter === "all" || (progressFilter === "checked" ? fullyChecked : !fullyChecked)) &&
      (category === "all" || record.category === category) &&
      (npc === "all" || relationIds(record, "npc").indexOf(npc) !== -1) &&
      (location === "all" || relationIds(record, "location").indexOf(location) !== -1);
  }

  function objectiveFacts(record) {
    // Published checklist indices retain their original meaning.
    if (record.buildGuide && record.buildGuide.steps.length && record.nameConfidence === 'exact-build') {
      return record.buildGuide.steps.map(function (step) {
        return Object.assign({}, step, {evidenceLevel:'build-observed', validity:'unknown', build:record.buildGuide.build});
      });
    }
    return Array.isArray(record.facts) ? record.facts : [];
  }

  function progressFor(record) {
    var facts = objectiveFacts(record);
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
    var facts = objectiveFacts(record);
    for (var index = 0; index < facts.length; index += 1) {
      if (state[record.id + "::" + index] !== true) return { fact: facts[index], index: index };
    }
    return null;
  }

  // Optional per-entry hint from record.buildGuide.trackerHints, matched by the
  // original objective entry number carried on build-guide step facts.
  function hintFor(record, fact) {
    var hints = record.buildGuide && Array.isArray(record.buildGuide.trackerHints) ? record.buildGuide.trackerHints : [];
    if (fact.entry == null) return null;
    for (var i = 0; i < hints.length; i += 1) {
      if (Array.isArray(hints[i].entries) && hints[i].entries.indexOf(fact.entry) !== -1) return hints[i];
    }
    return null;
  }

  function hintHtml(record, hint, manual) {
    var text = isChinese ? (hint.zhText || hint.text) : (hint.text || hint.zhText);
    if (!text) return "";
    var fields = Array.isArray(hint.sourceFields) ? hint.sourceFields.slice() : [];
    var build = record.buildGuide && record.buildGuide.build ? String(record.buildGuide.build) : "";
    var boundary = fields.concat(build ? [build] : []).join(" · ");
    var note = boundary
      ? '<small>' + escapeHtml((isChinese ? "来源与边界：" : "Source & boundary: ") + boundary) + "</small>"
      : "";
    var label = manual
      ? (isChinese ? "查看这项提示" : "Read this check hint")
      : (isChinese ? "卡在这一步？" : "Stuck on this step?");
    return '<details class="pending-facts quest-tracker-hint" style="grid-column: 1 / -1; margin: 2px 0 0;"><summary style="min-height: 44px; display: inline-flex; align-items: center;">' + label + '</summary><p style="margin: 8px 0 4px;">' + escapeHtml(text) + "</p>" + note + "</details>";
  }

  function manualHintFor(record) {
    if (!record.buildGuide || record.nameConfidence === "exact-build") return null;
    var hints = Array.isArray(record.buildGuide.trackerHints) ? record.buildGuide.trackerHints : [];
    var selected = manualHintSelections[record.id];
    if (selected == null || selected === "") return null;
    var index = Number(selected);
    return Number.isInteger(index) && hints[index] ? hints[index] : null;
  }

  function manualHintPickerHtml(record) {
    if (!record.buildGuide || record.nameConfidence === "exact-build") return "";
    var hints = Array.isArray(record.buildGuide.trackerHints) ? record.buildGuide.trackerHints : [];
    if (!hints.length) return "";
    var selected = manualHintSelections[record.id] == null ? "" : String(manualHintSelections[record.id]);
    var emptyLabel = isChinese ? "选择已记录的卡点" : "Choose a recorded check";
    var options = ["<option value=\"\">" + escapeHtml(emptyLabel) + "</option>"];
    hints.forEach(function (hint, index) {
      var entries = Array.isArray(hint.entries) ? hint.entries.join(isChinese ? "、" : ", ") : "";
      var label = isChinese ? "第 " + entries + " 项" : "Entries " + entries;
      options.push('<option value="' + index + '"' + (selected === String(index) ? " selected" : "") + '>' + escapeHtml(label) + "</option>");
    });
    return '<label class="quest-tracker-hint-picker" style="display: grid; gap: 4px; margin-top: 8px;"><span>' + escapeHtml(isChinese ? "手动查看某项提示（不改变任务进度）" : "Choose a check to read its hint (does not change progress)") + '</span><select data-quest-hint-target="' + escapeHtml(record.id) + '" style="min-height: 44px;">' + options.join("") + "</select></label>";
  }

  function nextObjectiveHtml(record) {
    var next = nextObjectiveFor(record);
    if (!next) {
      return '<div class="quest-tracker-next is-complete" data-quest-next><strong>' + (isChinese ? "这条任务的已记录目标已全部核对" : "All documented objectives checked") + '</strong></div>';
    }
    var fact = next.fact;
    var text = isChinese ? fact.zhText : fact.text;
    var prefix = isPending(fact) ? (isChinese ? "待验证：" : "TBD: ") : "";
    var hint = hintFor(record, fact);
    var manualHint = manualHintFor(record);
    return '<div class="quest-tracker-next" data-quest-next><strong>' + (isChinese ? "下一步" : "Next objective") + '</strong><span>' + escapeHtml(prefix + text) + '</span>' + displayEvidence(fact) + manualHintPickerHtml(record) + (hint ? hintHtml(record, hint, false) : "") + (manualHint ? hintHtml(record, manualHint, true) : "") + '</div>';
  }

  // One clear primary route per card: direct standalone detail when registered,
  // otherwise the aggregate quest-database anchor.
  function primaryRouteHtml(record) {
    var hasDetail = questDetailIds !== null && questDetailIds.has(record.id);
    var label = hasDetail
      ? (isChinese ? "查看任务攻略" : "View quest walkthrough")
      : (isChinese ? "在任务数据库中查看" : "View in quest database");
    return '<div class="quest-tracker-relations"><strong>' + (isChinese ? "任务攻略" : "Quest guide") + '</strong><div><a class="btn btn-compact" data-quest-primary-route="' + escapeHtml(record.id) + '" href="' + escapeHtml(questRoute(record.id)) + '">' + escapeHtml(label) + "</a></div></div>";
  }

  function renderRecord(record) {
    var facts = objectiveFacts(record);
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
    return '<article class="quest-tracker-card" data-quest-card="' + titleKey + '"><div class="quest-tracker-card-head"><div><span class="kicker">' + (isChinese ? "任务记录" : "Quest record") + '</span><h2>' + escapeHtml(name) + '</h2>' + (category ? '<span class="tag">' + escapeHtml(category) + '</span>' : '') + '</div><div class="quest-tracker-progress" data-quest-progress>0 / ' + facts.length + (isChinese ? " 已核对" : " checked") + '</div></div><p class="quest-tracker-summary">' + escapeHtml(summary) + '</p>' + nextObjectiveHtml(record) + primaryRouteHtml(record) + relationLinks(record) + '<ul class="quest-tracker-items">' + factHtml + '</ul><div class="quest-tracker-card-foot"><div class="quest-tracker-related"><strong>' + (isChinese ? "继续查找" : "Continue with") + '</strong><div>' + related + '</div></div><button class="btn btn-outline btn-compact" type="button" data-quest-reset="' + titleKey + '">' + (isChinese ? "重置任务" : "Reset quest") + '</button></div></article>';
  }

  function restoreFilters() {
    var params = new URLSearchParams(window.location.search);
    if (keyword) keyword.value = params.get("q") || "";
    Object.keys(filters).forEach(function (key) {
      var select = filters[key];
      if (!select) return;
      var value = params.get(key) || "all";
      select.value = Array.from(select.options).some(function (option) { return option.value === value; }) ? value : "all";
    });
  }

  function saveFiltersToUrl() {
    var url = new URL(window.location.href);
    var query = keyword ? keyword.value.trim() : "";
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    Object.keys(filters).forEach(function (key) {
      var select = filters[key];
      if (select && select.value !== "all") url.searchParams.set(key, select.value);
      else url.searchParams.delete(key);
    });
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }

  function renderRecords() {
    saveFiltersToUrl();
    if (clearKeyword) clearKeyword.hidden = !keyword || !keyword.value;
    var filtered = records.filter(recordMatches);
    updateOverview(filtered);
    list.innerHTML = filtered.length
      ? filtered.map(renderRecord).join("")
      : '<p class="notice info">' + (isChinese ? "没有符合这些筛选条件的任务。" : "No quests match these filters.") + "</p>";
    wireCards();
  }

  function refreshRouteLinks() {
    root.querySelectorAll("[data-quest-primary-route]").forEach(function (link) {
      var id = link.getAttribute("data-quest-primary-route");
      var hasDetail = questDetailIds !== null && questDetailIds.has(id);
      link.setAttribute("href", questRoute(id));
      link.textContent = hasDetail
        ? (isChinese ? "查看任务攻略" : "View quest walkthrough")
        : (isChinese ? "在任务数据库中查看" : "View in quest database");
    });
    root.querySelectorAll("[data-quest-relation-quest]").forEach(function (link) {
      link.setAttribute("href", questRoute(link.getAttribute("data-quest-relation-quest")));
    });
    root.querySelectorAll("[data-quest-relation-npc]").forEach(function (link) {
      link.setAttribute("href", npcRoute(link.getAttribute("data-quest-relation-npc")));
    });
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

  function refreshProgressFilter(card) {
    var record = records.find(function (item) { return item.id === card.dataset.questCard; });
    if (record && !recordMatches(record)) {
      renderRecords();
      if (filters.progress) filters.progress.focus();
    } else updateOverview(records.filter(recordMatches));
  }

  function updateManualHintSelection(select) {
    if (!select || !select.dataset || !select.dataset.questHintTarget) return;
    if (select.value === "") delete manualHintSelections[select.dataset.questHintTarget];
    else manualHintSelections[select.dataset.questHintTarget] = select.value;
    renderRecords();
  }

  root.addEventListener("change", function (event) {
    updateManualHintSelection(event.target);
  });

  function wireCards() {
    root.querySelectorAll("[data-quest-hint-target]").forEach(function (select) {
      function updateHintSelection() {
        updateManualHintSelection(select);
      }
      select.addEventListener("input", updateHintSelection);
      select.addEventListener("change", updateHintSelection);
    });
    root.querySelectorAll("[data-quest-fact]").forEach(function (check) {
      check.addEventListener("change", function () {
        state[check.dataset.questFact] = check.checked;
        save();
        updateProgress(check.closest("[data-quest-card]"));
        refreshProgressFilter(check.closest("[data-quest-card]"));
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
        refreshProgressFilter(card);
      });
    });
    root.querySelectorAll("[data-quest-card]").forEach(updateProgress);
  }

  if (keyword) keyword.addEventListener("input", renderRecords);
  if (clearKeyword) clearKeyword.addEventListener("click", function () {
    keyword.value = "";
    renderRecords();
    keyword.focus();
  });

  function fetchJson(url) {
    return fetch(url, { headers: { Accept: "application/json" } })
      .then(function (response) { if (!response.ok) throw new Error(url); return response.json(); });
  }

  // Quest data is required; route registries are optional and must never block
  // the core list. Late registries patch only links, preserving focus/progress.
  function loadRouteContracts() {
    fetchJson("/data/b2-entry-pages.json").then(function (pages) {
      questDetailIds = new Set(pages && Array.isArray(pages.quests) ? pages.quests : []);
      refreshRouteLinks();
    }).catch(function () {
      questDetailIds = new Set();
      refreshRouteLinks();
    });
    fetchJson("/data/dialogue-scenes.json").then(function (scenes) {
      sceneNpcIds = new Set(scenes && Array.isArray(scenes.scenes)
        ? scenes.scenes.map(function (scene) { return scene && scene.npcId; }).filter(Boolean)
        : []);
      refreshRouteLinks();
    }).catch(function () {
      sceneNpcIds = new Set();
      refreshRouteLinks();
    });
  }

  fetchJson("/data/quests.json")
    .then(function (data) {
      var loadedRecords = Array.isArray(data) ? data : data.quests;
      if (!Array.isArray(loadedRecords) || !loadedRecords.length) throw new Error("empty-quest-data");
      records = loadedRecords;
      populateFilters();
      restoreFilters();
      window.addEventListener("popstate", function () { restoreFilters(); renderRecords(); });
      Object.keys(filters).forEach(function (key) {
        if (filters[key]) filters[key].addEventListener("change", renderRecords);
      });
      status.textContent = isChinese ? "已载入 " + records.length + " 条任务记录。" : records.length + " quest records loaded.";
      renderRecords();
      loadRouteContracts();
    })
    .catch(function () {
      status.textContent = isChinese ? "任务记录暂时无法载入，请先打开任务数据库。" : "Quest records could not be loaded. Open the quest database instead.";
      list.innerHTML = '<p class="notice warning"><a href="' + (isChinese ? "/zh/database/quests" : "/database/quests") + '">' + (isChinese ? "打开任务数据库" : "Open the quest database") + "</a></p>";
    });
})();
