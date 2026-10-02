const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "calculator.js"), "utf8");

assert.doesNotMatch(source, /\+\s*["'] g["']/, "calculator still uses the unrelated 'g' currency suffix");
assert.match(source, /\+\s*["']C["']/, "calculator must display The Ranchers currency as C");

console.log("PASS: profit calculator uses the site's C currency notation.");

/* ------------------------------------------------------------------ */
/* U3: storage robustness — corrupt reads must not crash the tool,      */
/* must not silently overwrite the player's original data, and save     */
/* failures must be reported.                                           */
/* ------------------------------------------------------------------ */

const { sanitizeEntries } = require("../assets/js/calculator.js");

const legacyCrop = { type: "crop", name: "Corn", sellPrice: 40, yieldAmount: 2, seedCost: 54, units: 4, growthDays: 7, cycleDays: 0 };
const legacyAnimal = { type: "animal", name: "Daisy", sellPrice: 120, yieldAmount: 1, seedCost: 30, units: 2, growthDays: 0, cycleDays: 1 };

/* Legitimate existing records survive untouched and stay rankable. */
const cleaned = sanitizeEntries([legacyCrop, legacyAnimal]);
assert.equal(cleaned.valid.length, 2);
assert.equal(cleaned.skipped, 0);
assert.deepEqual(JSON.parse(JSON.stringify(cleaned.valid[0])), legacyCrop);

/* Broken rows are skipped, never crash, never produce NaN profits. */
const mixed = sanitizeEntries([
  legacyCrop,
  null,
  { type: "crop", name: "NaN row", sellPrice: NaN, yieldAmount: 1, seedCost: 0, units: 1, growthDays: 3, cycleDays: 0 },
  { type: "crop", name: "missing fields", sellPrice: 10 },
  { type: "vehicle", name: "wrong type", sellPrice: 1, yieldAmount: 1, seedCost: 0, units: 1, growthDays: 1, cycleDays: 0 },
  "just a string",
]);
assert.equal(mixed.valid.length, 1);
assert.equal(mixed.skipped, 5);
assert.ok(mixed.valid.every((entry) => Object.values(entry).every((value) => typeof value !== "number" || isFinite(value))), "no NaN survives sanitizing");

/* ---------------- VM boot harness with controllable storage -------- */

function stubElement(tag) {
  return {
    tagName: tag,
    attrs: {},
    style: {},
    className: "",
    textContent: "",
    value: "",
    hidden: false,
    disabled: false,
    children: [],
    events: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute(key, value) { this.attrs[key] = value; },
    getAttribute(key) { return this.attrs[key] ?? null; },
    removeAttribute(key) { delete this.attrs[key]; },
    appendChild(kid) { this.children.push(kid); },
    insertAdjacentElement(position, element) { this["at_" + position] = element; },
    addEventListener(type, handler) { this.events[type] = handler; },
    click() { if (this.events.click) this.events.click(); },
    focus() { this.focused = true; },
    select() { this.selected = true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
}

function bootCalculator(storageData, storageOptions) {
  const options = Object.assign({ failGet: false, failSet: false }, storageOptions);
  const store = Object.assign({}, storageData);
  const localStorageStub = {
    getItem(key) {
      if (options.failGet) throw new Error("storage denied");
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      if (options.failSet) throw new Error("quota exceeded");
      store[key] = String(value);
    },
  };
  const created = [];
  const formFields = {
    type: Object.assign(stubElement("select"), { value: "crop" }),
    name: stubElement("input"),
    sellPrice: stubElement("input"),
    yieldAmount: stubElement("input"),
    seedCost: stubElement("input"),
    units: Object.assign(stubElement("input"), { value: "1" }),
    growthDays: stubElement("input"),
    cycleDays: stubElement("input"),
  };
  const submitButton = stubElement("button");
  const formHandlers = {};
  const form = Object.assign(stubElement("form"), formFields, {
    elements: { namedItem() { return null; } },
    querySelector(selector) { return selector === '[type="submit"]' ? submitButton : null; },
    reset() {},
    addEventListener(type, handler) { formHandlers[type] = handler; },
  });
  const resultsEl = Object.assign(stubElement("div"), { innerHTML: "" });
  const clearBtn = stubElement("button");
  const ids = {
    "calc-form": form,
    "calc-results": resultsEl,
    "calc-clear": clearBtn,
    "seed-label": stubElement("label"),
    "sell-label": stubElement("label"),
    "yield-label": stubElement("label"),
    "units-label": stubElement("label"),
  };
  const copied = [];
  const documentStub = {
    getElementById(id) { return ids[id] || null; },
    querySelectorAll() { return []; },
    createElement(tag) { const element = stubElement(tag); created.push(element); return element; },
  };
  const clipboardImpl = Object.prototype.hasOwnProperty.call(options, "clipboard")
    ? options.clipboard
    : (text) => { copied.push(text); return Promise.resolve(); };
  const navigatorStub = clipboardImpl === null ? {} : { clipboard: { writeText: clipboardImpl } };
  const context = {
    document: documentStub,
    localStorage: localStorageStub,
    navigator: navigatorStub,
    JSON, Math, Number, String, parseFloat, parseInt, isFinite, Array, Object,
  };
  vm.runInNewContext(source, context);
  const findByText = (text) => created.find((element) => element.textContent.indexOf(text) !== -1);
  const findByClass = (name) => created.find((element) => element.className.indexOf(name) !== -1);
  return { store, options, form, formFields, formHandlers, resultsEl, clearBtn, created, copied, findByText, findByClass };
}

function addCrop(rig, name) {
  rig.formFields.name.value = name;
  rig.formFields.sellPrice.value = "40";
  rig.formFields.yieldAmount.value = "2";
  rig.formFields.seedCost.value = "54";
  rig.formFields.units.value = "4";
  rig.formFields.growthDays.value = "7";
  rig.formHandlers.submit({ preventDefault() {} });
}

const KEY = "ranchers-calc-entries-v1";

/* 1. Corrupt JSON: tool still boots, original data is NOT overwritten at
   init, and a recovery choice (copy raw / discard) is offered. */
{
  const rig = bootCalculator({ [KEY]: "{not valid json" });
  assert.match(rig.resultsEl.innerHTML, /Add your first/, "corrupt storage must not crash the tool");
  assert.equal(rig.store[KEY], "{not valid json", "read failure must not overwrite the original storage at init");
  const notice = rig.findByClass("calc-storage-notice");
  assert.ok(notice && notice.hidden === false, "recovery notice is shown");
  assert.ok(rig.findByText("Discard"), "a deliberate discard-and-save option exists");

  /* New work must not silently destroy the quarantined original. */
  addCrop(rig, "Recovery Corn");
  assert.equal(rig.store[KEY], "{not valid json", "adding an entry must not overwrite quarantined data");

  /* Copy original data. */
  const copyButton = rig.findByText("Copy");
  copyButton.click();
  assert.equal(rig.copied[0], "{not valid json", "player can copy the original raw data");

  /* Explicit discard re-enables saving with the current list. */
  const discardButton = rig.findByText("Discard");
  discardButton.click();
  assert.deepEqual(JSON.parse(rig.store[KEY]).map((entry) => entry.name), ["Recovery Corn"], "discard keeps the current list, not the corrupt blob");
}

/* 2. Non-array JSON is quarantined the same way. */
{
  const rig = bootCalculator({ [KEY]: '{"crop":"corn"}' });
  assert.match(rig.resultsEl.innerHTML, /Add your first/);
  assert.equal(rig.store[KEY], '{"crop":"corn"}');
  assert.ok(rig.findByClass("calc-storage-notice").hidden === false);
}

/* 3. Mixed array: valid rows load and rank, skipped rows are explained and
   the raw original stays recoverable. */
{
  const rig = bootCalculator({ [KEY]: JSON.stringify([legacyAnimal, null, { type: "crop", name: "broken" }, legacyCrop]) });
  assert.match(rig.resultsEl.innerHTML, /Daisy/, "valid legacy entries still render");
  assert.match(rig.resultsEl.innerHTML, /Corn/);
  assert.doesNotMatch(rig.resultsEl.innerHTML, /NaN/, "no NaN profit reaches the page");
  const notice = rig.findByClass("calc-storage-notice");
  assert.ok(notice.hidden === false, "skipped rows are surfaced");
  assert.match(rig.findByText("couldn't be read").textContent, /^2 saved entries/, "the skipped count is explained");
  assert.ok(rig.store[KEY].indexOf('"broken"') !== -1, "original raw data is preserved for recovery");
}

/* 4. Save failure is reported; a later successful save updates the feedback. */
{
  const rig = bootCalculator({}, { failSet: true });
  addCrop(rig, "Unsaved Corn");
  assert.match(rig.resultsEl.innerHTML, /Unsaved Corn/, "calculations still work on the page");
  const status = rig.findByClass("calc-save-status");
  assert.match(status.textContent, /may be lost/, "save failure is clearly reported");
  assert.equal(rig.store[KEY], undefined, "nothing was written while storage failed");

  rig.options.failSet = false;
  addCrop(rig, "Saved Corn");
  assert.equal(JSON.parse(rig.store[KEY]).length, 2, "a later save persists once storage recovers");
  assert.match(rig.findByClass("calc-save-status").textContent, /saved/i, "successful save updates the feedback");
}

/* 5. Regression: normal add / clear / undo cycle on healthy storage. */
{
  const rig = bootCalculator({});
  addCrop(rig, "Corn");
  addCrop(rig, "Pumpkin");
  assert.equal(JSON.parse(rig.store[KEY]).length, 2, "entries persist");
  assert.match(rig.resultsEl.innerHTML, /#1/, "ranking renders");
  rig.clearBtn.click();
  assert.equal(JSON.parse(rig.store[KEY]).length, 0, "clear empties storage");
  const undoButton = rig.findByText("Undo removal");
  undoButton.click();
  assert.equal(JSON.parse(rig.store[KEY]).length, 2, "undo restores the removed entries");
  assert.match(rig.resultsEl.innerHTML, /Corn/);
}

/* 6. Unavailable storage (getItem throws) still boots read-only. */
{
  const rig = bootCalculator({}, { failGet: true });
  assert.match(rig.resultsEl.innerHTML, /Add your first/);
  addCrop(rig, "Offline Corn");
  assert.match(rig.resultsEl.innerHTML, /Offline Corn/, "the tool keeps working without storage");
}

/* 7. sanitizeEntries enforces the form's min/step contract on stored
   records instead of silently clamping or rounding them. */
{
  /* Negative price / yield / cost are invalid, not accepted. */
  const neg = sanitizeEntries([
    Object.assign({}, legacyCrop, { sellPrice: -1 }),
    Object.assign({}, legacyCrop, { yieldAmount: -0.5 }),
    Object.assign({}, legacyAnimal, { seedCost: -30 }),
  ]);
  assert.equal(neg.valid.length, 0, "negative price/yield/cost must be skipped");
  assert.equal(neg.skipped, 3);

  /* Fractional or sub-1 units are invalid, not rounded up. */
  const badUnits = sanitizeEntries([
    Object.assign({}, legacyCrop, { units: 2.5 }),
    Object.assign({}, legacyCrop, { units: 0 }),
    Object.assign({}, legacyCrop, { units: -2 }),
  ]);
  assert.equal(badUnits.valid.length, 0, "units must be an integer >= 1");
  assert.equal(badUnits.skipped, 3);

  /* The active type's days must be an integer >= 1. */
  const badDays = sanitizeEntries([
    Object.assign({}, legacyCrop, { growthDays: 3.5 }),
    Object.assign({}, legacyCrop, { growthDays: 0 }),
    Object.assign({}, legacyAnimal, { cycleDays: 0 }),
    Object.assign({}, legacyAnimal, { cycleDays: 1.5 }),
  ]);
  assert.equal(badDays.valid.length, 0, "active-type days must be an integer >= 1");
  assert.equal(badDays.skipped, 4);

  /* The inactive type's days = 0 stays a legitimate legacy record, and
     valid records pass through with their values unchanged (no migration). */
  const legacy = sanitizeEntries([legacyCrop, legacyAnimal]);
  assert.equal(legacy.skipped, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(legacy.valid[0])), legacyCrop, "legacy crop is not migrated");
  assert.deepEqual(JSON.parse(JSON.stringify(legacy.valid[1])), legacyAnimal, "legacy animal is not migrated");

  /* Decimal price / yield / cost are legitimate per step="any". */
  const decimals = sanitizeEntries([Object.assign({}, legacyCrop, { sellPrice: 40.5, yieldAmount: 2.25, seedCost: 0.1 })]);
  assert.equal(decimals.valid.length, 1, "decimal price/yield/cost are valid");
  assert.equal(decimals.valid[0].sellPrice, 40.5, "decimal values pass through unchanged");

  /* A legitimate loss-making record is NOT rejected. */
  const loss = sanitizeEntries([Object.assign({}, legacyCrop, { sellPrice: 10, yieldAmount: 1, seedCost: 100 })]);
  assert.equal(loss.valid.length, 1, "negative profit is a valid player record");

  /* Finite inputs whose profit math overflows must not be ranked as
     NaN/Infinity; they are filtered and stay recoverable in the raw blob. */
  const overflow = sanitizeEntries([
    Object.assign({}, legacyCrop, { sellPrice: 1e308, yieldAmount: 1e308 }),
    Object.assign({}, legacyAnimal, { sellPrice: 1e308, yieldAmount: 2, units: 1e308 }),
  ]);
  assert.equal(overflow.valid.length, 0, "overflowing rows are not rankable");
  assert.equal(overflow.skipped, 2);
}

/* 8. Overflowing stored rows are quarantined, never rendered as
   NaN/Infinity and never silently rewritten. */
{
  const rig = bootCalculator({ [KEY]: JSON.stringify([Object.assign({}, legacyCrop, { sellPrice: 1e308, yieldAmount: 1e308 })]) });
  assert.doesNotMatch(rig.resultsEl.innerHTML, /Infinity|NaN/, "no overflow artifact reaches the page");
  assert.ok(rig.findByClass("calc-storage-notice").hidden === false, "overflow rows are surfaced for recovery");
  assert.ok(rig.store[KEY].indexOf("1e308") !== -1 || rig.store[KEY].indexOf("1e+308") !== -1, "original raw data is preserved");
}

console.log("PASS: profit calculator survives corrupt storage, quarantines unreadable data, and reports save failures.");

/* 9. Copy button reports only real clipboard outcomes: pending, resolve,
   reject, synchronous throw and unavailable API. */
(async function clipboardTests() {
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  const findRawView = (rig) => rig.created.find((el) => el.attrs["aria-label"] === "Original saved data");

  /* Pending: no success claim until the promise actually resolves. */
  {
    let release;
    const rig = bootCalculator({ [KEY]: "{bad json" }, {
      clipboard: () => new Promise((resolve) => { release = resolve; }),
    });
    const status = rig.findByClass("calc-save-status");
    rig.findByText("Copy").click();
    assert.doesNotMatch(status.textContent, /copied\b/i, "no success claim while the copy is pending");
    release();
    await tick();
    assert.match(status.textContent, /copied\b/i, "success is reported after the copy resolves");
    assert.equal(rig.store[KEY], "{bad json", "a successful copy never overwrites the quarantined original");
  }

  /* Async rejection: honest failure plus manual-copy fallback. */
  {
    const rig = bootCalculator({ [KEY]: "{bad json" }, {
      clipboard: () => Promise.reject(new Error("denied")),
    });
    const status = rig.findByClass("calc-save-status");
    const rawView = findRawView(rig);
    rig.findByText("Copy").click();
    await tick();
    assert.doesNotMatch(status.textContent, /copied\b/i, "rejection must not claim success");
    assert.match(status.textContent, /manually/i, "rejection explains the manual fallback");
    assert.ok(rawView.focused && rawView.selected, "rejection focuses and selects the raw data");
  }

  /* Synchronous throw: same honest fallback, no crash. */
  {
    const rig = bootCalculator({ [KEY]: "{bad json" }, {
      clipboard: () => { throw new Error("denied"); },
    });
    const status = rig.findByClass("calc-save-status");
    const rawView = findRawView(rig);
    rig.findByText("Copy").click();
    assert.doesNotMatch(status.textContent, /copied\b/i, "a synchronous throw must not claim success");
    assert.match(status.textContent, /manually/i);
    assert.ok(rawView.focused && rawView.selected, "throw focuses and selects the raw data");
  }

  /* Unavailable clipboard API: honest fallback. */
  {
    const rig = bootCalculator({ [KEY]: "{bad json" }, { clipboard: null });
    const status = rig.findByClass("calc-save-status");
    const rawView = findRawView(rig);
    rig.findByText("Copy").click();
    assert.doesNotMatch(status.textContent, /copied\b/i, "missing API must not claim success");
    assert.match(status.textContent, /manually|copy the original data above/i);
    assert.ok(rawView.focused && rawView.selected, "missing API focuses and selects the raw data");
  }

  console.log("PASS: copy button reports only real clipboard success and the sanitizer enforces the form contract.");
})().catch((err) => { console.error(err); process.exit(1); });
