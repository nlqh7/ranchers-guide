(function () {
  "use strict";

  var root = document.querySelector("[data-chicken-tool]");
  if (!root || !window.RanchersChickenTroubleshooter) return;
  var form = root.querySelector("[data-chicken-form]");
  var results = root.querySelector("[data-chicken-results]");
  var isChinese = document.documentElement.lang.toLowerCase() === "zh-cn";
  var locale = isChinese ? "zh" : "en";
  var data = null;
  var retryCount = 0;
  var maxRetries = 1;

  function languageText(en, zh) {
    return isChinese ? zh : en;
  }

  function setSelectValue(select, value) {
    if (!select) return;
    var options = select.options || [];
    var valid = "";
    for (var index = 0; index < options.length; index += 1) {
      if (options[index].value === value) {
        valid = value;
        break;
      }
    }
    select.value = valid;
  }

  function setBusy(isBusy) {
    if (isBusy) results.setAttribute("aria-busy", "true");
    else results.removeAttribute("aria-busy");
  }

  function setFormDisabled(disabled) {
    form.elements.build.disabled = disabled;
    form.elements.symptom.disabled = disabled;
    var submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = disabled;
  }

  function appendGuideLink(actions, label, href) {
    var guide = document.createElement("a");
    guide.className = "btn";
    guide.href = href;
    guide.textContent = label;
    actions.appendChild(guide);
    return guide;
  }

  function evidenceLabel(level) {
    var labels = isChinese
      ? { official: "官方", "community-confirmed": "多人印证", "unverified-lead": "待验证" }
      : { official: "Official", "community-confirmed": "Community-confirmed", "unverified-lead": "Needs verification" };
    return labels[level] || level;
  }

  function renderLoading() {
    results.hidden = false;
    results.innerHTML = "";
    setBusy(true);
    setFormDisabled(true);
    var status = document.createElement("p");
    status.setAttribute("role", "status");
    status.textContent = languageText("Loading the troubleshooting checklist…", "正在加载排障清单……");
    results.appendChild(status);
  }

  function renderFailure() {
    results.hidden = false;
    results.innerHTML = "";
    setBusy(false);
    setFormDisabled(false);
    var status = document.createElement("p");
    status.setAttribute("role", "alert");
    status.textContent = languageText(
      "Troubleshooting data could not load. The full animal guide is still available.",
      "排障数据暂时无法加载，但完整养鸡指南仍可打开。"
    );
    var actions = document.createElement("div");
    actions.className = "troubleshooter-actions";
    appendGuideLink(actions, languageText("Open the full animal guide", "打开完整养鸡指南"), isChinese ? "/zh/guides/animal-guide#troubleshooting" : "/guides/animal-guide#troubleshooting");
    var retry = document.createElement("button");
    retry.className = "btn btn-outline";
    retry.type = "button";
    retry.disabled = retryCount >= maxRetries;
    retry.textContent = retry.disabled
      ? languageText("Retry used — try again later", "已重试一次，请稍后再试")
      : languageText("Retry loading", "重试加载");
    retry.addEventListener("click", function (event) {
      if (event && event.preventDefault) event.preventDefault();
      if (retryCount >= maxRetries) return;
      retryCount += 1;
      loadData();
    });
    actions.appendChild(retry);
    results.appendChild(status);
    results.appendChild(actions);
  }

  function renderNotice(message) {
    results.hidden = false;
    results.innerHTML = "";
    setBusy(false);
    setFormDisabled(false);
    var status = document.createElement("p");
    status.setAttribute("role", "status");
    status.textContent = message;
    results.appendChild(status);
  }

  function render(plan, options) {
    options = options || {};
    results.hidden = false;
    results.innerHTML = "";
    setBusy(false);
    setFormDisabled(false);
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
    appendGuideLink(actions, languageText("Open the full guide", "打开完整攻略"), plan.relatedUrl);
    var report = document.createElement("a");
    report.className = "btn btn-outline";
    report.href = "/contribute?topic=animal";
    report.textContent = isChinese ? "提交仍可复现的问题" : "Report a remaining issue";
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
    if (options.focus) results.focus();
  }

  function restoreFromUrl(options) {
    if (!data) return;
    var state = window.RanchersChickenTroubleshooter.readUrlState(window.location.search, data);
    setSelectValue(form.elements.build, state.build || "");
    setSelectValue(form.elements.symptom, state.symptom || "");
    if (state.canRender) {
      render(window.RanchersChickenTroubleshooter.buildPlan(data, { build: state.build, symptom: state.symptom }, locale), options);
      return;
    }
    if (state.invalid.length) {
      renderNotice(languageText("An invalid URL value was ignored. Choose a valid version and symptom.", "链接中的版本或症状参数无效，已忽略。请选择有效的版本和症状。"));
    } else if (state.symptom && !state.build) {
      renderNotice(languageText("Symptom selected. Choose the game version before building a checklist.", "已选中症状。请选择游戏版本后再生成排查清单。"));
    } else {
      results.hidden = true;
      results.innerHTML = "";
      setBusy(false);
      setFormDisabled(false);
    }
  }

  function loadData() {
    renderLoading();
    fetch("/data/chicken-troubleshooter.json", { headers: { Accept: "application/json" } })
      .then(function (response) {
        if (!response.ok) throw new Error("Unable to load troubleshooter data");
        return response.json();
      })
      .then(function (loaded) {
        if (!loaded || !loaded.paths || !loaded.sources) throw new Error("Invalid troubleshooter data");
        data = loaded;
        restoreFromUrl({ focus: false });
      })
      .catch(function () {
        renderFailure();
      });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!data || !form.reportValidity()) return;
    var values = new FormData(form);
    var params = new URLSearchParams();
    params.set("build", values.get("build"));
    params.set("symptom", values.get("symptom"));
    window.history.pushState(null, "", window.location.pathname + "?" + params.toString());
    restoreFromUrl({ focus: true });
  });

  window.addEventListener("popstate", function () {
    restoreFromUrl({ focus: false });
  });

  loadData();
})();
