/* The Ranchers Guide - shared JS: mobile nav + footer year */
(function () {
  "use strict";

  function activeNavHref(pathname, isChinese) {
    var clean = String(pathname || "/").replace(/\/index\.html$/, "").replace(/(.)\/$/, "$1") || "/";
    if (isChinese) {
      if (clean.indexOf("/zh/guides/") === 0) return "/zh/guides/beginners-guide";
      if (clean === "/zh/database" || clean.indexOf("/zh/database/") === 0) return "/zh/database";
      if (clean === "/zh/map") return "/zh/map";
      if (clean === "/zh/problems" || clean.indexOf("/zh/problems/") === 0) return "/zh/problems";
      if (clean === "/zh/search") return "/zh/search";
      return "";
    }

    if (clean.indexOf("/guides/") === 0) return "/guides/beginners-guide";
    if (clean === "/database" || clean.indexOf("/database/") === 0 || clean.indexOf("/tools/") === 0) return "/database";
    if (clean === "/map") return "/map";
    if (clean === "/problems" || clean.indexOf("/problems/") === 0) return "/problems";
    if (clean === "/research" || clean === "/community") return "/research";
    if (clean === "/search") return "/search";
    if (clean === "/contribute") return "/contribute";
    return "";
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { activeNavHref: activeNavHref };
  if (typeof document === "undefined" || typeof window === "undefined") return;

  /* Mobile nav toggle */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Keep one search entry per viewport: primary-search pages use their main
     search, while content pages get the compact header form. */
  var cleanPath = window.location.pathname.replace(/\/index\.html$/, "").replace(/(.)\/$/, "$1") || "/";
  var isChinese = document.documentElement.lang.toLowerCase() === "zh-cn" || cleanPath.indexOf("/zh") === 0;
  var searchRoute = isChinese ? "/zh/search" : "/search";
  var pageHasMainSearch = ["/", "/database", "/search", "/zh", "/zh/database", "/zh/search"].indexOf(cleanPath) !== -1;

  /* Normalize section highlighting so every page gives the same location cue. */
  if (links) {
    links.querySelectorAll("a.active, a[aria-current]").forEach(function (link) {
      link.classList.remove("active");
      link.removeAttribute("aria-current");
    });
    var activeHref = activeNavHref(cleanPath, isChinese);
    var activeLink = activeHref ? links.querySelector('a[href="' + activeHref + '"]') : null;
    if (activeLink) {
      activeLink.classList.add("active");
      activeLink.setAttribute("aria-current", "page");
    }
  }

  var searchLink = links && links.querySelector('a[href="' + searchRoute + '"]');
  if (searchLink && searchLink.parentElement) {
    if (pageHasMainSearch) {
      searchLink.parentElement.remove();
    } else {
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
