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

  /* Keep one predictable language switch on every page. Core localized pages
     map one-to-one; English-only pages fall back to the Chinese home hub. */
  if (links && !links.querySelector("[data-language-switch]")) {
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
    var languageLink = document.createElement("a");
    var englishPath = isChinese ? cleanPath.replace(/^\/zh(?=\/|$)/, "") || "/" : cleanPath;
    languageLink.className = "language-switch";
    languageLink.dataset.languageSwitch = "";
    languageLink.href = isChinese ? englishPath : (localizedPairs[englishPath] || "/zh/");
    languageLink.hreflang = isChinese ? "en" : "zh-CN";
    languageLink.lang = isChinese ? "en" : "zh-CN";
    languageLink.textContent = isChinese ? "EN" : "中文";
    languageLink.setAttribute("aria-label", isChinese ? "Switch to English" : "切换到简体中文");
    languageItem.appendChild(languageLink);
    links.insertBefore(languageItem, links.lastElementChild);
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
