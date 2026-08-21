(function () {
  "use strict";

  var cards = Array.from(document.querySelectorAll("[data-community-card]"));
  var query = document.querySelector("[data-community-query]");
  var filter = document.querySelector("[data-community-filter]");
  var count = document.querySelector("[data-community-count]");
  var empty = document.querySelector("[data-community-empty]");
  var form = document.querySelector("[data-question-builder]");
  var preview = document.querySelector("[data-question-preview]");
  var status = document.querySelector("[data-question-status]");
  var isZh = document.documentElement.lang.toLowerCase() === "zh-cn";

  function clean(value) { return String(value || "").replace(/\r\n?/g, "\n").trim(); }

  function updateCards() {
    var wanted = clean(query && query.value).toLowerCase();
    var topic = filter && filter.value || "all";
    var visible = 0;
    cards.forEach(function (card) {
      var haystack = (card.textContent + " " + (card.dataset.topic || "")).toLowerCase();
      var matches = (!wanted || haystack.indexOf(wanted) !== -1) && (topic === "all" || card.dataset.topic === topic);
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    if (count) count.textContent = String(visible);
    if (empty) empty.hidden = visible !== 0;
  }

  function readQuestion() {
    var data = new FormData(form);
    return {
      topic: clean(data.get("topic")),
      build: clean(data.get("build")),
      platform: clean(data.get("platform")),
      observation: clean(data.get("observation")),
      tried: clean(data.get("tried")),
    };
  }

  function buildDraft(values) {
    var heading = isZh ? "我在 The Ranchers 遇到了这个问题" : "I ran into this in The Ranchers";
    var topic = isZh ? "主题" : "Topic";
    var build = isZh ? "版本" : "Build";
    var platform = isZh ? "平台" : "Platform";
    var observed = isZh ? "现象" : "What happened";
    var tried = isZh ? "我尝试过" : "What I tried";
    var ask = isZh ? "有人在当前版本遇到过同样的情况吗？" : "Has anyone seen the same thing on the current build?";
    return [heading, "", topic + ": " + values.topic, build + ": " + values.build, platform + ": " + values.platform, "", observed + ": " + values.observation, "", tried + ": " + values.tried, "", ask].join("\n");
  }

  function updatePreview() {
    if (!form || !preview) return;
    preview.value = buildDraft(readQuestion());
  }

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  if (query) query.addEventListener("input", updateCards);
  if (filter) filter.addEventListener("change", updateCards);
  updateCards();

  if (!form) return;
  form.addEventListener("input", updatePreview);
  form.addEventListener("submit", function (event) { event.preventDefault(); updatePreview(); });
  var copy = form.querySelector("[data-copy-question]");
  if (copy) copy.addEventListener("click", function () {
    updatePreview();
    var text = preview.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { setStatus(isZh ? "问题草稿已复制。" : "Question draft copied."); });
    } else {
      preview.focus(); preview.select();
      setStatus(isZh ? "请按 Ctrl+C 复制。" : "Press Ctrl+C to copy the draft.");
    }
  });
  var openSteam = form.querySelector("[data-open-steam]");
  if (openSteam) openSteam.addEventListener("click", function () {
    updatePreview();
    window.open("https://steamcommunity.com/app/1501310/discussions/", "_blank", "noopener");
  });
  var sendReport = form.querySelector("[data-send-report]");
  if (sendReport) sendReport.addEventListener("click", function () {
    var values = readQuestion();
    if (!values.observation || !values.tried) {
      setStatus(isZh ? "先填写现象和尝试过的步骤。" : "Add what happened and what you tried first.");
      return;
    }
    var subject = (isZh ? "玩家问题：" : "Player question: ") + (values.topic || "The Ranchers");
    var body = buildDraft(values) + (isZh ? "\n\n我同意这只是待审核报告，不代表已确认事实。" : "\n\nI understand this is a report for review, not a confirmed game fact.");
    window.location.href = "mailto:contribute@theranchersguide.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  });
  updatePreview();
})();
