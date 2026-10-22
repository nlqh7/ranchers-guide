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
const foodWaterSources = core.buildPlan(data, { build: "current", symptom: "food-water" }, "en").sourceIds.map(id => data.sources[id]);
assert.ok(foodWaterSources.some(source => source.url === "https://steamcommunity.com/app/1501310/discussions/0/587307906419077616/"), "Food and water advice must expose its actual moderator reply, not just an unlinked evidence ledger");
const recoveredSourceSteps = {
  "food-water": { "interior-trough": "care-about-chickens", "morning-cycle": "care-food-water-reserves", "water-is-trough-only": "care-food-water-reserves" },
  sick: { "correct-heater": "care-big-eggs-temperature", "heater-position": "care-big-eggs-temperature", "vet-for-illness": "care-about-chickens" },
  eggs: { "care-chain": "care-about-chickens" },
  "large-eggs": { "enclosed-roaming": "care-about-chickens" },
  automation: { "feature-kit": "care-auto-feeding", "silo-range": "care-auto-feeding", "water-contract": "care-water-contract-range", "trough-settings": "care-auto-feeding" },
};
for (const [symptom, expectedSteps] of Object.entries(recoveredSourceSteps)) {
  const plan = core.buildPlan(data, { build: "current", symptom }, "en");
  for (const [stepId, sourceId] of Object.entries(expectedSteps)) {
    assert.ok(plan.steps.find(step => step.id === stepId).sourceIds.includes(sourceId), stepId + " must cite its specifically recovered source");
    assert.match(data.sources[sourceId].url, /^https:\/\/steamcommunity\.com\/app\/1501310\/discussions\/0\/\d+\/$/);
    assert.equal(data.sources[sourceId].authorRole, "moderator");
    assert.equal(data.sources[sourceId].build, "not stated", "An old moderator reply is not a new runtime verification");
  }
}
assert.equal(data.sources["moderator-care-answers"].url, null, "Do not fabricate a replacement for still-unrecovered original replies");
assert.match(currentAutomation.steps.map((step) => step.text).join(" "), /water contract/i);
assert.match(currentAutomation.steps.map((step) => step.text).join(" "), /green light/i);

const unknownSickness = core.buildPlan(data, { build: "unknown", symptom: "sick" }, "en");
assert.equal(unknownSickness.steps[0].id, data.paths.sick.steps[0].id, "Sickness checks must start with their own relevant care step, not a disappearance hotfix");

for (const locale of ["en", "zh"]) {
  for (const build of ["current", "older", "unknown"]) {
    for (const [symptom, symptomPath] of Object.entries(data.paths)) {
      const plan = core.buildPlan(data, { build, symptom }, locale);
      const expectedSteps = symptom === "missing" && build !== "current"
        ? [data.shared.updateFirst, ...symptomPath.steps]
        : symptomPath.steps;
      assert.deepEqual(plan.steps.map(step => step.id), expectedSteps.map(step => step.id), `${locale}/${build}/${symptom} retains exactly the applicable ordered checks`);
      assert.deepEqual([...plan.sourceIds].sort(), [...new Set(expectedSteps.flatMap(step => step.sourceIds || []))].sort(), `${locale}/${build}/${symptom} cites only the evidence actually used`);
      assert.equal(plan.steps[0].text, expectedSteps[0].text[locale], `${locale}/${build}/${symptom} keeps its localized first step`);
    }
  }
}

const chineseLargeEgg = core.buildPlan(data, { build: "current", symptom: "large-eggs" }, "zh");
assert.match(chineseLargeEgg.summary, /随机|保证/);
assert.ok(chineseLargeEgg.sourceIds.length > 0);

for (const relativePath of ["tools/chicken-troubleshooter.html", "zh/tools/chicken-troubleshooter.html"]) {
  const html = read(relativePath);
  assert.match(html, /data-chicken-tool/);
  assert.match(html, /chicken-troubleshooter-core\.js/);
  assert.match(html, /chicken-troubleshooter-core\.js\?v=20261022-animal-scope1/, "Both localized tools must load the updated symptom-scoped core");
  assert.match(html, /chicken-troubleshooter\.js/);
  assert.match(html, /chicken-troubleshooter\.js\?v=20261022-animal-sources1/, "Both localized tools must load the controller with refreshed source-data request");
  assert.match(html, /data-chicken-results/);
  const formStart = html.indexOf('id="chicken-case"');
  const notesStart = html.indexOf('class="content-checkpoint"');
  assert.ok(formStart >= 0 && notesStart > formStart, relativePath + " must show the usable form before detailed safety notes");
  assert.match(html, /<details\b[^>]*class="troubleshooter-notes"/, relativePath + " detailed help remains available through a native disclosure");
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
  const fetchUrls = [];
  const fetchImpl = url => {
    fetchUrls.push(url);
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
    form, results, location, listeners, pushCalls, replaceCalls, submit, fetchUrls,
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
assert.deepEqual(validFixture.fetchUrls, ["/data/chicken-troubleshooter.json?v=20261022-sources1"], "The shipped controller must request fresh source data, not a potentially cached previous JSON");
for (const guidePath of ["guides/animal-guide.html", "zh/guides/animal-guide.html"]) {
  for (const sourceId of ["care-food-water-reserves", "care-about-chickens", "care-big-eggs-temperature", "care-auto-feeding", "care-water-contract-range"]) {
    assert.ok(read(guidePath).includes(data.sources[sourceId].url), guidePath + " must expose the recovered topic, not merely the forum homepage");
  }
}
for (const locale of ["en", "zh"]) {
  const sourceFixture = createUiFixture("?build=current&symptom=food-water", [data], locale);
  const links = sourceFixture.find(node => node.tagName === "a");
  assert.ok(links.some(node => node.href === data.sources["care-food-water-reserves"].url), locale + " result must render a clickable original care source");
  assert.ok(links.some(node => node.href === data.sources["care-about-chickens"].url), locale + " result must render the indoor-trough source");
}
for (const locale of ["en", "zh"]) {
  const sickFixture = createUiFixture("?build=unknown&symptom=sick", [data], locale);
  const text = fixtureText(sickFixture.results);
  assert.ok(text.includes(data.paths.sick.steps[0].text[locale]), locale + " controller renders the relevant sickness check first");
  assert.ok(!text.includes(data.shared.updateFirst.text[locale]), locale + " controller does not inject disappearance advice into sickness");
  assert.equal(sickFixture.form.elements.build.value, "unknown");
  assert.equal(sickFixture.form.elements.symptom.value, "sick");
}
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
assert.equal(validFixture.form.elements.build.value, "older", "Back restores the selected older version");
assert.equal(validFixture.form.elements.symptom.value, "eggs", "Back restores the selected egg symptom");
assert.match(fixtureText(validFixture.results), /adult hen rather than a rooster or a chick/i);
assert.doesNotMatch(fixtureText(validFixture.results), /several disappearance paths/i);

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

/* Guide symptom-entry regression: both animal guides must deep-link the four
 * primary symptoms into the troubleshooter with symptom-only URLs, and the
 * shipped controller must keep the version unchosen until the player picks it. */
const guideEntrySpecs = [
  {
    label: "English",
    guidePath: "guides/animal-guide.html",
    toolPrefix: "/tools/chicken-troubleshooter",
    versionPrompt: /Choose the game version before building a checklist/,
    checklistText: /Update to 0\.8\.10\.562/,
  },
  {
    label: "Chinese",
    guidePath: "zh/guides/animal-guide.html",
    toolPrefix: "/zh/tools/chicken-troubleshooter",
    versionPrompt: /请选择游戏版本后再生成排查清单/,
    checklistText: /更新到 0\.8\.10\.562/,
  },
];
for (const spec of guideEntrySpecs) {
  const html = read(spec.guidePath);
  const entryBlock = html.match(/<section\b[^>]*\banimal-quick-actions\b[^>]*>[\s\S]*?<\/section>/);
  assert.ok(entryBlock, spec.label + " animal guide is missing the symptom quick-entry block");
  const hrefs = Array.from(entryBlock[0].matchAll(/href="([^"]+)"/g), (match) => match[1]);
  assert.equal(hrefs.length, 4, spec.label + " quick entry links exactly the four primary symptoms");
  const seenSymptoms = [];
  for (const href of hrefs) {
    assert.ok(href.startsWith(spec.toolPrefix + "?"), spec.label + " quick entry must stay on its localized tool route: " + href);
    assert.ok(!/[?&]build=/.test(href), spec.label + " quick entry must not pre-select a version: " + href);
    const entryUrl = new URL(href, "https://theranchersguide.com");
    assert.equal(entryUrl.hash, "#chicken-case", spec.label + " entry must land at the usable form rather than above the long preamble");
    const toolHtml = read(spec.toolPrefix.slice(1) + ".html");
    assert.match(toolHtml, /<form\b[^>]*\bid="chicken-case"/, spec.label + " entry anchor must exist on the real form");
    assert.match(toolHtml, /animal-quick-actions\.css\?v=20261022-animal1/, spec.label + " tool must load its scoped sticky-header offset");
    assert.match(read("assets/css/animal-quick-actions.css"), /#chicken-case\s*\{[^}]*scroll-margin-top:\s*120px/, "Form anchor needs sticky-header clearance");
    const state = core.readUrlState(entryUrl.search, data);
    assert.equal(state.build, null, spec.label + " quick entry leaves the version unchosen");
    assert.ok(state.symptom, spec.label + " quick entry selects a real symptom enum: " + href);
    assert.equal(state.canRender, false, spec.label + " symptom-only entry must not render a checklist");
    assert.deepEqual(state.invalid, [], spec.label + " quick entry uses only valid enum values");
    seenSymptoms.push(state.symptom);
  }
  assert.deepEqual([...seenSymptoms].sort(), ["automation", "food-water", "missing", "sick"], spec.label + " quick entry covers the four primary symptoms");
  const entryFixture = createUiFixture(new URL(hrefs[0], "https://theranchersguide.com").search, [data], spec.label === "Chinese" ? "zh" : "en");
  assert.ok(entryFixture.form.elements.symptom.value, spec.label + " extracted href pre-selects the symptom in the tool");
  assert.equal(entryFixture.form.elements.build.value, "", spec.label + " extracted href leaves the version unchosen in the tool");
  assert.match(fixtureText(entryFixture.results), spec.versionPrompt, spec.label + " tool asks for the version before building a checklist");
  assert.doesNotMatch(fixtureText(entryFixture.results), spec.checklistText, spec.label + " tool computes no checklist before version selection");
  assert.equal(entryFixture.focusCount, 0, spec.label + " entry restoration must not steal focus");
}

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
  assert.equal(retryFixture.form.elements.build.value, "older", "Retry retains the selected version");
  assert.equal(retryFixture.form.elements.symptom.value, "eggs", "Retry retains the selected symptom");
  assert.match(fixtureText(retryFixture.results), /adult hen rather than a rooster or a chick/i);
  assert.doesNotMatch(fixtureText(retryFixture.results), /several disappearance paths/i);
}

runDelayedFetchChecks()
  .then(() => console.log("PASS: bilingual chicken troubleshooter returns evidence-linked, version-aware checklists."))
  .catch(error => { console.error(error); process.exitCode = 1; });
