(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RanchersContribute = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clean(value) {
    return String(value || "").replace(/\r\n?/g, "\n").trim();
  }

  function buildSubmissionBody(values) {
    return [
      "The Ranchers Guide - player research submission",
      "",
      "Topic: " + clean(values.topic),
      "Build: " + clean(values.build),
      "Platform: " + clean(values.platform),
      "",
      "Finding: " + clean(values.finding),
      "",
      "Method: " + clean(values.method),
      "",
      "Evidence/source: " + clean(values.source),
      "Credit: " + (clean(values.credit) || "Anonymous"),
      "",
      "I understand this report enters a review queue and is not published automatically.",
    ].join("\n");
  }

  return { buildSubmissionBody: buildSubmissionBody };
});
