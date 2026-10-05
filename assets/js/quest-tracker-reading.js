(function () {
  "use strict";

  var root = document.querySelector("[data-reading-tracker]");
  if (!root) return;

  var isChinese = document.documentElement.lang.toLowerCase() === "zh-cn";
  var storageKey = "ranchers-guide-reading-progress-v1";
  var status = root.querySelector("[data-reading-status]");
  var reset = root.querySelector("[data-reading-reset]");
  var items = Array.prototype.slice.call(root.querySelectorAll("[data-reading-entry]"));
  var state = {};
  var storageAvailable = true;
  var storageStatus = "ok";

  try {
    var raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        state = JSON.parse(raw);
        if (!state || typeof state !== "object" || Array.isArray(state)) {
          state = {};
          storageStatus = "repaired";
        }
      } catch (_) {
        /* A malformed value is recoverable storage, not a browser policy block.
         * Reset only this reading key so the user can mark entries again. */
        state = {};
        storageStatus = "repaired";
      }
    }
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (_) {
    // Disabled or private storage: keep marks in memory for this session only.
    state = {};
    storageAvailable = false;
    storageStatus = "unavailable";
  }
  if (!state || typeof state !== "object" || Array.isArray(state)) state = {};

  function save() {
    if (!storageAvailable) return;
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
    catch (_) { storageAvailable = false; updateStatus(); }
  }

  function readCount() {
    return items.reduce(function (count, item) {
      return count + (state[item.getAttribute("data-reading-entry")] === true ? 1 : 0);
    }, 0);
  }

  function updateStatus() {
    if (!status) return;
    var base = isChinese
      ? "已读 " + readCount() + " / " + items.length + " 条 NPC 与剧情资料"
      : readCount() + " of " + items.length + " NPC and story entries marked as read";
    if (storageStatus === "repaired") {
      status.textContent = base + (isChinese ? "（已修复损坏的旧阅读标记）" : " (a damaged reading record was reset)");
    } else if (!storageAvailable) {
      status.textContent = base + (isChinese ? "（此浏览器禁止本地存储，标记仅本次会话有效）" : " (this browser blocks local storage; marks last for this session only)");
    } else {
      status.textContent = base;
    }
  }

  items.forEach(function (item) {
    var id = item.getAttribute("data-reading-entry");
    if (!id) return;
    var label = document.createElement("label");
    var box = document.createElement("input");
    box.type = "checkbox";
    box.checked = state[id] === true;
    box.setAttribute("data-reading-check", id);
    var span = document.createElement("span");
    while (item.firstChild) span.appendChild(item.firstChild);
    label.appendChild(box);
    label.appendChild(span);
    item.appendChild(label);
    box.addEventListener("change", function () {
      if (box.checked) state[id] = true;
      else delete state[id];
      save();
      updateStatus();
    });
  });

  if (reset) {
    reset.hidden = false;
    reset.addEventListener("click", function () {
      state = {};
      root.querySelectorAll("[data-reading-check]").forEach(function (box) { box.checked = false; });
      save();
      updateStatus();
    });
  }

  updateStatus();
})();
