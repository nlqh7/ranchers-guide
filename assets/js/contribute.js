(function () {
  "use strict";

  var form = document.querySelector("[data-contribution-form]");
  var preview = document.querySelector("[data-contribution-preview]");
  if (!form || !preview || !window.RanchersContribute) return;

  function values() {
    var data = new FormData(form);
    return {
      topic: data.get("topic"),
      build: data.get("build"),
      platform: data.get("platform"),
      finding: data.get("finding"),
      method: data.get("method"),
      source: data.get("source"),
      credit: data.get("credit"),
    };
  }

  function updatePreview() {
    preview.textContent = window.RanchersContribute.buildSubmissionBody(values());
  }

  form.addEventListener("input", updatePreview);
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var body = window.RanchersContribute.buildSubmissionBody(values());
    var subject = "Player research: " + (values().topic || "The Ranchers");
    window.location.href = "mailto:hello@theranchersguide.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  });

  updatePreview();
})();
