(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RanchersChickenTroubleshooter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function localize(value, locale) {
    if (value && typeof value === "object") return value[locale] || value.en || "";
    return String(value || "");
  }

  function buildPlan(data, answers, locale) {
    var language = locale === "zh" ? "zh" : "en";
    var path = data.paths[answers.symptom];
    if (!path) throw new Error("Unknown chicken symptom: " + answers.symptom);
    var rawSteps = [];
    if (answers.build !== "current") rawSteps.push(data.shared.updateFirst);
    rawSteps = rawSteps.concat(path.steps);
    var sourceIds = [];
    var steps = rawSteps.map(function (step) {
      (step.sourceIds || []).forEach(function (sourceId) {
        if (!data.sources[sourceId]) throw new Error("Missing source: " + sourceId);
        if (sourceIds.indexOf(sourceId) === -1) sourceIds.push(sourceId);
      });
      return {
        id: step.id,
        text: localize(step.text, language),
        evidenceLevel: step.evidenceLevel,
        sourceIds: (step.sourceIds || []).slice(),
      };
    });
    return {
      title: localize(path.title, language),
      summary: localize(path.summary, language),
      steps: steps,
      sourceIds: sourceIds,
      relatedUrl: localize(path.relatedUrl, language),
    };
  }

  return { buildPlan: buildPlan };
});
