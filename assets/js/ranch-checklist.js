(function () {
  "use strict";

  var root = document.querySelector("[data-ranch-checklist]");
  if (!root) return;
  var storageKey = "ranchers-guide-checklist-v1";
  var goals = Array.from(root.querySelectorAll("[data-checklist-goal]"));
  var panels = Array.from(root.querySelectorAll("[data-checklist-panel]"));
  var isChinese = document.documentElement.lang.toLowerCase() === "zh-cn";
  var state = {};
  var buildPanel = root.querySelector('[data-checklist-panel="build"]');
  var materialChecklist = buildPanel && buildPanel.querySelector("[data-material-checklist]");
  var materialTargets = [];
  var activeMaterialTarget = null;

  try { state = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (_) { state = {}; }

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) { /* Private mode still keeps the page usable. */ }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function updatePanel(panel) {
    if (!panel) return;
    var checks = Array.from(panel.querySelectorAll("[data-check-item]"));
    var completed = checks.filter(function (check) { return check.checked; }).length;
    var progress = panel.querySelector("[data-checklist-progress]");
    if (progress) progress.textContent = isChinese ? completed + " / " + checks.length + " 已完成" : completed + " / " + checks.length + " complete";
    updateMaterials(panel);
  }

  function updateOverview() {
    var overview = root.querySelector("[data-checklist-overview]");
    if (!overview) return;
    var checks = Array.from(root.querySelectorAll("[data-check-item]"));
    var completed = checks.filter(function (check) { return check.checked; }).length;
    var materialRows = Array.from(root.querySelectorAll("[data-material-requirement]"));
    var ready = materialRows.filter(function (row) { return row.querySelector("[data-material-ready]")?.checked; }).length;
    var materialText = isChinese ? "材料 " + ready + " / " + materialRows.length + " 已备齐" : ready + " / " + materialRows.length + " materials ready";
    overview.textContent = isChinese
      ? completed + " / " + checks.length + " 项清单步骤已完成，覆盖 " + goals.length + " 个目标 · " + materialText
      : completed + " / " + checks.length + " checklist steps complete across " + goals.length + " goals · " + materialText;
  }

  function updateMaterials(panel) {
    if (!panel || !panel.querySelector("[data-material-checklist]")) return;
    var requirements = Array.from(panel.querySelectorAll("[data-material-requirement]"));
    var ready = requirements.filter(function (row) { return row.querySelector("[data-material-ready]")?.checked; }).length;
    requirements.forEach(function (row) {
      var input = row.querySelector("[data-material-ready]");
      var required = row.dataset.required;
      var remaining = row.querySelector("[data-material-remaining]");
      if (remaining) remaining.textContent = isChinese ? (input.checked ? "已备齐" : "还需 " + required + " 个") : (input.checked ? "Ready" : "Need " + required);
    });
    var progress = panel.querySelector("[data-material-progress]");
    if (progress) progress.textContent = isChinese ? ready + " / " + requirements.length + " 种材料已备齐" : ready + " / " + requirements.length + " materials ready";
    updateOverview();
  }

  function materialStateFor(target) {
    if (!target) return {};
    state.materialsByTarget = state.materialsByTarget || {};
    if (state.materialsByTarget[target.id]) return state.materialsByTarget[target.id];
    /* Preserve the original v1 checklist state for the first target. */
    if (target.id === "red-tent" && state.materials && !state.materialsByTarget[target.id]) {
      state.materialsByTarget[target.id] = state.materials;
      save();
      return state.materials;
    }
    return {};
  }

  function renderMaterialTarget(target) {
    if (!target || !materialChecklist || !buildPanel) return;
    activeMaterialTarget = target;
    var materialState = materialStateFor(target);
    var caution = buildPanel.querySelector("[data-material-caution]") || buildPanel.querySelector(".notice.warning");
    var intro = buildPanel.querySelector("p");
    var status = buildPanel.querySelector("[data-material-status]");
    var source = buildPanel.querySelector("[data-material-source]");
    if (intro) intro.textContent = isChinese
      ? "选择一个有保留配方记录的目标。其他建筑和公用设施需求仍需当前版本画面确认，因此保留为 TBD。"
      : "Choose a target with a retained recipe record. Other building and utility requirements remain TBD until a current-build screen is captured.";
    if (status) status.textContent = isChinese ? "已载入 " + materialTargets.length + " 个已记录目标。" : materialTargets.length + " documented target" + (materialTargets.length === 1 ? "" : "s") + " loaded.";
    if (caution) {
      caution.hidden = false;
      caution.innerHTML = "<strong>" + (isChinese ? "版本边界：" : "Version boundary: ") + "</strong>" + escapeHtml(isChinese ? target.zhCaution : target.caution);
    }
    if (source && target.source) {
      var sourceLabel = isChinese ? target.source.labelZh : target.source.label;
      source.innerHTML = "<strong>" + (isChinese ? "来源：" : "Source: ") + "</strong>" + (target.source.url
        ? '<a href="' + escapeHtml(target.source.url) + '" rel="noopener noreferrer">' + escapeHtml(sourceLabel) + "</a>"
        : escapeHtml(sourceLabel));
    }
    materialChecklist.innerHTML = (target.materials || []).map(function (material) {
      var label = isChinese ? material.zhName : material.name;
      var route = isChinese ? material.routeZh : material.route;
      return '<div class="material-checklist-row" data-material-requirement data-material-key="' + escapeHtml(material.id) + '" data-required="' + escapeHtml(material.required) + '">' +
        '<label for="material-' + escapeHtml(target.id + "-" + material.id) + '"><input id="material-' + escapeHtml(target.id + "-" + material.id) + '" type="checkbox" data-material-ready' + (materialState[material.id] === true ? " checked" : "") + '> <span>' + escapeHtml(label) + " <small>" + (isChinese ? "需要 " + material.required + " 个" : material.required + " required") + "</small></span></label>" +
        '<strong data-material-remaining>' + (isChinese ? "还需 " + material.required + " 个" : "Need " + material.required) + "</strong>" +
        '<a href="' + escapeHtml(route) + '">' + (isChinese ? "查看条目" : "Open record") + "</a></div>";
    }).join("");
    wireMaterialChecks();
    updateMaterials(buildPanel);
  }

  function wireMaterialChecks() {
    if (!materialChecklist || !activeMaterialTarget) return;
    var materialState = materialStateFor(activeMaterialTarget);
    materialChecklist.querySelectorAll("[data-material-ready]").forEach(function (check) {
      var key = check.closest("[data-material-requirement]").dataset.materialKey;
      check.checked = materialState[key] === true;
      check.addEventListener("change", function () {
        state.materialsByTarget = state.materialsByTarget || {};
        state.materialsByTarget[activeMaterialTarget.id] = state.materialsByTarget[activeMaterialTarget.id] || {};
        state.materialsByTarget[activeMaterialTarget.id][key] = check.checked;
        save();
        updateMaterials(buildPanel);
      });
    });
  }

  function setupMaterialTargets() {
    if (!buildPanel || !materialChecklist) return;
    var caution = buildPanel.querySelector("[data-material-caution]") || buildPanel.querySelector(".notice.warning");
    var controls = document.createElement("div");
    controls.className = "calc-field";
    var label = document.createElement("label");
    label.htmlFor = "material-target-select";
    label.textContent = isChinese ? "已记录目标" : "Documented target";
    var select = document.createElement("select");
    select.id = "material-target-select";
    select.dataset.materialTarget = "";
    controls.append(label, select);
    if (caution) caution.parentNode.insertBefore(controls, caution);
    else materialChecklist.parentNode.insertBefore(controls, materialChecklist);
    var status = document.createElement("p");
    status.className = "quest-tracker-status";
    status.dataset.materialStatus = "";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = isChinese ? "正在载入已记录目标……" : "Loading documented targets…";
    controls.insertAdjacentElement("afterend", status);
    var source = document.createElement("p");
    source.className = "source-note";
    source.dataset.materialSource = "";
    materialChecklist.parentNode.insertBefore(source, materialChecklist.nextSibling);
    select.addEventListener("change", function () {
      var target = materialTargets.find(function (item) { return item.id === select.value; });
      renderMaterialTarget(target);
    });
    fetch("/data/building-checklists.json", { headers: { Accept: "application/json" } })
      .then(function (response) { if (!response.ok) throw new Error("building-checklists"); return response.json(); })
      .then(function (data) {
        materialTargets = Array.isArray(data.targets) ? data.targets : [];
        if (!materialTargets.length) throw new Error("empty-building-checklists");
        select.innerHTML = materialTargets.map(function (target) {
          return '<option value="' + escapeHtml(target.id) + '">' + escapeHtml(isChinese ? target.zhName : target.name) + "</option>";
        }).join("");
        renderMaterialTarget(materialTargets[0]);
      })
      .catch(function () {
        status.textContent = isChinese ? "建造目标暂时无法载入，保留页面中的已记录材料。" : "Building targets could not load; the retained material record is still shown.";
      });
  }

  function activate(goal) {
    goals.forEach(function (button) {
      var active = button.dataset.checklistGoal === goal;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    panels.forEach(function (panel) { panel.classList.toggle("is-active", panel.dataset.checklistPanel === goal); });
    var activePanel = panels.find(function (panel) { return panel.dataset.checklistPanel === goal; });
    if (activePanel) updatePanel(activePanel);
  }

  root.querySelectorAll("[data-check-item]").forEach(function (check) {
    var key = check.dataset.checkItem;
    check.checked = state[key] === true;
    check.addEventListener("change", function () {
      state[key] = check.checked;
      save();
      updatePanel(check.closest("[data-checklist-panel]"));
    });
  });

  root.querySelectorAll("[data-material-ready]").forEach(function (check) {
    var key = check.closest("[data-material-requirement]").dataset.materialKey;
    check.checked = state.materials && state.materials[key] === true;
    check.addEventListener("change", function () {
      state.materials = state.materials || {};
      state.materials[key] = check.checked;
      save();
      updateMaterials(check.closest("[data-checklist-panel]"));
    });
  });

  goals.forEach(function (button) {
    button.addEventListener("click", function () { activate(button.dataset.checklistGoal); });
  });

  root.querySelectorAll("[data-checklist-reset]").forEach(function (button) {
    button.addEventListener("click", function () {
      var panel = button.closest("[data-checklist-panel]");
      if (!panel) return;
      panel.querySelectorAll("[data-check-item]").forEach(function (check) {
        check.checked = false;
        delete state[check.dataset.checkItem];
      });
      save();
      updatePanel(panel);
    });
  });

  root.querySelectorAll("[data-material-reset]").forEach(function (button) {
    button.addEventListener("click", function () {
      var panel = button.closest("[data-checklist-panel]");
      if (!panel) return;
      panel.querySelectorAll("[data-material-ready]").forEach(function (check) { check.checked = false; });
      if (activeMaterialTarget) {
        state.materialsByTarget = state.materialsByTarget || {};
        state.materialsByTarget[activeMaterialTarget.id] = {};
      }
      state.materials = {};
      save();
      updateMaterials(panel);
    });
  });

  var firstGoal = goals[0] && goals[0].dataset.checklistGoal;
  if (firstGoal) activate(firstGoal);
  setupMaterialTargets();
  updateOverview();
})();
