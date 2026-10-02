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

  function readUrlState(search, data) {
    var params = new URLSearchParams(search || "");
    var rawBuild = params.get("build");
    var rawSymptom = params.get("symptom");
    var builds = ["current", "older", "unknown"];
    var paths = data && data.paths ? data.paths : {};
    var build = builds.indexOf(rawBuild) !== -1 ? rawBuild : null;
    var symptom = rawSymptom && Object.prototype.hasOwnProperty.call(paths, rawSymptom) ? rawSymptom : null;
    var invalid = [];
    if (rawBuild !== null && !build) invalid.push("build");
    if (rawSymptom !== null && !symptom) invalid.push("symptom");
    return {
      build: build,
      symptom: symptom,
      canRender: Boolean(build && symptom),
      invalid: invalid,
    };
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

  return { buildPlan: buildPlan, readUrlState: readUrlState };
});
