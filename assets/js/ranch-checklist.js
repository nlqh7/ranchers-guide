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

  function materialQuantity(value, required) {
    if (value === true) return required;
    var quantity = Number(value);
    return Number.isFinite(quantity) && quantity > 0 ? Math.min(Math.floor(quantity), required) : 0;
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
    var ready = materialRows.filter(function (row) {
      var required = Number(row.dataset.required) || 0;
      var owned = Number(row.querySelector("[data-material-owned]")?.value) || 0;
      return owned >= required;
    }).length;
    var materialText = isChinese ? "材料 " + ready + " / " + materialRows.length + " 已备齐" : ready + " / " + materialRows.length + " materials ready";
    overview.textContent = isChinese
      ? completed + " / " + checks.length + " 项清单步骤已完成，覆盖 " + goals.length + " 个目标 · " + materialText
      : completed + " / " + checks.length + " checklist steps complete across " + goals.length + " goals · " + materialText;
  }

  function updateMaterials(panel) {
    if (!panel || !panel.querySelector("[data-material-checklist]")) return;
    var requirements = Array.from(panel.querySelectorAll("[data-material-requirement]"));
    var ready = requirements.filter(function (row) {
      var required = Number(row.dataset.required) || 0;
      var owned = Number(row.querySelector("[data-material-owned]")?.value) || 0;
      return owned >= required;
    }).length;
    requirements.forEach(function (row) {
      var input = row.querySelector("[data-material-owned]");
      var required = Number(row.dataset.required) || 0;
      var owned = materialQuantity(input && input.value, required);
      var remaining = row.querySelector("[data-material-remaining]");
      if (input && String(owned) !== input.value) input.value = owned;
      if (remaining) remaining.textContent = isChinese ? (owned >= required ? "已备齐" : "还需 " + (required - owned) + " 个") : (owned >= required ? "Ready" : "Need " + (required - owned));
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
    var status = buildPanel.querySelector("[data-material-status]");
    if (status) status.textContent = "";
    if (caution) {
      caution.hidden = false;
      caution.textContent = (isChinese ? "旧配方，当前版本待复核 · " : "Historical recipe; current build not rechecked · ") + target.build;
    }
    materialChecklist.innerHTML = (target.materials || []).map(function (material) {
      var oldName = target.build === "alpha-2023" && {"wood-log": ["Wood", "木材"], stone: ["Rock", "岩石"]}[material.id];
      var label = oldName ? oldName[isChinese ? 1 : 0] : (isChinese ? material.zhName.replace(/\s+[A-Za-z].*$/, "") : material.name);
      var route = isChinese ? material.routeZh : material.route;
      var required = Number(material.required) || 0;
      var owned = materialQuantity(materialState[material.id], required);
      var inputId = "material-" + escapeHtml(target.id + "-" + material.id);
      return '<div class="material-checklist-row" data-material-requirement data-material-key="' + escapeHtml(material.id) + '" data-required="' + escapeHtml(material.required) + '">' +
        '<span class="material-checklist-name"><strong>' + escapeHtml(label) + '</strong><small>' + (isChinese ? "需要 " + required + " 个" : required + " required") + "</small></span>" +
        '<label class="material-owned" for="' + inputId + '"><span>' + (isChinese ? "已有" : "Have") + '</span><input id="' + inputId + '" type="number" min="0" step="1" inputmode="numeric" data-material-owned value="' + owned + '" aria-label="' + escapeHtml(label) + '"></label>' +
        '<strong data-material-remaining>' + (isChinese ? "还需 " + Math.max(required - owned, 0) + " 个" : "Need " + Math.max(required - owned, 0)) + "</strong>" +
        '<a href="' + escapeHtml(route) + '">' + (isChinese ? "查看条目" : "Open record") + "</a></div>";
    }).join("");
    wireMaterialInputs();
    updateMaterials(buildPanel);
  }

  function wireMaterialInputs() {
    if (!materialChecklist) return;
    var materialState = activeMaterialTarget ? materialStateFor(activeMaterialTarget) : (state.materials || {});
    materialChecklist.querySelectorAll("[data-material-owned]").forEach(function (input) {
      var row = input.closest("[data-material-requirement]");
      var key = row.dataset.materialKey;
      var required = Number(row.dataset.required) || 0;
      input.value = materialQuantity(materialState[key], required);
      input.addEventListener("input", function () {
        var quantity = materialQuantity(input.value, required);
        if (activeMaterialTarget) {
          state.materialsByTarget = state.materialsByTarget || {};
          state.materialsByTarget[activeMaterialTarget.id] = state.materialsByTarget[activeMaterialTarget.id] || {};
          state.materialsByTarget[activeMaterialTarget.id][key] = quantity;
        } else {
          state.materials = state.materials || {};
          state.materials[key] = quantity;
        }
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
    label.textContent = isChinese ? "选择要记录的建筑" : "Building to track";
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
    status.textContent = isChinese ? "正在载入材料记录……" : "Loading material tracking…";
    controls.insertAdjacentElement("afterend", status);
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

  wireMaterialInputs();

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
      panel.querySelectorAll("[data-material-owned]").forEach(function (input) { input.value = 0; });
      if (activeMaterialTarget) {
        state.materialsByTarget = state.materialsByTarget || {};
        state.materialsByTarget[activeMaterialTarget.id] = {};
      }
      state.materials = {};
      save();
      updateMaterials(panel);
    });
  });

  function activateFromHash() {
    var goal = location.hash.replace(/^#/, "").replace(/-goal$/, "");
    var matched = goals.some(function (button) { return button.dataset.checklistGoal === goal; });
    if (matched && goal !== "build") {
      var secondary = root.querySelector(".checklist-secondary");
      if (secondary) secondary.open = true;
    }
    activate(matched ? goal : "beginner");
  }
  activateFromHash();
  window.addEventListener("hashchange", activateFromHash);
  setupMaterialTargets();
  updateOverview();
})();
