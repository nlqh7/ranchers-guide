const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const data = JSON.parse(read("data/chicken-troubleshooter.json"));
const core = require("../assets/js/chicken-troubleshooter-core.js");
const uiSource = read("assets/js/chicken-troubleshooter.js");

for (const source of Object.values(data.sources)) {
  assert.ok(source.url === null || /^https:\/\//.test(source.url), "Source URLs must be verifiable or explicitly unknown");
}

const oldMissing = core.buildPlan(data, { build: "older", symptom: "missing" }, "en");
assert.equal(oldMissing.steps[0].id, "update-first");
assert.match(oldMissing.steps[0].text, /update/i);
assert.doesNotMatch(oldMissing.steps.map((step) => step.text).join(" "), /demolish.*first/i);

const currentAutomation = core.buildPlan(data, { build: "current", symptom: "automation" }, "en");
assert.match(currentAutomation.steps.map((step) => step.text).join(" "), /water contract/i);
assert.match(currentAutomation.steps.map((step) => step.text).join(" "), /green light/i);

const chineseLargeEgg = core.buildPlan(data, { build: "current", symptom: "large-eggs" }, "zh");
assert.match(chineseLargeEgg.summary, /随机|保证/);
assert.ok(chineseLargeEgg.sourceIds.length > 0);

for (const relativePath of ["tools/chicken-troubleshooter.html", "zh/tools/chicken-troubleshooter.html"]) {
  const html = read(relativePath);
  assert.match(html, /data-chicken-tool/);
  assert.match(html, /chicken-troubleshooter-core\.js/);
  assert.match(html, /chicken-troubleshooter\.js/);
  assert.match(html, /data-chicken-results/);
}

const english = read("tools/chicken-troubleshooter.html");
const chinese = read("zh/tools/chicken-troubleshooter.html");
assert.match(english, /hreflang="zh-CN" href="https:\/\/theranchersguide\.com\/zh\/tools\/chicken-troubleshooter"/);
assert.match(chinese, /hreflang="en" href="https:\/\/theranchersguide\.com\/tools\/chicken-troubleshooter"/);

/* URL/state and dynamic UI regression seam. This deliberately runs the shipped
 * browser script against a tiny DOM fixture so submit/popstate/fetch behavior
 * is tested at its actual call boundary rather than by static string checks. */
function syncFulfilled(value) {
  return {
    then(onFulfilled) {
      try { return syncNormalize(onFulfilled(value)); } catch (error) { return syncRejected(error); }
    },
    catch() { return this; },
  };
}
function syncRejected(error) {
  return {
    then(_onFulfilled, onRejected) {
      if (!onRejected) return this;
      try { return syncNormalize(onRejected(error)); } catch (nextError) { return syncRejected(nextError); }
    },
    catch(onRejected) {
      try { return syncNormalize(onRejected(error)); } catch (nextError) { return syncRejected(nextError); }
    },
  };
}
function syncNormalize(value) {
  return value && typeof value.then === "function" ? value : syncFulfilled(value);
}
function makeNode(tagName) {
  const node = { tagName, children: [], listeners: {}, attributes: {}, hidden: false, disabled: false, className: "", href: "", _text: "", _html: "" };
  Object.defineProperty(node, "textContent", {
    get() { return node._text + node.children.map(child => child.textContent).join(""); },
    set(value) { node._text = String(value ?? ""); node.children = []; },
  });
  Object.defineProperty(node, "innerHTML", {
    get() { return node._html; },
    set(value) { node._html = String(value ?? ""); node.children = []; node._text = ""; },
  });
  node.appendChild = child => { node.children.push(child); return child; };
  node.addEventListener = (type, handler) => { node.listeners[type] = handler; };
  node.setAttribute = (name, value) => { node.attributes[name] = String(value); };
  node.removeAttribute = name => { delete node.attributes[name]; };
  node.focus = () => { node.focusCount = (node.focusCount || 0) + 1; };
  return node;
}
function makeSelect(values) {
  const select = makeNode("select");
  select.options = values.map(value => ({ value }));
  select.value = "";
  return select;
}
function findNodes(node, predicate, matches = []) {
  if (predicate(node)) matches.push(node);
  node.children.forEach(child => findNodes(child, predicate, matches));
  return matches;
}
function fixtureText(node) { return node.textContent.replace(/\s+/g, " ").trim(); }
function createUiFixture(search, fetchSequence, lang = "en") {
  const root = makeNode("section");
  const form = makeNode("form");
  const build = makeSelect(["", "current", "older", "unknown"]);
  const symptom = makeSelect(["", ...Object.keys(data.paths)]);
  const submitButton = makeNode("button");
  form.elements = { build, symptom };
  form.querySelector = selector => selector === 'button[type="submit"]' ? submitButton : null;
  form.reportValidity = () => Boolean(build.value && symptom.value);
  const results = makeNode("section");
  root.querySelector = selector => selector === "[data-chicken-form]" ? form : selector === "[data-chicken-results]" ? results : null;
  const listeners = {};
  const pushCalls = [];
  const replaceCalls = [];
  let focusCount = 0;
  const location = { pathname: "/tools/chicken-troubleshooter", search };
  const windowObject = {
    RanchersChickenTroubleshooter: core,
    location,
    history: {
      pushState(_state, _title, url) { pushCalls.push(url); location.search = String(url).includes("?") ? String(url).slice(String(url).indexOf("?")) : ""; },
      replaceState(_state, _title, url) { replaceCalls.push(url); location.search = String(url).includes("?") ? String(url).slice(String(url).indexOf("?")) : ""; },
    },
    addEventListener(type, handler) { listeners[type] = handler; },
  };
  const documentObject = {
    documentElement: { lang: lang === "zh" ? "zh-CN" : "en" },
    querySelector(selector) { return selector === "[data-chicken-tool]" ? root : null; },
    createElement(tagName) {
      const node = makeNode(tagName);
      if (tagName === "a") node.rel = "";
      return node;
    },
  };
  let fetchCalls = 0;
  const fetchImpl = () => {
    const item = fetchSequence[Math.min(fetchCalls, fetchSequence.length - 1)];
    fetchCalls += 1;
    if (item && item.raw) return item.raw;
    if (item instanceof Error) return syncRejected(item);
    return syncFulfilled({ ok: true, json: () => syncFulfilled(item) });
  };
  const context = {
    window: windowObject,
    document: documentObject,
    FormData: function FixtureFormData() { this.get = name => form.elements[name].value; },
    URLSearchParams,
    fetch: fetchImpl,
    console,
  };
  vm.runInNewContext(uiSource, context, { filename: "chicken-troubleshooter.js" });
  const submit = event => { form.listeners.submit(event || { preventDefault() {} }); };
  return {
    form, results, location, listeners, pushCalls, replaceCalls, submit,
    get fetchCalls() { return fetchCalls; },
    get focusCount() { return focusCount + (results.focusCount || 0); },
    find(predicate) { return findNodes(results, predicate); },
  };
}

assert.deepEqual(core.readUrlState("?build=older&symptom=missing", data), {
  build: "older", symptom: "missing", canRender: true, invalid: [],
});
assert.deepEqual(core.readUrlState("?symptom=eggs", data), {
  build: null, symptom: "eggs", canRender: false, invalid: [],
});
const hostileState = core.readUrlState("?build=\"%5D&symptom=%5Bbad", data);
assert.equal(hostileState.build, null);
assert.equal(hostileState.symptom, null);
assert.deepEqual(hostileState.invalid.sort(), ["build", "symptom"]);

const validFixture = createUiFixture("?build=older&symptom=missing", [data]);
assert.equal(validFixture.form.elements.build.value, "older");
assert.equal(validFixture.form.elements.symptom.value, "missing");
assert.match(fixtureText(validFixture.results), /Update to 0\.8\.10\.562|更新到 0\.8\.10\.562/);
assert.equal(validFixture.focusCount, 0, "initial URL restoration must not steal focus");
validFixture.form.elements.build.value = "current";
validFixture.form.elements.symptom.value = "automation";
validFixture.submit();
assert.equal(validFixture.pushCalls.length, 1, "explicit submit creates a browser history entry");
assert.match(validFixture.pushCalls[0], /[?]build=current&symptom=automation/);
assert.equal(validFixture.replaceCalls.length, 0, "submit must not replace the returnable result state");
assert.match(fixtureText(validFixture.results), /water contract/i);
validFixture.location.search = "?build=older&symptom=eggs";
validFixture.listeners.popstate();
assert.match(fixtureText(validFixture.results), /Update to 0\.8\.10\.562|更新到 0\.8\.10\.562/);

const symptomOnlyFixture = createUiFixture("?symptom=eggs", [data]);
assert.equal(symptomOnlyFixture.form.elements.symptom.value, "eggs");
assert.equal(symptomOnlyFixture.form.elements.build.value, "", "symptom-only links must not assume a version");
assert.doesNotMatch(fixtureText(symptomOnlyFixture.results), /Adult hen is not laying|成年母鸡不下蛋/);
const invalidFixture = createUiFixture("?build=older%22&symptom=missing%22", [data]);
assert.match(fixtureText(invalidFixture.results), /invalid URL|参数无效/);

const failedFixture = createUiFixture("", [new Error("offline"), new Error("still offline")]);
assert.match(fixtureText(failedFixture.results), /could not load|无法加载/);
const guideLink = failedFixture.find(node => node.tagName === "a" && /animal-guide/.test(node.href))[0];
assert.ok(guideLink, "fetch failure keeps a clickable full-guide fallback");
const retryButton = failedFixture.find(node => node.tagName === "button")[0];
assert.ok(retryButton, "fetch failure offers a retry control");
retryButton.listeners.click({ preventDefault() {} });
assert.equal(failedFixture.fetchCalls, 2, "retry performs one active second request");
const exhaustedRetry = failedFixture.find(node => node.tagName === "button")[0];
assert.equal(exhaustedRetry.disabled, true, "retry is limited to one manual attempt");
const chineseFailure = createUiFixture("", [new Error("offline")], "zh");
const chineseGuide = chineseFailure.find(node => node.tagName === "a" && /animal-guide/.test(node.href))[0];
assert.equal(chineseGuide.href, "/zh/guides/animal-guide#troubleshooting");

async function runDelayedFetchChecks() {
  let resolveInitial;
  const initialResponse = new Promise(resolve => { resolveInitial = resolve; });
  const delayed = createUiFixture("?build=older&symptom=missing", [{ raw: initialResponse }]);
  assert.equal(delayed.form.elements.build.disabled, true, "loading disables version input instead of losing edits");
  assert.equal(delayed.form.elements.symptom.disabled, true, "loading disables symptom input instead of losing edits");
  resolveInitial({ ok: true, json: () => Promise.resolve(data) });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(delayed.form.elements.build.disabled, false);
  assert.match(fixtureText(delayed.results), /Update to 0\.8\.10\.562|更新到 0\.8\.10\.562/);
  assert.equal(delayed.focusCount, 0, "async initial restoration must not steal focus");

  let resolveRetry;
  const retryResponse = new Promise(resolve => { resolveRetry = resolve; });
  const retryFixture = createUiFixture("?build=older&symptom=eggs", [new Error("offline"), { raw: retryResponse }]);
  const retry = retryFixture.find(node => node.tagName === "button")[0];
  retry.listeners.click({ preventDefault() {} });
  assert.equal(retryFixture.form.elements.build.disabled, true, "retry keeps the form locked during the second request");
  resolveRetry({ ok: true, json: () => Promise.resolve(data) });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(retryFixture.form.elements.build.disabled, false);
  assert.match(fixtureText(retryFixture.results), /Update to 0\.8\.10\.562|更新到 0\.8\.10\.562/);
}

runDelayedFetchChecks()
  .then(() => console.log("PASS: bilingual chicken troubleshooter returns evidence-linked, version-aware checklists."))
  .catch(error => { console.error(error); process.exitCode = 1; });
