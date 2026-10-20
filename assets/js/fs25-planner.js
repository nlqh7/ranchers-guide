/* FS25 bread production planner — UI layer. OWNER: Kimi (interface & interaction).
   All data values (defaults, ratios, capacities, yield, month/harvest ranges)
   come from window.FS25PlannerData (fs25-planner-data.js). No chain numbers
   are written in this file.

   Interaction contract:
   - Enter in any field, or the single "Generate plan" action, computes the plan.
   - Editing any input marks the displayed plan stale instead of silently
     passing old numbers off as fresh results.
   - An empty monthly target gets an inline hint; 0 / negative / non-numeric /
     out-of-range values block the affected result. Nothing falls back silently.
   - Optional fields (run months, harvests, yield, existing facility counts)
     may stay blank: blank optional fields block only the output that depends
     on them (field area, or the shortfall/additional lines) with a nearby
     explanation, while bread/flour/wheat and facility totals still render.
     Blank existing counts are NOT zero — only an explicit count shows
     shortfall and additional-needed figures (D.facilityPlan).
   - Reference/sample values never load silently: data-backed advanced fields
     start blank, and only the explicit "Load sample data" action fills them,
     with the unconfirmed-data boundary stated next to the action.
   - "Save settings" stores the form under the existing FS25 localStorage key
     once required core values are valid and optional fields are blank or
     valid; invalid non-empty values are never saved, and old records without
     the existing-count fields restore with those counts left blank.
   - When an existing facility count is entered, the facility headline uses
     that count: covered demand shows no deficit warning, a zero/partial
     count shows the actual current shortfall plus the total needed. Blank
     counts keep the total-only headline and never imply a current shortfall.
   - Derived values that overflow the finite number range (huge targets or
     extreme ratios/capacities) show a bilingual overflow / depends-on-
     overflow message only in the affected sections; independent sections
     still render, and save/copy stay disabled with no stale copy text
     retained until every derived value computes to a finite number. */
(function () {
  "use strict";
  if (typeof document === "undefined") return;
  var D = window.FS25PlannerData;
  var root = document.getElementById("fs25-planner");
  if (!D || !root) return;

  var isZh = (document.documentElement.lang || "").toLowerCase().indexOf("zh") === 0;
  var chain = D.CHAIN;
  var assumptions = D.SOURCE_DATA.assumptions;
  var fixtures = D.SOURCE_DATA.fixtures || [];
  var sampleTarget = fixtures.length ? fixtures[0].targetBreadPerMonth : null;
  var bakery = chain.steps[0];
  var mill = chain.steps[1];
  var monthsSpec = assumptions.productionRunMonthsPerYear;
  var harvestsSpec = assumptions.harvestsPerYear;
  var STORE_KEY = "fs25-bread-planner-settings-v1";

  var T = isZh ? {
    enterTarget: "填写每月面包目标，然后点击“生成计划”。",
    targetHint: "请先在这里填写每月目标（升），再生成计划。",
    stale: "输入已修改——以下结果尚未更新。请重新点击“生成计划”。",
    errEmpty: "此字段为空——请输入数值，或点击“载入参考示例数据”。",
    errNan: "不是有效数字。",
    errPositive: "必须大于 0。",
    errInteger: "必须是整数。",
    errRange: "必须在 {min} 到 {max} 之间。",
    blocked: "已阻断——请先修正上方标红的字段。",
    flourLabel: "面粉 / 月",
    wheatLabel: "小麦 / 月",
    flourWord: "面粉",
    areaLabel: "小麦耕作面积（按每年生产运行 {m} 个月、每年收获 {h} 次）",
    facilityTitle: "设施核算",
    facilityShort: "1 座{name}每月缺口 {short} {unit}——需要 {count} 座。",
    facilityOk: "1 座{name}即可覆盖该目标。",
    facilityShortExisting: "现有 {n} 座{name}：当前缺口 {s} {unit}/月——共需 {total} 座。",
    facilityOkExisting: "现有 {n} 座{name}已能覆盖该目标。",
    overflow: "计算溢出——结果超出可表示的数值范围。请调小每月目标，或检查配比与产能输入。",
    overflowDepends: "无法计算——其依赖的上游结果已溢出。",
    facilityEffective: "{name}：有效产能 {cap} {unit}/月（{rule}）。",
    facilityDemand: "每月所需产出：{v} {unit}",
    facilityTotal: "设施总需求：{c} 座",
    facilityHave: "你已拥有：{n} 座",
    facilityShortNow: "当前缺口：{s} {unit}/月",
    facilityCovered: "现有设施已覆盖该需求。",
    facilityAdditional: "还需新增：{a} 座",
    facilityAdditionalNone: "还需新增：0 座——现有数量已足够。",
    facilityNoCount: "未填写现有数量——仅显示总需求。在上方“你已拥有的设施”中填入数量（没有就填 0），即可查看当前缺口与还需新增。空白不等于 0。",
    areaLabelPlain: "小麦耕作面积",
    areaSkipped: "未计算——产量、运行月数或收获次数为空。在“高级参数”中填写（或点击“载入参考示例数据”）后即可估算面积。",
    areaBlocked: "面积已阻断——请在“高级参数”中补全或修正产量、运行月数与收获次数。",
    ruleIndependent: "产线独立满速运行——产线数量不放大本配方产能",
    ruleShared: "{n} 条产线共享同一份月度产能（产能 ÷ {n}）",
    ruleSingle: "单条产线",
    saveOk: "已在本机保存当前有效设置。",
    saveInvalid: "存在无效输入，未保存——请先修正标红字段。",
    saveFail: "保存失败：浏览器拒绝了本地存储。",
    restored: "已恢复上次保存的有效设置——点击“生成计划”查看结果。",
    sampleLoaded: "已载入示例参考值——尚未实机确认，也并非逐项独立核实。请逐项核对后再信任计划结果。",
    copyOk: "计划已复制到剪贴板。",
    copyFail: "自动复制失败——请手动选择下方文本复制。",
    samplePrefix: "例如 ",
    textHeader: "FS25 面包生产计划（示例参考值，尚未实机确认，非逐项独立核实）",
    textTarget: "每月目标：{t} L 面包",
    textFlour: "面粉需求：{v} L/月",
    textWheat: "小麦需求：{v} L/月",
    textArea: "耕作面积：约 {v} 公顷（每年生产运行 {m} 个月、每年收获 {h} 次）",
    textFacility: "{name}：需要 {c} 座（有效产能 {e} {unit}/月，{rule}）",
    textFacilityExisting: "{name}：现有 {n} 座，当前缺口 {s} {unit}/月，还需新增 {a} 座"
  } : {
    enterTarget: "Enter a monthly bread target, then press “Generate plan”.",
    targetHint: "Enter your monthly target (litres) here first.",
    stale: "Inputs changed — the plan below has not been updated. Press “Generate plan” again.",
    errEmpty: "This field is empty — enter a value or press “Load sample data”.",
    errNan: "Not a valid number.",
    errPositive: "Must be greater than 0.",
    errInteger: "Must be a whole number.",
    errRange: "Must be between {min} and {max}.",
    blocked: "Blocked — fix the highlighted field(s) above first.",
    flourLabel: "flour / month",
    wheatLabel: "wheat / month",
    flourWord: "flour",
    areaLabel: "wheat field area (production runs {m} months/year, {h} harvests/year)",
    facilityTitle: "Facility check",
    facilityShort: "One {name} falls short by {short} {unit}/month — you need {count}.",
    facilityOk: "One {name} covers this target.",
    facilityShortExisting: "Existing {n} {name}: current shortfall {s} {unit}/month — {total} needed in total.",
    facilityOkExisting: "Your existing {n} {name} cover this target.",
    overflow: "Calculation overflow — the result is too large to represent. Lower the monthly target or check the ratio and capacity inputs.",
    overflowDepends: "Not calculable — an upstream result it depends on has overflowed.",
    facilityEffective: "{name}: {cap} {unit}/month effective ({rule}).",
    facilityDemand: "Required output: {v} {unit}/month",
    facilityTotal: "Total needed: {c}",
    facilityHave: "You already own: {n}",
    facilityShortNow: "Current shortfall: {s} {unit}/month",
    facilityCovered: "Your existing facilities cover this demand.",
    facilityAdditional: "Additional to buy: {a}",
    facilityAdditionalNone: "Additional to buy: 0 — you already have enough.",
    facilityNoCount: "No current count entered — showing total need only. Enter how many you own in “Facilities you already own” above (0 if none) to see the current shortfall and additional needed. Blank is not zero.",
    areaLabelPlain: "wheat field area",
    areaSkipped: "Not calculated — yield, run months or harvests are blank. Fill them in “Advanced” (or press “Load sample data”) to add an area estimate.",
    areaBlocked: "Area blocked — complete or fix yield, run months and harvests in “Advanced”.",
    ruleIndependent: "lines run independently at full capacity — line count does not multiply this recipe",
    ruleShared: "{n} lines share one monthly budget (capacity ÷ {n})",
    ruleSingle: "single line",
    saveOk: "Settings saved on this device.",
    saveInvalid: "Nothing saved — fix the highlighted fields first.",
    saveFail: "Save failed: the browser blocked local storage.",
    restored: "Restored your last valid saved settings — press “Generate plan”.",
    sampleLoaded: "Illustrative sample values loaded — not runtime-confirmed and not independently sourced value by value. Review each number before trusting a plan.",
    copyOk: "Plan copied to clipboard.",
    copyFail: "Automatic copy failed — select the text below and copy it manually.",
    samplePrefix: "e.g. ",
    textHeader: "FS25 bread production plan (illustrative sample values, not runtime-confirmed, not independently sourced)",
    textTarget: "Monthly target: {t} L bread",
    textFlour: "Flour needed: {v} L/month",
    textWheat: "Wheat needed: {v} L/month",
    textArea: "Field area: ~{v} ha (production runs {m} months/year, {h} harvests/year)",
    textFacility: "{name}: {c} needed (effective {e} {unit}/month, {rule})",
    textFacilityExisting: "{name}: existing {n}, current shortfall {s} {unit}/month, additional {a}"
  };

  function el(id) { return document.getElementById(id); }
  var fmt = function (n, d) {
    if (!isFinite(n)) return "—"; /* never render Infinity/NaN to the player */
    return Number(n).toLocaleString(isZh ? "zh-CN" : "en-US", { maximumFractionDigits: d == null ? 0 : d });
  };
  function sub(s, map) {
    return s.replace(/\{(\w+)\}/g, function (m, k) { return map[k] !== undefined ? map[k] : m; });
  }
  function attrNum(elm, name) {
    var v = parseFloat(elm && elm.getAttribute(name));
    return isFinite(v) ? v : null;
  }
  /* Overflow guard for derived products: prefer the data layer's
     finiteProduct when present, otherwise a local Number.isFinite guard.
     Never clamps or substitutes — overflow invalidates only the affected
     derived value. */
  var finiteProduct = typeof D.finiteProduct === "function"
    ? D.finiteProduct
    : function (a, b) { var v = a * b; return Number.isFinite(v) ? v : null; };

  /* Field specs: defaults and ranges come from FS25PlannerData where the data
     defines them, otherwise from the input's own HTML attributes (line counts).
     optional: blank is a valid state and blocks only the dependent output
     (area estimate, or shortfall/additional lines); required core values
     still block their dependent results when empty or invalid. */
  var F = [
    { key: "target", el: el("fp-target"), minEx: 0 },
    { key: "months", el: el("fp-months"), min: monthsSpec.min, max: monthsSpec.max, integer: true, def: monthsSpec.default, optional: true },
    { key: "harvests", el: el("fp-harvests"), min: harvestsSpec.min, max: harvestsSpec.max, integer: true, def: harvestsSpec.default, optional: true },
    { key: "yieldHa", el: el("fp-yield"), minEx: 0, def: chain.crop.yieldPerHa, optional: true },
    { key: "ratioBakery", el: el("fp-ratio-bakery"), minEx: 0, def: bakery.inputPerOutput },
    { key: "ratioMill", el: el("fp-ratio-mill"), minEx: 0, def: mill.inputPerOutput },
    { key: "capBakery", el: el("fp-cap-bakery"), minEx: 0, def: bakery.outputCapacityPerMonth },
    { key: "capMill", el: el("fp-cap-mill"), minEx: 0, def: mill.outputCapacityPerMonth },
    { key: "linesBakery", el: el("fp-share-bakery"), integer: true },
    { key: "linesMill", el: el("fp-share-mill"), integer: true },
    { key: "haveBakery", el: el("fp-have-bakery"), integer: true, min: 0, optional: true },
    { key: "haveMill", el: el("fp-have-mill"), integer: true, min: 0, optional: true }
  ];
  F.forEach(function (f) {
    if (f.min === undefined) f.min = attrNum(f.el, "min");
    if (f.max === undefined) f.max = attrNum(f.el, "max");
    if (f.def === undefined) f.def = attrNum(f.el, "value");
  });
  function field(key) {
    for (var i = 0; i < F.length; i++) if (F[i].key === key) return F[i];
    return null;
  }

  function validateValue(f, raw) {
    if (raw === "" || raw === null || raw === undefined) return { ok: false, reason: "empty" };
    var n = Number(raw);
    if (!isFinite(n)) return { ok: false, reason: "nan" };
    if (f.integer && n % 1 !== 0) return { ok: false, reason: "integer" };
    if (f.minEx !== undefined && f.minEx !== null && !(n > f.minEx)) return { ok: false, reason: "positive" };
    if (f.min !== undefined && f.min !== null && n < f.min) return { ok: false, reason: "range" };
    if (f.max !== undefined && f.max !== null && n > f.max) return { ok: false, reason: "range" };
    return { ok: true, value: n };
  }

  function errMsg(f, reason) {
    if (reason === "empty") return T.errEmpty;
    if (reason === "nan") return T.errNan;
    if (reason === "positive") return T.errPositive;
    if (reason === "integer") return T.errInteger;
    return sub(T.errRange, { min: fmt(f.min), max: f.max !== null && f.max !== undefined ? fmt(f.max) : "∞" });
  }
  function showError(f, reason) {
    f.el.classList.add("fp-invalid");
    f.el.setAttribute("aria-invalid", "true");
    var err = f.el.parentElement.querySelector(".fp-field-error");
    if (!err) {
      err = document.createElement("p");
      err.className = "fp-field-error";
      f.el.parentElement.appendChild(err);
    }
    err.textContent = errMsg(f, reason);
    err.hidden = false;
  }
  function clearError(f) {
    f.el.classList.remove("fp-invalid");
    f.el.removeAttribute("aria-invalid");
    var err = f.el.parentElement && f.el.parentElement.querySelector(".fp-field-error");
    if (err) err.hidden = true;
  }

  function readForm(showErrors) {
    var out = {};
    F.forEach(function (f) {
      var r = validateValue(f, f.el.value.trim());
      if (showErrors) {
        /* A blank optional field is a valid state, not an error: the blocked
           output itself carries the explanation next to the result. */
        if (r.ok || (f.optional && r.reason === "empty")) clearError(f);
        else showError(f, r.reason);
      }
      out[f.key] = r;
    });
    out.ruleBakery = el("fp-rule-bakery").value === "independent" ? "independent" : "divided";
    out.ruleMill = el("fp-rule-mill").value === "independent" ? "independent" : "divided";
    return out;
  }
  function isBlank(r) { return !r.ok && r.reason === "empty"; }
  function coreValid(r) {
    return F.every(function (f) { return f.optional ? true : r[f.key].ok; });
  }
  function optionalClean(r) {
    return F.every(function (f) { return !f.optional ? true : (r[f.key].ok || isBlank(r[f.key])); });
  }
  function saveable(r) {
    return coreValid(r) && optionalClean(r) && !formDerivedOverflow(r);
  }

  /* ---------- state ---------- */
  var planShown = false;
  var planComplete = false;
  var lastPlanText = "";
  var resultsEl = el("fp-results");
  var staleEl = el("fp-stale");
  var saveBtn = el("fp-save");
  var saveStatus = el("fp-save-status");
  var copyBtn = el("fp-copy");
  var copyStatus = el("fp-copy-status");
  var copyManual = el("fp-copy-manual");
  var targetHint = el("fp-target-hint");
  var loadStatus = el("fp-load-status");

  function ruleText(rule, lines) {
    if (rule === "independent") return T.ruleIndependent;
    return lines > 1 ? sub(T.ruleShared, { n: fmt(lines) }) : T.ruleSingle;
  }
  function blockedHtml() {
    return '<p class="fp-blocked" role="alert">' + T.blocked + '</p>';
  }
  function overflowHtml(msg) {
    return '<p class="fp-blocked" role="alert">' + msg + '</p>';
  }
  function numCard(value, label, blocked) {
    if (blocked) {
      return '<div class="fp-card fp-card-blocked"><span class="fp-label">' + label + '</span>' + blockedHtml() + '</div>';
    }
    return '<div class="fp-card"><span class="fp-num">' + value + '</span><span class="fp-label">' + label + '</span></div>';
  }
  function overflowCard(label, msg) {
    return '<div class="fp-card fp-card-blocked"><span class="fp-label">' + label + '</span>' + overflowHtml(msg) + '</div>';
  }
  /* state (optional) collects derived-overflow flags so generate() can keep
     save/copy disabled until every section computes finite values. */
  function facilityHtml(name, ok, throughput, capR, linesR, rule, existingR, unit, state) {
    if (!ok) return '<div class="fp-facility"><h4>' + name + '</h4>' + blockedHtml() + '</div>';
    if (throughput === null || !isFinite(throughput)) {
      if (state) state.overflow = true;
      return '<div class="fp-facility"><h4>' + name + '</h4>' + overflowHtml(T.overflowDepends) + '</div>';
    }
    /* Blank existing count stays null (blank is not zero); an invalid
       non-empty count falls back to total-only while its field shows the error. */
    var existing = existingR && existingR.ok ? existingR.value : null;
    var plan = D.facilityPlan(throughput, capR.value, linesR.value, rule, existing);
    if (!plan || !isFinite(plan.effective) || !isFinite(plan.totalNeeded) ||
        (plan.shortfall !== null && !isFinite(plan.shortfall)) ||
        (plan.additionalNeeded !== null && !isFinite(plan.additionalNeeded))) {
      if (state) state.overflow = true;
      return '<div class="fp-facility"><h4>' + name + '</h4>' + overflowHtml(T.overflow) + '</div>';
    }
    var head;
    if (plan.existingCount !== null) {
      /* A known count drives the headline: covered demand shows no deficit
         warning; a zero/partial count shows the actual current shortfall
         plus the total needed. */
      head = plan.shortfall > 0
        ? '<p class="fp-gap" role="alert">' + sub(T.facilityShortExisting, { name: name, n: fmt(plan.existingCount), s: fmt(plan.shortfall), unit: unit, total: fmt(plan.totalNeeded) }) + '</p>'
        : '<p class="fp-ok">' + sub(T.facilityOkExisting, { name: name, n: fmt(plan.existingCount) }) + '</p>';
    } else {
      /* Blank count: total-only headline, never implying a current shortfall. */
      head = "";
    }
    var stats = '<ul class="fp-stats">' +
      '<li>' + sub(T.facilityDemand, { v: fmt(throughput), unit: unit }) + '</li>' +
      '<li>' + sub(T.facilityEffective, { name: name, cap: fmt(plan.effective), unit: unit, rule: ruleText(rule, linesR.value) }) + '</li>' +
      '<li><strong>' + sub(T.facilityTotal, { c: fmt(plan.totalNeeded) }) + '</strong></li>';
    if (plan.existingCount !== null) {
      stats += '<li>' + sub(T.facilityHave, { n: fmt(plan.existingCount) }) + '</li>';
      stats += plan.shortfall > 0
        ? '<li class="fp-stats-warn">' + sub(T.facilityShortNow, { s: fmt(plan.shortfall), unit: unit }) + '</li>'
        : '<li class="fp-ok">' + T.facilityCovered + '</li>';
      stats += plan.additionalNeeded > 0
        ? '<li class="fp-stats-add">' + sub(T.facilityAdditional, { a: fmt(plan.additionalNeeded) }) + '</li>'
        : '<li class="fp-stats-add">' + T.facilityAdditionalNone + '</li>';
    } else {
      stats += '<li class="fp-stats-note">' + T.facilityNoCount + '</li>';
    }
    stats += '</ul>';
    return '<div class="fp-facility"><h4>' + name + '</h4>' + head + stats + '</div>';
  }

  function facilityTextLines(name, throughput, capR, linesR, rule, existingR, unit) {
    var existing = existingR && existingR.ok ? existingR.value : null;
    var plan = D.facilityPlan(throughput, capR.value, linesR.value, rule, existing);
    if (!plan || !isFinite(plan.effective) || !isFinite(plan.totalNeeded) ||
        (plan.shortfall !== null && !isFinite(plan.shortfall)) ||
        (plan.additionalNeeded !== null && !isFinite(plan.additionalNeeded))) return [];
    var out = [sub(T.textFacility, { name: name, c: fmt(plan.totalNeeded), e: fmt(plan.effective), unit: unit, rule: ruleText(rule, linesR.value) })];
    if (plan.existingCount !== null) {
      out.push(sub(T.textFacilityExisting, { name: name, n: fmt(plan.existingCount), s: fmt(plan.shortfall), unit: unit, a: fmt(plan.additionalNeeded) }));
    }
    return out;
  }
  /* area may be null: the area line is only included when it was calculated. */
  function buildText(r, flour, wheat, area, bakeryName, millName, breadUnit, flourUnit) {
    var lines = [
      T.textHeader,
      sub(T.textTarget, { t: fmt(r.target.value) }),
      sub(T.textFlour, { v: fmt(flour) }),
      sub(T.textWheat, { v: fmt(wheat) })
    ];
    if (area !== null) {
      lines.push(sub(T.textArea, { v: area.toFixed(1), m: fmt(r.months.value), h: fmt(r.harvests.value) }));
    }
    return lines
      .concat(facilityTextLines(bakeryName, r.target.value, r.capBakery, r.linesBakery, r.ruleBakery, r.haveBakery, breadUnit))
      .concat(facilityTextLines(millName, flour, r.capMill, r.linesMill, r.ruleMill, r.haveMill, flourUnit))
      .join("\n");
  }

  /* True when currently valid inputs would still produce a non-finite
     derived product — saving such a plan is refused (stored records are
     never clamped or overwritten). */
  function formDerivedOverflow(r) {
    var flour = null, wheat = null;
    if (r.target.ok && r.ratioBakery.ok) {
      flour = finiteProduct(r.target.value, r.ratioBakery.value);
      if (flour === null) return true;
      if (r.ratioMill.ok) {
        wheat = finiteProduct(flour, r.ratioMill.value);
        if (wheat === null) return true;
      }
    }
    if (wheat !== null && r.months.ok && r.harvests.ok && r.yieldHa.ok &&
      D.areaHa(wheat, r.months.value, r.yieldHa.value, r.harvests.value) === null) return true;
    if (r.target.ok && r.capBakery.ok && r.linesBakery.ok &&
      !D.facilityPlan(r.target.value, r.capBakery.value, r.linesBakery.value, r.ruleBakery,
        r.haveBakery.ok ? r.haveBakery.value : null)) return true;
    if (flour !== null && r.capMill.ok && r.linesMill.ok &&
      !D.facilityPlan(flour, r.capMill.value, r.linesMill.value, r.ruleMill,
        r.haveMill.ok ? r.haveMill.value : null)) return true;
    return false;
  }

  function updateActions() {
    var r = readForm(false);
    saveBtn.disabled = !saveable(r);
    copyBtn.disabled = !(planShown && planComplete && staleEl.hidden);
  }

  function generate() {
    root.classList.remove("fp-stale");
    staleEl.hidden = true;
    copyStatus.textContent = "";
    copyManual.hidden = true;
    var r = readForm(true);

    if (r.target.reason === "empty") {
      clearError(field("target"));
      targetHint.hidden = false;
      resultsEl.innerHTML = '<p class="fp-empty">' + T.enterTarget + '</p>';
      planShown = false;
      planComplete = false;
      lastPlanText = "";
      updateActions();
      return;
    }
    targetHint.hidden = true;

    if (r.target.ok) {
      var missingCore = F.find(function (f) { return !f.optional && !r[f.key].ok; });
      var parameters = el("fp-parameters");
      if (missingCore && parameters) {
        parameters.open = true;
        missingCore.el.focus();
      }
    }

    var flourOk = r.target.ok && r.ratioBakery.ok;
    var wheatOk = flourOk && r.ratioMill.ok;
    var bakeryOk = r.target.ok && r.capBakery.ok && r.linesBakery.ok;
    var millOk = flourOk && r.capMill.ok && r.linesMill.ok;
    var areaOk = wheatOk && r.months.ok && r.harvests.ok && r.yieldHa.ok;
    /* Blank optional area fields are a distinct state from invalid ones:
       all blank → neutral "not calculated" note; partial/invalid → blocked. */
    var areaAllBlank = isBlank(r.months) && isBlank(r.harvests) && isBlank(r.yieldHa);

    var flour = null, flourOverflow = false;
    if (flourOk) {
      flour = finiteProduct(r.target.value, r.ratioBakery.value);
      if (flour === null) flourOverflow = true;
    }
    /* wheatState / areaState: null when computed, "overflow" when the value
       itself exceeds the finite range, "depends" when an upstream derived
       value already overflowed. */
    var wheat = null, wheatState = null;
    if (wheatOk) {
      if (flour === null) {
        wheatState = "depends";
      } else {
        wheat = finiteProduct(flour, r.ratioMill.value);
        if (wheat === null) wheatState = "overflow";
      }
    }
    var area = null, areaState = null;
    if (areaOk) {
      if (wheat === null) {
        areaState = "depends";
      } else {
        var a = D.areaHa(wheat, r.months.value, r.yieldHa.value, r.harvests.value);
        if (a === null || !isFinite(a)) areaState = "overflow";
        else area = a;
      }
    }

    var bakeryName = isZh ? bakery.zhFacility : bakery.facility;
    var millName = isZh ? mill.zhFacility : mill.facility;
    var breadUnit = "L " + (isZh ? chain.product.zhName : chain.product.name.toLowerCase());
    var flourUnit = "L " + T.flourWord;
    var areaLabel = sub(T.areaLabel, {
      m: r.months.ok ? fmt(r.months.value) : "?",
      h: r.harvests.ok ? fmt(r.harvests.value) : "?"
    });

    var areaCard;
    if (areaOk && areaState === "depends") {
      areaCard = overflowCard(T.areaLabelPlain, T.overflowDepends);
    } else if (areaOk && areaState === "overflow") {
      areaCard = overflowCard(T.areaLabelPlain, T.overflow);
    } else if (areaOk) {
      areaCard = numCard(area.toFixed(1) + " ha", areaLabel, false);
    } else if (!wheatOk) {
      areaCard = numCard("", T.areaLabelPlain, true);
    } else if (areaAllBlank) {
      areaCard = '<div class="fp-card fp-card-skipped"><span class="fp-label">' + T.areaLabelPlain + '</span>' +
        '<p class="fp-skipped-note">' + T.areaSkipped + '</p></div>';
    } else {
      areaCard = '<div class="fp-card fp-card-blocked"><span class="fp-label">' + T.areaLabelPlain + '</span>' +
        '<p class="fp-blocked" role="alert">' + T.areaBlocked + '</p></div>';
    }

    var flourCard = !flourOk ? numCard("", T.flourLabel, true)
      : flourOverflow ? overflowCard(T.flourLabel, T.overflow)
      : numCard(fmt(flour) + " L", T.flourLabel, false);
    var wheatCard = !wheatOk ? numCard("", T.wheatLabel, true)
      : wheatState === "depends" ? overflowCard(T.wheatLabel, T.overflowDepends)
      : wheatState === "overflow" ? overflowCard(T.wheatLabel, T.overflow)
      : numCard(fmt(wheat) + " L", T.wheatLabel, false);

    var bakeryState = { overflow: false };
    var millState = { overflow: false };

    resultsEl.innerHTML =
      '<div class="fp-cards">' +
        flourCard +
        wheatCard +
        areaCard +
      '</div>' +
      '<div class="fp-facilities"><h4>' + T.facilityTitle + '</h4>' +
        facilityHtml(bakeryName, bakeryOk, r.target.ok ? r.target.value : 0, r.capBakery, r.linesBakery, r.ruleBakery, r.haveBakery, breadUnit, bakeryState) +
        facilityHtml(millName, millOk, flour, r.capMill, r.linesMill, r.ruleMill, r.haveMill, flourUnit, millState) +
      '</div>';

    var derivedOverflow = flourOverflow || wheatState !== null || areaState !== null ||
      bakeryState.overflow || millState.overflow;
    planShown = true;
    planComplete = coreValid(r) && optionalClean(r) && !derivedOverflow;
    /* No stale copy text is retained for an incomplete/overflowing plan. */
    lastPlanText = planComplete
      ? buildText(r, flour, wheat, area, bakeryName, millName, breadUnit, flourUnit)
      : "";
    updateActions();
  }

  function onEdit(evt) {
    if (planShown) {
      root.classList.add("fp-stale");
      staleEl.hidden = false;
    }
    if (evt && evt.target) {
      F.forEach(function (f) { if (f.el === evt.target) clearError(f); });
      if (evt.target === field("target").el) targetHint.hidden = true;
    }
    updateActions();
  }

  /* ---------- sample loader / save / restore ----------
     fillDefaults runs ONLY on the explicit "Load sample data" action, never
     on init: reference values must not appear as if they were verified. */
  function fillDefaults() {
    F.forEach(function (f) {
      if (f.key === "target") return;
      if (f.def !== null && f.def !== undefined) f.el.value = String(f.def);
      clearError(f);
    });
    el("fp-rule-bakery").value = bakery.sharingRule;
    el("fp-rule-mill").value = mill.sharingRule;
  }

  saveBtn.addEventListener("click", function () {
    var r = readForm(true);
    if (!saveable(r)) {
      saveStatus.textContent = T.saveInvalid;
      return;
    }
    /* Blank optional fields are stored as null, never as invented values. */
    var data = { v: 1, ruleBakery: r.ruleBakery, ruleMill: r.ruleMill };
    F.forEach(function (f) { data[f.key] = r[f.key].ok ? r[f.key].value : null; });
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      saveStatus.textContent = T.saveOk;
    } catch (e) {
      saveStatus.textContent = T.saveFail;
    }
  });

  function restore() {
    var raw;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return; }
    if (!raw) return;
    var s;
    try { s = JSON.parse(raw); } catch (e) { return; }
    if (!s || typeof s !== "object") return;
    var ok = true;
    F.forEach(function (f) {
      var v = s[f.key];
      /* Missing/null is acceptable only for optional fields — this is how
         old records without the existing-count fields restore with blanks. */
      if (v === undefined || v === null || v === "") { if (!f.optional) ok = false; return; }
      if (!validateValue(f, v).ok) ok = false;
    });
    if (["divided", "independent"].indexOf(s.ruleBakery) < 0) ok = false;
    if (["divided", "independent"].indexOf(s.ruleMill) < 0) ok = false;
    if (!ok) return; /* never apply partial or invalid stored state */
    var restoredInputs = { ruleBakery: s.ruleBakery, ruleMill: s.ruleMill };
    F.forEach(function (f) { restoredInputs[f.key] = validateValue(f, s[f.key]); });
    if (formDerivedOverflow(restoredInputs)) return; /* retain raw storage without applying an unusable plan */
    F.forEach(function (f) {
      var v = s[f.key];
      f.el.value = (v === undefined || v === null) ? "" : String(v);
    });
    el("fp-rule-bakery").value = s.ruleBakery;
    el("fp-rule-mill").value = s.ruleMill;
    saveStatus.textContent = T.restored;
  }

  el("fp-reset").addEventListener("click", function () {
    fillDefaults();
    if (loadStatus) loadStatus.textContent = T.sampleLoaded;
    onEdit({});
  });

  /* ---------- copy ---------- */
  copyBtn.addEventListener("click", function () {
    copyStatus.textContent = "";
    copyManual.hidden = true;
    function manual() {
      copyStatus.textContent = T.copyFail;
      copyManual.value = lastPlanText;
      copyManual.hidden = false;
      copyManual.focus();
      copyManual.select();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastPlanText).then(function () {
        copyStatus.textContent = T.copyOk;
      }, manual);
    } else {
      manual();
    }
  });

  /* ---------- sources (rendered from SOURCE_DATA, kept in sync by build) ---------- */
  function renderSources() {
    var ul = el("fp-sources-list");
    if (!ul) return;
    D.SOURCE_DATA.sources.forEach(function (s) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = s.url;
      a.rel = "noopener noreferrer";
      a.textContent = isZh ? s.zhLabel : s.label;
      li.appendChild(a);
      li.appendChild(document.createTextNode(" — " + (isZh ? s.zhNote : s.note)));
      ul.appendChild(li);
    });
  }

  /* ---------- init ---------- */
  var form = el("fp-form");
  if (form) form.addEventListener("submit", function (e) { e.preventDefault(); generate(); });
  root.addEventListener("input", onEdit);
  root.addEventListener("change", onEdit);
  if (sampleTarget !== null) field("target").el.placeholder = T.samplePrefix + fmt(sampleTarget);
  restore();
  renderSources();
  updateActions();
})();
