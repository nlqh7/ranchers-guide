/* Run the shipped UI against a small DOM fixture, without browser dependencies. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const key = 'fs25-bread-planner-settings-v1';

function boot(lang = 'en', initial = {}, hash = '') {
  const html = fs.readFileSync(path.join(root, lang === 'en' ? '' : 'zh', 'games/fs25/tools/production-planner/index.html'), 'utf8');
  function element(attrs = {}) {
    const classes = new Set();
    return {
      value: attrs.value || '', hidden: false, disabled: false, innerHTML: '', textContent: '', attrs,
      children: [], listeners: {}, className: '',
      classList: { add: v => classes.add(v), remove: v => classes.delete(v), contains: v => classes.has(v) },
      getAttribute(k) { return this.attrs[k] ?? null; },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      removeAttribute(k) { delete this.attrs[k]; },
      appendChild(child) { this.children.push(child); child.parentElement = this; return child; },
      querySelector(selector) { return this.children.find(child => child.className === selector.slice(1)) || null; },
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
      fire(type, event = {}) { (this.listeners[type] || []).forEach(fn => fn(event)); },
      focus() {}, select() {}
    };
  }
  const els = {};
  for (const tag of html.matchAll(/<[^!][^>]*\bid="([^"]+)"[^>]*>/g)) {
    const attrs = {};
    for (const attr of tag[0].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[attr[1]] = attr[2];
    const node = element(attrs);
    node.parentElement = element();
    node.hidden = /\bhidden(?:\s|>)/.test(tag[0]);
    els[tag[1]] = node;
  }
  els['fp-rule-bakery'].value = els['fp-rule-mill'].value = 'divided';
  const store = { ...initial };
  const localeLink = { href: 'https://theranchersguide.com/' + (lang === 'en' ? 'zh/' : '') + 'games/fs25/tools/production-planner/' };
  const browserWindow = { location: { hash }, listeners: {}, addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); } };
  const context = vm.createContext({
    window: browserWindow, navigator: {}, URL,
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
    document: {
      documentElement: { lang }, getElementById: id => els[id] || null,
      querySelector: selector => selector === '.nav-language-link' ? localeLink : null,
      createElement: () => element(), createTextNode: text => ({ textContent: text })
    }
  });
  for (const file of ['fs25-planner-data.js', 'fs25-planner.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'assets/js', file), 'utf8'), context);
  }
  return {
    els, store, localeLink,
    hash(value) { browserWindow.location.hash = value; (browserWindow.listeners.hashchange || []).forEach(fn => fn()); },
    set(id, value) { els[id].value = String(value); els['fs25-planner'].fire('input', { target: els[id] }); },
    click(id) { els[id].fire('click'); },
    generate() { els['fp-form'].fire('submit', { preventDefault() {} }); },
    results() { return els['fp-results'].innerHTML; }
  };
}

for (const lang of ['en', 'zh-CN']) {
  const p = boot(lang);
  assert.equal(p.els['fp-ratio-bakery'].value, '', 'references never load automatically');
  p.set('fp-target', 5400);
  p.generate();
  assert.equal(p.els['fp-parameters'].open, true, 'Generate reveals missing required inputs rather than hiding field errors');
  p.click('fp-reset');
  p.set('fp-have-bakery', 1);
  p.set('fp-have-mill', 2);
  p.generate();
  assert.ok(p.results().includes('10,800 L') && p.results().includes('13,500 L'));
  assert.ok(!p.results().includes('class="fp-gap"'), 'sufficient owned facilities never show a deficit alert');
  p.set('fp-have-mill', 3);
  p.generate();
  assert.ok(!p.results().includes('class="fp-gap"'), 'excess facilities do not show a deficit either');
  p.set('fp-have-mill', 1);
  p.generate();
  assert.ok(/class="fp-gap"[^>]*>[^<]*720/.test(p.results()), 'partial count warns about the actual shortfall');
  p.set('fp-have-mill', 0);
  p.generate();
  assert.ok(/class="fp-gap"[^>]*>[^<]*10,800/.test(p.results()), 'zero owned is not a one-facility shortfall');
  p.set('fp-have-mill', '');
  p.generate();
  assert.ok(/Blank is not zero|空白不等于 0/.test(p.results()));
  assert.ok(!p.results().includes('class="fp-gap"'), 'unknown owned count never implies a current deficit');
  assert.equal(p.els['fp-copy'].disabled, false);
  for (const id of ['fp-months', 'fp-harvests', 'fp-yield']) p.set(id, '');
  p.generate();
  assert.ok(p.results().includes('13,500 L'), 'optional area does not block material demand');
  assert.equal(p.els['fp-save'].disabled, false);
  p.click('fp-save');
  const validRecord = p.store[key];
  const restored = boot(lang, { [key]: validRecord });
  assert.equal(restored.els['fp-have-mill'].value, '', 'blank owned count survives a fresh UI boot');
  const legacy = JSON.parse(validRecord);
  delete legacy.haveMill;
  delete legacy.haveBakery;
  assert.equal(boot(lang, { [key]: JSON.stringify(legacy) }).els['fp-have-mill'].value, '', 'old records missing count fields remain supported');
  const overflowingRecord = JSON.stringify({ ...legacy, target: 1e308 });
  const invalidRestore = boot(lang, { [key]: overflowingRecord });
  assert.equal(invalidRestore.els['fp-target'].value, '', 'derived-overflow records are not described as restored valid settings');
  assert.equal(invalidRestore.store[key], overflowingRecord, 'invalid raw records are preserved, not rewritten');
  p.click('fp-reset');
  p.set('fp-yield', '1e-308');
  p.generate();
  assert.ok(p.results().includes('13,500 L'), 'area overflow leaves independent demand visible');
  assert.ok(!/Infinity|NaN|— L/.test(p.results()));
  assert.equal(p.els['fp-save'].disabled, true, 'area-only overflow must also prevent saving');
  assert.equal(p.els['fp-copy'].disabled, true);
  p.click('fp-save');
  assert.equal(p.store[key], validRecord, 'invalid derived values never overwrite the last valid record');
  p.click('fp-reset');
  p.set('fp-target', '1e308');
  p.generate();
  assert.ok(!/Infinity|NaN|— L/.test(p.results()));
  assert.equal(p.els['fp-save'].disabled, true);
  assert.equal(p.els['fp-copy'].disabled, true);
  p.set('fp-target', '5400');
  p.generate();
  p.click('fp-copy');
  assert.equal(p.els['fp-copy-manual'].hidden, false, 'clipboard unavailable exposes manual copy');
  assert.ok(p.els['fp-copy-manual'].value.includes('10,800'));
  p.set('fp-target', '6000');
  assert.equal(p.els['fp-stale'].hidden, false);
  assert.equal(p.els['fp-copy'].disabled, true);
}
for (const lang of ['en', 'zh-CN']) {
  const p = boot(lang);
  assert.ok(p.els['fp-product'], 'the existing page offers a visible product selector');
  p.set('fp-target', 5400);
  p.click('fp-reset');
  p.els['fp-product'].value = 'canola-oil';
  p.els['fp-product'].fire('change');
  assert.equal(p.els['fp-form'].hidden, true);
  assert.equal(p.els['fo-form'].hidden, false);
  assert.equal(p.els['fo-ratio'].value, '', 'oil reference is not silently loaded');
  p.click('fo-reference');
  p.els['fo-target'].value = '6000';
  p.els['fo-owned'].value = '1';
  p.els['fo-form'].fire('submit', { preventDefault() {} });
  assert.match(p.els['fo-results'].innerHTML, /12,000/);
  assert.match(p.els['fo-results'].innerHTML, /1,200/);
  assert.match(p.els['fo-results'].innerHTML, /Additional Oil Mills to buy: 1|还需新增油坊：1/, 'the visible result includes the actual purchase gap');
  assert.ok(!/Bakery|Grain Mill|面包房|谷物磨坊/.test(p.els['fo-results'].innerHTML));
  assert.equal(p.els['fo-yield'].value, '', 'canola does not inherit wheat yield');
  p.click('fo-copy');
  assert.equal(p.els['fo-manual'].hidden, false, 'oil plans retain a manual-copy fallback');
  assert.match(p.els['fo-manual'].value, /12,000/);
  p.click('fo-save');
  assert.ok(p.store['fs25-canola-oil-planner-settings-v1']);
  const oilKey = 'fs25-canola-oil-planner-settings-v1';
  const goodOilRecord = p.store[oilKey];
  const reopened = boot(lang, { ...p.store });
  assert.equal(reopened.els['fo-form'].hidden, false, 'the chosen product is restored');
  assert.equal(reopened.els['fo-target'].value, '6000');
  assert.equal(reopened.els['fo-yield'].value, '', 'unknown yield stays blank after reload');
  reopened.hash('#mill-supply');
  assert.equal(reopened.els['fp-form'].hidden, false, 'old bread answer links override the remembered oil selection');
  reopened.hash('#fo-form');
  assert.equal(reopened.els['fo-form'].hidden, false, 'same-page oil links reveal the correct form');
  function oilEdit(id, value) { p.els[id].value = String(value); p.els['fo-form'].fire('input'); }
  function oilGenerate() { p.els['fo-form'].fire('submit', { preventDefault() {} }); return p.els['fo-results'].innerHTML; }
  oilEdit('fo-lines', 2);
  assert.equal(p.els['fo-copy'].disabled, true, 'edits invalidate the copied oil plan');
  assert.match(oilGenerate(), /2,400/);
  p.els['fo-rule'].value = 'independent';
  assert.match(oilGenerate(), /4,800/);
  assert.match(p.els['fo-results'].innerHTML, /1,200/, 'independent two recipes do not double selected capacity');
  oilEdit('fo-owned', 2);
  assert.ok(!oilGenerate().includes('class="fp-gap"'), 'enough Oil Mills have no deficit alert');
  oilEdit('fo-owned', '');
  assert.ok(!oilGenerate().includes('class="fp-gap"'), 'unknown Oil Mills are not assumed zero');
  oilEdit('fo-yield', 10000);
  assert.match(oilGenerate(), /14.4/, 'area uses canola demand and explicitly entered yield');
  oilEdit('fo-capacity', 0);
  oilGenerate();
  assert.equal(p.els['fo-save'].disabled, true, 'zero never falls back to reference capacity');
  p.click('fo-save');
  assert.equal(p.store[oilKey], goodOilRecord, 'invalid inputs never overwrite a saved oil plan');
  p.els['fp-product'].value = 'bread';
  p.els['fp-product'].fire('change');
  assert.equal(p.els['fp-target'].value, '5400', 'switching keeps the original bread draft intact');
  assert.equal(p.els['fp-save'].disabled, false, 'hidden invalid oil inputs do not block bread saving');
  p.click('fp-save');
  assert.equal(JSON.parse(p.store[key]).target, 5400);
  const legacyDeepLink = boot(lang, { ...p.store }, '#fs25-planner');
  assert.equal(legacyDeepLink.els['fp-form'].hidden, false, 'legacy bread hashes never land on a hidden form');
  const badOil = JSON.stringify({ v: 1, values: { ...JSON.parse(goodOilRecord).values, target: 1e308 } });
  const invalidOilRestore = boot(lang, { [oilKey]: badOil });
  assert.equal(invalidOilRestore.els['fo-target'].value, '', 'overflowing saved oil plans are not partially applied');
  assert.equal(invalidOilRestore.store[oilKey], badOil);
}
for (const lang of ['en', 'zh-CN']) {
  const p = boot(lang, {}, '#fg-form');
  assert.ok(p.els['fg-form'], 'greenhouse planning is in the same page, not a placeholder route');
  assert.equal(p.els['fg-form'].hidden, false);
  assert.equal(p.els['fp-form'].hidden, true);
  assert.equal(p.els['oil-supply'].hidden, true, 'unrelated oil prose does not precede the greenhouse tool');
  assert.equal(p.els['greenhouse-water'].hidden, false);
  assert.ok(p.localeLink.href.endsWith('#fg-form'), 'locale switching retains the selected greenhouse tool');
  p.els['fg-target'].value = '6000';
  p.els['fg-owned'].value = '1';
  p.els['fg-tanker'].value = '5000';
  p.click('fg-reference');
  p.els['fg-form'].fire('submit', { preventDefault() {} });
  assert.match(p.els['fg-results'].innerHTML, /12,000/);
  assert.match(p.els['fg-results'].innerHTML, /1,968/);
  assert.match(p.els['fg-results'].innerHTML, /deliveries: 3|运输趟数：3/);
  assert.ok(!/Canola|Oil Mill|菜籽|油坊/.test(p.els['fg-results'].innerHTML));
  assert.equal(p.els['fg-capacity'].value, '4032');
  p.els['fg-variant'].value = 'medium';
  p.els['fg-variant'].fire('change');
  assert.equal(p.els['fg-capacity'].value, '2016');
  p.els['fg-form'].fire('submit', { preventDefault() {} });
  assert.match(p.els['fg-results'].innerHTML, /3<\/span>/, 'medium size changes the total greenhouses needed');
  p.click('fg-save');
  const greenhouseKey = 'fs25-greenhouse-lettuce-planner-settings-v1';
  const goodRecord = p.store[greenhouseKey];
  const restored = boot(lang, { ...p.store });
  assert.equal(restored.els['fg-variant'].value, 'medium');
  assert.equal(restored.els['fg-tanker'].value, '5000');
  assert.equal(restored.els['fg-stock'].value, '', 'old records missing optional stock restore as unknown');
  const legacyGreen = JSON.parse(goodRecord);
  delete legacyGreen.values.stock;
  assert.equal(boot(lang, { [greenhouseKey]: JSON.stringify(legacyGreen) }).els['fg-target'].value, '6000', 'records saved before stock support still restore');
  p.els['fg-stock'].value = '3000';
  p.els['fg-form'].fire('submit', { preventDefault() {} });
  assert.match(p.els['fg-results'].innerHTML, /9,000/);
  assert.match(p.els['fg-results'].innerHTML, /deliveries: 2|运输趟数：2/);
  p.els['fg-stock'].value = '12000';
  p.els['fg-form'].fire('submit', { preventDefault() {} });
  assert.match(p.els['fg-results'].innerHTML, /deliveries: 0|运输趟数：0/, 'stock covering demand requires no delivery');
  p.click('fg-save');
  const savedWithStock = p.store[greenhouseKey];
  assert.equal(boot(lang, { [greenhouseKey]: savedWithStock }).els['fg-stock'].value, '12000');
  p.els['fg-stock'].value = '-1';
  p.els['fg-form'].fire('submit', { preventDefault() {} });
  assert.equal(p.els['fg-save'].disabled, true);
  p.click('fg-save');
  assert.equal(p.store[greenhouseKey], savedWithStock, 'negative stock cannot replace a valid saved plan');
  p.store[greenhouseKey] = goodRecord;
  p.els['fg-stock'].value = '';
  p.els['fg-tanker'].value = '';
  p.els['fg-form'].fire('submit', { preventDefault() {} });
  assert.match(p.els['fg-results'].innerHTML, /12,000/);
  assert.equal(p.els['fg-copy'].disabled, false, 'optional tanker does not block useful water demand');
  p.els['fg-tanker'].value = '0';
  p.els['fg-form'].fire('submit', { preventDefault() {} });
  assert.equal(p.els['fg-save'].disabled, true);
  p.click('fg-save');
  assert.equal(p.store[greenhouseKey], goodRecord, 'zero tanker does not replace a valid saved greenhouse plan');
  p.els['fg-tanker'].value = '1e-308';
  p.els['fg-form'].fire('submit', { preventDefault() {} });
  assert.match(p.els['fg-results'].innerHTML, /12,000/, 'transport overflow leaves independent water demand visible');
  assert.equal(p.els['fg-copy'].disabled, true);
  p.hash('#fo-form');
  assert.ok(p.localeLink.href.endsWith('#fo-form'), 'locale counterpart follows a product change');
  assert.equal(p.els['fo-form'].hidden, false, 'old oil deep links still select oil');
  assert.equal(p.els['fg-form'].hidden, true);
  const badRecord = JSON.stringify({ v: 1, values: { ...JSON.parse(goodRecord).values, variant: 'hydroponic-mod' } });
  const badRestore = boot(lang, { [greenhouseKey]: badRecord });
  assert.equal(badRestore.els['fg-target'].value, '', 'unknown variants do not partially restore');
  assert.equal(badRestore.store[greenhouseKey], badRecord);
}
console.log('PASS: bilingual FS25 bread/oil/greenhouse planning, storage and switching.');
