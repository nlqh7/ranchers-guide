(function () {
  "use strict";

  var root = document.querySelector("[data-chicken-tool]");
  if (!root || !window.RanchersChickenTroubleshooter) return;
  var form = root.querySelector("[data-chicken-form]");
  var results = root.querySelector("[data-chicken-results]");
  var isChinese = document.documentElement.lang.toLowerCase() === "zh-cn";
  var locale = isChinese ? "zh" : "en";
  var data = null;

  function evidenceLabel(level) {
    var labels = isChinese
      ? { official: "官方", "community-confirmed": "多人印证", "unverified-lead": "待验证" }
      : { official: "Official", "community-confirmed": "Community-confirmed", "unverified-lead": "Needs verification" };
    return labels[level] || level;
  }

  function render(plan) {
    results.hidden = false;
    results.innerHTML = "";
    var heading = document.createElement("h2");
    heading.textContent = plan.title;
    var summary = document.createElement("p");
    summary.className = "troubleshooter-summary";
    summary.textContent = plan.summary;
    var list = document.createElement("ol");
    list.className = "troubleshooter-steps";
    plan.steps.forEach(function (step) {
      var item = document.createElement("li");
      var badge = document.createElement("span");
      badge.className = "evidence-badge " + (step.evidenceLevel === "official" ? "evidence-official" : step.evidenceLevel === "community-confirmed" ? "evidence-community" : "evidence-lead");
      badge.textContent = evidenceLabel(step.evidenceLevel);
      var copy = document.createElement("p");
      copy.textContent = step.text;
      item.appendChild(badge);
      item.appendChild(copy);
      list.appendChild(item);
    });
    var actions = document.createElement("div");
    actions.className = "troubleshooter-actions";
    var guide = document.createElement("a");
    guide.className = "btn";
    guide.href = plan.relatedUrl;
    guide.textContent = isChinese ? "打开完整攻略" : "Open the full guide";
    var report = document.createElement("a");
    report.className = "btn btn-outline";
    report.href = "/contribute?topic=animal";
    report.textContent = isChinese ? "提交仍可复现的问题" : "Report a remaining issue";
    actions.appendChild(guide);
    actions.appendChild(report);
    var sourceHeading = document.createElement("h3");
    sourceHeading.textContent = isChinese ? "本次清单使用的证据" : "Evidence used for this checklist";
    var sources = document.createElement("ul");
    sources.className = "troubleshooter-sources";
    plan.sourceIds.forEach(function (sourceId) {
      var source = data.sources[sourceId];
      var item = document.createElement("li");
      if (source.url) {
        var link = document.createElement("a");
        link.href = source.url;
        link.rel = "noopener noreferrer";
        link.textContent = source.title[locale] || source.title.en;
        item.appendChild(link);
      } else {
        item.textContent = (source.title[locale] || source.title.en) + (isChinese ? "（原链接未保留，不伪造）" : " (original URL not retained; no URL invented)");
      }
      sources.appendChild(item);
    });
    results.appendChild(heading);
    results.appendChild(summary);
    results.appendChild(list);
    results.appendChild(actions);
    results.appendChild(sourceHeading);
    results.appendChild(sources);
    results.focus();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!data || !form.reportValidity()) return;
    var values = new FormData(form);
    var answers = { build: values.get("build"), symptom: values.get("symptom") };
    render(window.RanchersChickenTroubleshooter.buildPlan(data, answers, locale));
    var params = new URLSearchParams();
    params.set("symptom", answers.symptom);
    window.history.replaceState(null, "", window.location.pathname + "?" + params.toString());
  });

  fetch("/data/chicken-troubleshooter.json")
    .then(function (response) {
      if (!response.ok) throw new Error("Unable to load troubleshooter data");
      return response.json();
    })
    .then(function (loaded) {
      data = loaded;
      var initial = new URLSearchParams(window.location.search).get("symptom");
      var option = form.querySelector('[name="symptom"] option[value="' + initial + '"]');
      if (option) form.elements.symptom.value = initial;
    })
    .catch(function () {
      results.hidden = false;
      results.innerHTML = "<p>" + (isChinese ? "排障数据暂时无法加载，请打开完整养鸡指南。" : "Troubleshooting data could not load. Open the full animal guide instead.") + "</p>";
    });
})();
