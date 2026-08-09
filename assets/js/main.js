/* The Ranchers Guide - shared JS: mobile nav + footer year */
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

  /* Replace the Search nav link with a compact, progressively enhanced form.
     Skip it on pages whose first screen already has a large search box
     (home hero search, knowledge-base search, full search page) — the plain link stays there. */
  var cleanPath = window.location.pathname.replace(/\/index\.html$/, "").replace(/(.)\/$/, "$1") || "/";
  var isChinese = document.documentElement.lang.toLowerCase() === "zh-cn" || cleanPath.indexOf("/zh") === 0;
  var searchRoute = isChinese ? "/zh/search" : "/search";
  var pageHasMainSearch = ["/", "/database", "/search", "/zh", "/zh/database", "/zh/search"].indexOf(cleanPath) !== -1;
  var searchLink = links && links.querySelector('a[href="' + searchRoute + '"]');
  if (searchLink && searchLink.parentElement && !pageHasMainSearch) {
    var item = searchLink.parentElement;
    var form = document.createElement("form");
    var input = document.createElement("input");
    var button = document.createElement("button");

    item.classList.add("nav-search-item");
    form.className = "nav-search-form";
    form.action = searchRoute;
    form.method = "get";
    form.setAttribute("role", "search");

    input.type = "search";
    input.name = "q";
    input.placeholder = isChinese ? "搜索指南..." : "Search guide...";
    input.autocomplete = "off";
    input.setAttribute("aria-label", isChinese ? "搜索指南、数据和工具" : "Search guides, data and tools");
    if (cleanPath === searchRoute) {
      input.value = new URLSearchParams(window.location.search).get("q") || "";
    }

    button.type = "submit";
    button.setAttribute("aria-label", isChinese ? "搜索" : "Search");
    button.title = isChinese ? "搜索" : "Search";
    button.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

    form.addEventListener("submit", function (event) {
      if (!input.value.trim()) {
        event.preventDefault();
        input.focus();
      }
    });

    form.append(input, button);
    item.replaceChildren(form);
  }

  /* Keep one predictable language menu on every page. Core localized pages
     map one-to-one; English-only pages fall back to the Chinese home hub. */
  if (links && !links.querySelector("[data-language-menu]")) {
    var localizedPairs = {
      "/": "/zh/",
      "/database": "/zh/database",
      "/guides/beginners-guide": "/zh/guides/beginners-guide",
      "/database/animals": "/zh/database/animals",
      "/database/crops": "/zh/database/crops",
      "/map": "/zh/map",
      "/problems": "/zh/problems",
      "/search": "/zh/search"
    };
    var languageItem = document.createElement("li");
    var languageMenu = document.createElement("details");
    var languageSummary = document.createElement("summary");
    var languagePopover = document.createElement("div");
    var currentLanguage = document.createElement("span");
    var alternateLanguage = document.createElement("a");
    var englishPath = isChinese ? cleanPath.replace(/^\/zh(?=\/|$)/, "") || "/" : cleanPath;
    var chinesePath = localizedPairs[englishPath] || "/zh/";
    var globeIcon = '<svg class="language-menu-globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>';
    var chevronIcon = '<svg class="language-menu-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
    var checkIcon = '<svg class="language-menu-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';

    languageItem.className = "language-menu-item";
    languageMenu.className = "language-menu";
    languageMenu.dataset.languageMenu = "";
    languageSummary.className = "language-menu-summary";
    languageSummary.setAttribute("aria-label", isChinese ? "当前语言：简体中文" : "Current language: English");
    languageSummary.innerHTML = globeIcon + '<span class="language-menu-current">' + (isChinese ? "简体中文" : "English") + "</span>" + chevronIcon;
    languagePopover.className = "language-menu-popover";
    languagePopover.setAttribute("aria-label", isChinese ? "选择语言" : "Choose language");

    currentLanguage.className = "language-menu-option is-current";
    currentLanguage.lang = isChinese ? "zh-CN" : "en";
    currentLanguage.setAttribute("aria-current", "page");
    currentLanguage.innerHTML = '<span>' + (isChinese ? "简体中文" : "English") + "</span>" + checkIcon;

    alternateLanguage.className = "language-menu-option";
    alternateLanguage.href = isChinese ? englishPath : chinesePath;
    alternateLanguage.hreflang = isChinese ? "en" : "zh-CN";
    alternateLanguage.lang = isChinese ? "en" : "zh-CN";
    alternateLanguage.textContent = isChinese ? "English" : "简体中文";
    alternateLanguage.setAttribute("aria-label", isChinese ? "Switch to English" : "切换到简体中文");

    if (isChinese) languagePopover.append(alternateLanguage, currentLanguage);
    else languagePopover.append(currentLanguage, alternateLanguage);
    languageMenu.append(languageSummary, languagePopover);
    languageItem.appendChild(languageMenu);
    links.insertBefore(languageItem, links.lastElementChild);

    document.addEventListener("click", function (event) {
      if (languageMenu.open && !languageMenu.contains(event.target)) languageMenu.open = false;
    });
    languageMenu.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        languageMenu.open = false;
        languageSummary.focus();
      }
    });
  }

  /* Footer year */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* Re-apply answer anchors after deferred scripts and browser scroll restoration. */
  function jumpToHashTarget() {
    if (!window.location.hash) return;
    var id;
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch (_) {
      id = window.location.hash.slice(1);
    }
    var target = document.getElementById(id);
    if (target) target.scrollIntoView({ block: "start" });
  }

  window.setTimeout(jumpToHashTarget, 0);
  window.addEventListener("load", jumpToHashTarget);
  window.addEventListener("hashchange", jumpToHashTarget);
})();
