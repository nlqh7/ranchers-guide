/* Run the shipped UI against a small DOM fixture, without browser dependencies. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const key = 'fs25-bread-planner-settings-v1';

function boot(lang = 'en', initial = {}) {
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
  const context = vm.createContext({
    window: {}, navigator: {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
    document: {
      documentElement: { lang }, getElementById: id => els[id] || null,
      createElement: () => element(), createTextNode: text => ({ textContent: text })
    }
  });
  for (const file of ['fs25-planner-data.js', 'fs25-planner.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'assets/js', file), 'utf8'), context);
  }
  return {
    els, store,
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
console.log('PASS: bilingual FS25 UI owned counts, optional area, finite results, persistence, stale plans and manual copy.');
