const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const { languageContextHref } = require("../assets/js/main.js");

const EN_ZH_SEARCH = "https://theranchersguide.com/zh/search";
const ZH_EN_SEARCH = "https://theranchersguide.com/search";
const EN_ZH_CROPS = "https://theranchersguide.com/zh/database/crops";
const EN_ZH_MAP = "https://theranchersguide.com/zh/map";
const ZH_EN_TROUBLESHOOTER = "https://theranchersguide.com/tools/chicken-troubleshooter";
const EN_ZH_GUIDE = "https://theranchersguide.com/zh/guides/money-making";

/* Whitelisted player context survives the language switch. */
assert.equal(languageContextHref(EN_ZH_SEARCH, "/search", "?q=corn", ""), EN_ZH_SEARCH + "?q=corn");
assert.equal(languageContextHref(ZH_EN_SEARCH, "/zh/search", "?q=%E7%8E%89%E7%B1%B3", ""), ZH_EN_SEARCH + "?q=%E7%8E%89%E7%B1%B3");
assert.equal(languageContextHref(EN_ZH_CROPS, "/database/crops", "", "#corn"), EN_ZH_CROPS + "#corn");
assert.equal(languageContextHref(EN_ZH_MAP, "/map", "?location=windmill", ""), EN_ZH_MAP + "?location=windmill");
assert.equal(languageContextHref(EN_ZH_MAP, "/map", "?q=bridge&category=service&location=windmill", ""), EN_ZH_MAP + "?q=bridge&category=service&location=windmill");
assert.equal(
  languageContextHref(ZH_EN_TROUBLESHOOTER, "/zh/tools/chicken-troubleshooter", "?build=current&symptom=missing", ""),
  ZH_EN_TROUBLESHOOTER + "?build=current&symptom=missing",
);

/* Unknown/tracking parameters never cross locales, and anchors only travel
   on routes whose bilingual pages share the same ids. */
assert.equal(languageContextHref(EN_ZH_SEARCH, "/search", "?q=corn&utm_source=newsletter", ""), EN_ZH_SEARCH + "?q=corn");
assert.equal(languageContextHref(EN_ZH_CROPS, "/database/crops", "?utm_campaign=x", "#corn"), EN_ZH_CROPS + "#corn");
assert.equal(languageContextHref(EN_ZH_GUIDE, "/guides/money-making", "", "#faq"), EN_ZH_GUIDE, "guide headings are localized, so the anchor must not be invented");
assert.equal(languageContextHref(EN_ZH_MAP, "/map", "?location=windmill&fbclid=abc", ""), EN_ZH_MAP + "?location=windmill");
assert.equal(languageContextHref("", "/search", "?q=corn", ""), "", "no counterpart page keeps the current behavior");

/* ------------------------------------------------------------------ */
/* Dynamic URLs: the rendered language link must follow live URL        */
/* changes (replaceState/pushState/hashchange), not an init snapshot.   */
/* ------------------------------------------------------------------ */

function stubElement(tag) {
  return {
    tagName: tag,
    attrs: {},
    className: "",
    href: "",
    innerHTML: "",
    children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute(key, value) { this.attrs[key] = value; },
    removeAttribute(key) { delete this.attrs[key]; },
    append(...kids) { this.children.push(...kids); },
    appendChild(kid) { this.children.push(kid); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    focus() {},
  };
}

function bootMain(overrides) {
  const options = Object.assign(
    {
      pathname: "/search",
      search: "?q=corn",
      hash: "",
      lang: "en",
      alternateHref: EN_ZH_SEARCH,
      reducedMotion: false,
      hashTargets: {},
    },
    overrides,
  );
  const location = { pathname: options.pathname, search: options.search, hash: options.hash };
  const languageLink = stubElement("a");
  const languageItem = stubElement("li");
  const links = Object.assign(stubElement("ul"), {
    querySelectorAll(selector) {
      return selector === ".nav-language-item" ? [] : [];
    },
    querySelector() { return null; },
    append(kid) { this.children.push(kid); },
  });
  const scrollCalls = [];
  const handlers = {};
  const on = (type, handler) => {
    handlers[type] = handlers[type] || [];
    handlers[type].push(handler);
  };
  const timers = [];
  const created = [];
  const documentStub = {
    documentElement: { lang: options.lang },
    body: stubElement("body"),
    createElement(tag) {
      let element;
      if (tag === "a" && created.filter((item) => item.tagName === "a" && item.className === "nav-language-link").length === 0 && !languageLink.used) {
        element = languageLink;
        languageLink.used = true;
      } else if (tag === "li" && !languageItem.used) {
        element = languageItem;
        languageItem.used = true;
      } else {
        element = stubElement(tag);
      }
      created.push(element);
      return element;
    },
    querySelector(selector) {
      if (selector === ".nav-links") return links;
      if (selector.indexOf('link[rel="alternate"]') === 0) {
        return options.alternateHref ? { getAttribute(name) { return name === "href" ? options.alternateHref : null; } } : null;
      }
      return null;
    },
    querySelectorAll() { return []; },
    getElementById(id) {
      if (!Object.prototype.hasOwnProperty.call(options.hashTargets, id)) return null;
      return {
        parentElement: null,
        scrollIntoView(arg) { scrollCalls.push({ id, arg }); },
      };
    },
    addEventListener: on,
  };
  const historyStub = {
    replaceState(_state, _title, url) {
      const parsed = String(url);
      const hashIndex = parsed.indexOf("#");
      const queryIndex = parsed.indexOf("?");
      location.pathname = parsed.split(/[?#]/)[0];
      location.search = queryIndex !== -1 && (hashIndex === -1 || queryIndex < hashIndex)
        ? parsed.slice(queryIndex, hashIndex === -1 ? undefined : hashIndex)
        : "";
      location.hash = hashIndex === -1 ? "" : parsed.slice(hashIndex);
    },
    pushState(_state, _title, url) { this.replaceState(_state, _title, url); },
  };
  const windowStub = {
    location,
    history: historyStub,
    matchMedia() { return { matches: options.reducedMotion }; },
    addEventListener: on,
    setTimeout(handler) { timers.push(handler); },
    scrollTo() {},
    scrollY: 0,
  };
  const context = {
    URLSearchParams,
    document: documentStub,
    window: windowStub,
    setTimeout: windowStub.setTimeout,
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "assets", "js", "main.js"), "utf8"), context);
  const fire = (type) => (handlers[type] || []).forEach((handler) => handler({}));
  return { languageLink, links, location, handlers, fire, timers, scrollCalls, windowStub };
}

/* Initial snapshot keeps the whitelisted query on the rendered link. */
const searchBoot = bootMain({});
assert.equal(searchBoot.languageLink.href, EN_ZH_SEARCH + "?q=corn", "initial language link keeps the search term");

/* replaceState by a page tool (map/search/troubleshooter) re-syncs the link. */
searchBoot.windowStub.history.replaceState(null, "", "/search?q=wheat");
assert.equal(searchBoot.languageLink.href, EN_ZH_SEARCH + "?q=wheat", "language link follows live URL changes");
searchBoot.windowStub.history.replaceState(null, "", "/search");
assert.equal(searchBoot.languageLink.href, EN_ZH_SEARCH, "cleared context drops from the link too");

/* Anchors sync on hashchange only for routes with shared bilingual ids. */
const cropsBoot = bootMain({ pathname: "/database/crops", search: "", alternateHref: EN_ZH_CROPS, hashTargets: { corn: true } });
assert.equal(cropsBoot.languageLink.href, EN_ZH_CROPS);
cropsBoot.location.hash = "#corn";
cropsBoot.fire("hashchange");
assert.equal(cropsBoot.languageLink.href, EN_ZH_CROPS + "#corn", "hashchange re-syncs the language link");

const guideBoot = bootMain({ pathname: "/guides/money-making", search: "", alternateHref: EN_ZH_GUIDE, hashTargets: { faq: true } });
guideBoot.location.hash = "#faq";
guideBoot.fire("hashchange");
assert.equal(guideBoot.languageLink.href, EN_ZH_GUIDE, "localized guide anchors stay off the counterpart link");

/* ---------------- TOC patch regression (kept from previous slice) --- */
/* Initial-load restoration stays instant; user navigation smooths only
   when reduced-motion is off, and never falls back under reduced-motion. */
const restoreBoot = bootMain({ hash: "#corn", hashTargets: { corn: true } });
restoreBoot.timers.forEach((run) => run());
assert.equal(JSON.stringify(restoreBoot.scrollCalls), JSON.stringify([{ id: "corn", arg: { behavior: "instant", block: "start" } }]), "deferred initial hash positioning must stay instant");

const reducedBoot = bootMain({ reducedMotion: true, hashTargets: { corn: true } });
reducedBoot.location.hash = "#corn";
reducedBoot.fire("hashchange");
assert.equal(JSON.stringify(reducedBoot.scrollCalls), JSON.stringify([{ id: "corn", arg: { behavior: "instant", block: "start" } }]), "reduced-motion users never get the smooth fallback");

const motionBoot = bootMain({ hashTargets: { corn: true } });
motionBoot.location.hash = "#corn";
motionBoot.fire("hashchange");
assert.equal(JSON.stringify(motionBoot.scrollCalls), JSON.stringify([{ id: "corn", arg: { behavior: "smooth", block: "start" } }]), "in-page clicks keep the smooth animation when motion is allowed");

console.log("PASS: language switching preserves whitelisted player context and follows live URL changes.");
