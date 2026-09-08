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

  var requestedTopic = new URLSearchParams(location.search).get("topic");
  if (requestedTopic === "map") {
    var topic = form.elements.topic;
    if (topic) topic.value = "Shop or location";
  }

  form.addEventListener("input", updatePreview);
  var copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "btn btn-outline";
  copyButton.textContent = "Copy report";
  var copyStatus = document.createElement("p");
  copyStatus.setAttribute("role", "status");
  copyStatus.setAttribute("aria-live", "polite");
  preview.insertAdjacentElement("afterend", copyButton);
  copyButton.insertAdjacentElement("afterend", copyStatus);
  copyButton.addEventListener("click", async function () {
    updatePreview();
    copyButton.disabled = true;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(preview.textContent);
      copyStatus.textContent = "Report copied. Paste it into an email to contribute@theranchersguide.com, attach your evidence, and send it.";
    } catch (_) {
      var range = document.createRange();
      range.selectNodeContents(preview);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      copyStatus.textContent = "Automatic copy was unavailable. The report is selected: copy it manually and paste it into your email.";
    } finally {
      copyButton.disabled = false;
    }
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var body = window.RanchersContribute.buildSubmissionBody(values());
    var subject = "Player research: " + (values().topic || "The Ranchers");
    window.location.href = "mailto:contribute@theranchersguide.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  });

  updatePreview();
})();
