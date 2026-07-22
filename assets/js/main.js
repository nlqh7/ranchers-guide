/* The Ranchers Guide — shared JS: mobile nav + launch countdown */
(function () {
  "use strict";

  /* Mobile nav toggle */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Countdown to Early Access launch: July 30, 2026 (Steam release day) */
  var cdRoot = document.getElementById("countdown");
  if (cdRoot) {
    // Public launch window: July 30, 2026 at 10:00 AM PT / 17:00 UTC.
    var target = Date.UTC(2026, 6, 30, 17, 0, 0);
    var fields = {
      days: cdRoot.querySelector('[data-cd="days"] .cd-num'),
      hours: cdRoot.querySelector('[data-cd="hours"] .cd-num'),
      mins: cdRoot.querySelector('[data-cd="mins"] .cd-num'),
      secs: cdRoot.querySelector('[data-cd="secs"] .cd-num')
    };
    var pad = function (n) { return String(n).padStart(2, "0"); };

    function tick() {
      var now = Date.now();
      var diff = target - now;
      if (diff <= 0) {
        cdRoot.innerHTML = '<p class="countdown-note">The Ranchers Early Access is live on Steam — guides are being updated right now!</p>';
        return;
      }
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400);
      var h = Math.floor((s % 86400) / 3600);
      var m = Math.floor((s % 3600) / 60);
      var sec = s % 60;
      if (fields.days) fields.days.textContent = d;
      if (fields.hours) fields.hours.textContent = pad(h);
      if (fields.mins) fields.mins.textContent = pad(m);
      if (fields.secs) fields.secs.textContent = pad(sec);
    }
    tick();
    setInterval(tick, 1000);
  }

  /* Newsletter placeholder */
  var nl = document.querySelector("form.newsletter-form");
  if (nl) {
    nl.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = nl.querySelector(".fine");
      if (note) note.textContent = "Thanks! Our launch-day newsletter opens closer to release — check back soon.";
    });
  }

  /* Footer year */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
