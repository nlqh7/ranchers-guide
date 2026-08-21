(function () {
  "use strict";

  var form = document.querySelector("[data-player-report-form]");
  var configNode = document.getElementById("player-report-config");
  var empty = document.querySelector("[data-report-empty]");
  var output = document.querySelector("[data-report-output]");
  if (!form || !configNode || !empty || !output) return;

  var topics = JSON.parse(configNode.textContent || "[]");
  var isZh = document.documentElement.lang.toLowerCase() === "zh-cn";
  var preview = output.querySelector("[data-report-preview]");
  var route = output.querySelector("[data-report-route]");
  var routeLabel = output.querySelector("[data-report-route-label]");
  var prompt = output.querySelector("[data-report-prompt]");
  var checklist = output.querySelector("[data-report-checklist]");
  var status = output.querySelector("[data-report-status]");

  function clean(value) { return String(value || "").replace(/\r\n?/g, "\n").trim(); }
  function values() {
    var data = new FormData(form);
    return {
      topic: clean(data.get("topic")), build: clean(data.get("build")), platform: clean(data.get("platform")),
      context: clean(data.get("context")), observation: clean(data.get("observation")), steps: clean(data.get("steps")),
      expected: clean(data.get("expected")), screenshot: clean(data.get("screenshot")),
    };
  }
  function selected(values) { return topics.find(function (topic) { return topic.id === values.topic; }) || topics[0]; }
  function buildText(data, topic) {
    var labels = isZh ? { heading: "The Ranchers 玩家问题报告", topic: "主题", build: "版本", platform: "平台", context: "场景", observation: "现象", steps: "步骤", expected: "期待", screenshot: "截图", ask: "有人能在当前版本复现或确认吗？" } : { heading: "The Ranchers player report", topic: "Topic", build: "Build", platform: "Platform", context: "Context", observation: "What happened", steps: "Steps tried", expected: "Expected", screenshot: "Screenshot", ask: "Can anyone reproduce or confirm this on the current build?" };
    var lines = [labels.heading, "", labels.topic + ": " + (isZh ? topic.labelZh : topic.label), labels.build + ": " + data.build, labels.platform + ": " + data.platform];
    if (data.context) lines.push(labels.context + ": " + data.context);
    lines.push("", labels.observation + ": " + data.observation, "", labels.steps + ": " + data.steps);
    if (data.expected) lines.push("", labels.expected + ": " + data.expected);
    if (data.screenshot) lines.push("", labels.screenshot + ": " + data.screenshot);
    lines.push("", labels.ask);
    return lines.join("\n");
  }
  function setStatus(message) { if (status) status.textContent = message; }
  function render() {
    var data = values();
    var topic = selected(data);
    var hasMinimum = data.observation.length >= 10 && data.steps.length >= 10;
    empty.hidden = hasMinimum;
    output.hidden = !hasMinimum;
    if (!hasMinimum) return;
    routeLabel.textContent = isZh ? topic.routeLabelZh : topic.routeLabel;
    prompt.textContent = isZh ? topic.promptZh : topic.prompt;
    route.href = isZh ? topic.routeZh : topic.route;
    checklist.innerHTML = (isZh ? topic.checksZh : topic.checks).map(function (item) { return "<li>" + item.replace(/[&<>\"]/g, function (char) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[char]; }) + "</li>"; }).join("");
    preview.value = buildText(data, topic);
  }
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (event) { event.preventDefault(); render(); });
  var copy = output.querySelector("[data-report-copy]");
  if (copy) copy.addEventListener("click", function () {
    if (!preview.value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(preview.value).then(function () { setStatus(isZh ? "报告已复制。" : "Report copied."); }).catch(function () { preview.focus(); preview.select(); setStatus(isZh ? "请按 Ctrl+C 复制。" : "Press Ctrl+C to copy."); });
    } else {
      preview.focus(); preview.select(); setStatus(isZh ? "请按 Ctrl+C 复制。" : "Press Ctrl+C to copy.");
    }
  });
  var steam = output.querySelector("[data-report-steam]");
  if (steam) steam.addEventListener("click", function () { window.open("https://steamcommunity.com/app/1501310/discussions/", "_blank", "noopener"); });
  var email = output.querySelector("[data-report-email]");
  if (email) email.addEventListener("click", function () {
    var data = values();
    if (data.observation.length < 10 || data.steps.length < 10) { setStatus(isZh ? "先填写现象和步骤。" : "Add what happened and the steps first."); return; }
    var topic = selected(data);
    var subject = (isZh ? "玩家问题：" : "Player report: ") + (isZh ? topic.labelZh : topic.label);
    var body = preview.value + (isZh ? "\n\n我知道这是一条待审核报告，不代表已确认事实。" : "\n\nI understand this is a report for review, not a confirmed game fact.");
    window.location.href = "mailto:contribute@theranchersguide.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  });
  render();
})();
