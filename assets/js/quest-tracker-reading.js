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
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          state = parsed;
        } else {
          /* Valid JSON but not a mark map: treat as a damaged record. */
          storageStatus = "repaired";
        }
      } catch (_) {
        /* Malformed JSON is a damaged record, not a browser policy block.
         * Keep the original value untouched during initial load; the first
         * explicit user change re-saves and recovers it. */
        storageStatus = "repaired";
      }
    }
  } catch (_) {
    // Storage could not be read: keep marks in memory for this session only.
    state = {};
    storageAvailable = false;
    storageStatus = "unavailable";
  }
  if (storageAvailable && storageStatus !== "repaired") {
    /* Probe writability with the exact value just read. A write failure must
     * not discard readable marks: disable persistence only and keep the marks
     * for this session. Never probe over a damaged record — that would
     * overwrite the original data before the user chooses to re-mark. */
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
    catch (_) { storageAvailable = false; storageStatus = "unavailable"; }
  }
  if (!state || typeof state !== "object" || Array.isArray(state)) state = {};

  function save() {
    if (!storageAvailable) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      /* The damaged record has been replaced by a valid save: clear the
       * repair warning so the status returns to the plain count. */
      if (storageStatus === "repaired") storageStatus = "ok";
    }
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
    if (!storageAvailable) {
      /* Describes the observed read/write failure only; the cause (policy,
       * quota, or something else) is not proven, so do not claim one. */
      status.textContent = base + (isChinese ? "（本地阅读标记无法读取或保存，标记仅本次会话有效）" : " (reading marks could not be read or saved to local storage; marks last for this session only)");
    } else if (storageStatus === "repaired") {
      status.textContent = base + (isChinese ? "（旧的阅读标记已损坏无法读取，重新标记后将覆盖保存）" : " (a damaged saved reading record could not be read; marking entries again will replace it)");
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
