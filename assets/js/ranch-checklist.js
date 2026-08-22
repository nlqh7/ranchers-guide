(function () {
  "use strict";

  var root = document.querySelector("[data-ranch-checklist]");
  if (!root) return;
  var storageKey = "ranchers-guide-checklist-v1";
  var goals = Array.from(root.querySelectorAll("[data-checklist-goal]"));
  var panels = Array.from(root.querySelectorAll("[data-checklist-panel]"));
  var isChinese = document.documentElement.lang.toLowerCase() === "zh-cn";
  var state = {};

  try { state = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (_) { state = {}; }

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) { /* Private mode still keeps the page usable. */ }
  }

  function updatePanel(panel) {
    if (!panel) return;
    var checks = Array.from(panel.querySelectorAll("[data-check-item]"));
    var completed = checks.filter(function (check) { return check.checked; }).length;
    var progress = panel.querySelector("[data-checklist-progress]");
    if (progress) progress.textContent = isChinese ? completed + " / " + checks.length + " 已完成" : completed + " / " + checks.length + " complete";
    updateMaterials(panel);
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
      state.materials = {};
      save();
      updateMaterials(panel);
    });
  });

  var firstGoal = goals[0] && goals[0].dataset.checklistGoal;
  if (firstGoal) activate(firstGoal);
})();
