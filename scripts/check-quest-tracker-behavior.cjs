const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'assets/js/quest-tracker.js'), 'utf8');

function runChild(scenario) {
  const result = childProcess.spawnSync(process.execPath, [__filename, '--child', scenario], {
    cwd: root,
    encoding: 'utf8',
    timeout: 1800,
    env: { ...process.env, R29_TRACKER_SCENARIO: scenario },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    process.exit(result.status || 1);
  }
  return JSON.parse(result.stdout.trim());
}

if (!process.argv.includes('--child')) {
  const oldPower = runChild('old-power');
  assert.equal(oldPower.powerCheckCount, 3, 'legacy Power to the Bench state must still expose three facts');
  assert.equal(oldPower.powerProgress, '1 / 3 checked', 'legacy power checkbox progress must retain its old total');
  assert.equal(oldPower.nextIsOldFact, true, 'power::0 must still mean the first observed fact');
  assert.equal(oldPower.storageAfterUndo['power-to-the-bench::0'], false, 'unchecking a legacy fact must update the same key');
  assert.equal(oldPower.storageAfterRedo['power-to-the-bench::0'], true, 'checking a legacy fact must restore the same key');
  assert.equal(oldPower.hintVisibleBeforeSelection, false, 'manual power hint must not appear without a selected check');
  assert.equal(oldPower.hintVisibleAfterSelection, true, 'manual power hint must appear after selecting a check');
  assert.equal(oldPower.hintVisibleAfterClear, false, 'clearing the manual check selection must hide its hint');
  assert.equal(oldPower.storageAfterHintSelection['power-to-the-bench::0'], true, 'hint selection must not write a new progress key');

  const chinese = runChild('old-power-zh');
  assert.equal(chinese.hintVisibleAfterSelection, true, 'Chinese manual hint must render after selection');
  assert.equal(chinese.localizedHint, true, 'Chinese manual hint must use zhText');

  const pending = runChild('pending-contracts');
  assert.equal(pending.coreListReady, true, 'quest list must render while optional route contracts are pending');
  assert.equal(pending.usesAggregateFallback, true, 'pending route contracts must keep aggregate fallback links');
  console.log('PASS: quest tracker preserves legacy power progress, manual hints, bilingual text and pending-route usability.');
  process.exit(0);
}

function fakeElement() {
  const listeners = {};
  return {
    innerHTML: '', textContent: '', value: '', hidden: false, options: [], checked: false,
    dataset: {}, outerHTML: '',
    addEventListener(type, fn) { listeners[type] = fn; },
    dispatch(type) { if (listeners[type]) listeners[type]({ target: this }); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {},
  };
}

function runChildScenario(scenario) {
  const lang = scenario.endsWith('-zh') ? 'zh-CN' : 'en';
  const storage = scenario.startsWith('old-power')
    ? { 'power-to-the-bench::0': true }
    : {};
  const list = fakeElement();
  const status = fakeElement();
  const overview = fakeElement();
  const keyword = fakeElement();
  const clear = fakeElement();
  const filters = { progress: fakeElement(), category: fakeElement(), npc: fakeElement(), location: fakeElement() };
  Object.values(filters).forEach(select => { select.value = 'all'; });
  const cards = new Map();
  const checks = [];
  const hintSelects = [];

  function parseRendered(html) {
    cards.clear();
    checks.length = 0;
    hintSelects.length = 0;
    const cardPattern = /<article class="quest-tracker-card" data-quest-card="([^"]+)"[\s\S]*?<\/article>/g;
    let match;
    while ((match = cardPattern.exec(html))) {
      const card = fakeElement();
      card.dataset.questCard = match[1];
      const segment = match[0];
      const cardChecks = [];
      const checkPattern = /<input type="checkbox" data-quest-fact="([^"]+)"([^>]*)>/g;
      let checkMatch;
      while ((checkMatch = checkPattern.exec(segment))) {
        const check = fakeElement();
        check.dataset.questFact = checkMatch[1];
        check.checked = /\schecked(?:=|>|$)/.test(checkMatch[2]);
        check.closest = () => card;
        cardChecks.push(check);
        checks.push(check);
      }
      const progress = fakeElement();
      const next = fakeElement();
      next.outerHTML = segment.match(/<div class="quest-tracker-next[\s\S]*?<\/div>/)?.[0] || '';
      Object.assign(card, {
        querySelectorAll(selector) { return selector === '[data-quest-fact]' ? cardChecks : []; },
        querySelector(selector) {
          if (selector === '[data-quest-progress]') return progress;
          if (selector === '[data-quest-next]') return next;
          return null;
        },
      });
      cards.set(match[1], card);
      const selectPattern = /<select[^>]*data-quest-hint-target="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g;
      let selectMatch;
      while ((selectMatch = selectPattern.exec(segment))) {
        const select = fakeElement();
        select.dataset.questHintTarget = selectMatch[1];
        select.options = Array.from(selectMatch[2].matchAll(/<option value="([^"]*)"/g)).map(item => ({ value: item[1] }));
        select.value = select.options.find(option => option.value === '')?.value || '';
        hintSelects.push(select);
      }
    }
  }
  Object.defineProperty(list, 'innerHTML', {
    get() { return this._html || ''; },
    set(value) { this._html = String(value); parseRendered(this._html); },
  });

  const rootEl = {
    addEventListener() {},
    querySelector(selector) {
      if (selector === '[data-quest-list]') return list;
      if (selector === '[data-quest-status]') return status;
      if (selector === '[data-quest-overview]') return overview;
      if (selector === '[data-quest-keyword]') return keyword;
      if (selector === '[data-quest-search-clear]') return clear;
      const filter = selector.match(/\[data-quest-filter="(\w+)"\]/);
      return filter ? filters[filter[1]] : null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-quest-fact]') return checks;
      if (selector === '[data-quest-hint-target]') return hintSelects;
      if (selector === '[data-quest-reset]') return [];
      if (selector === '[data-quest-card]') return Array.from(cards.values());
      return [];
    },
  };
  const location = { search: '', href: `http://localhost/tools/quest-tracker`, pathname: '/tools/quest-tracker', hash: '' };
  const context = {
    console,
    document: { documentElement: { lang }, querySelector: selector => selector === '[data-quest-tracker]' ? rootEl : null, activeElement: null },
    window: { location, history: { replaceState() {}, state: null }, addEventListener() {} },
    localStorage: {
      getItem(key) { return key === 'ranchers-guide-quest-tracker-v1' ? JSON.stringify(storage) : null; },
      setItem(key, value) { if (key === 'ranchers-guide-quest-tracker-v1') Object.assign(storage, JSON.parse(value)); },
    },
    URLSearchParams: require('node:url').URLSearchParams,
    URL: require('node:url').URL,
    Set, Array, JSON, String, Number, Object, Math, Promise,
    fetch(url) {
      if (scenario === 'pending-contracts' && url !== '/data/quests.json') return new Promise(() => {});
      const files = {
        '/data/quests.json': 'data/quests.json',
        '/data/b2-entry-pages.json': 'data/b2-entry-pages.json',
        '/data/dialogue-scenes.json': 'data/dialogue-scenes.json',
      };
      const relative = files[url];
      if (!relative) return Promise.resolve({ ok: false, status: 404 });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'))) });
    },
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(script, context, { filename: path.join(root, 'assets/js/quest-tracker.js') });
  setTimeout(() => {
    if (scenario === 'pending-contracts') {
      process.stdout.write(JSON.stringify({
        coreListReady: list.innerHTML.includes('quest-tracker-card'),
        usesAggregateFallback: list.innerHTML.includes('href="/database/quests#from-blueprint-to-bed"'),
      }));
      return;
    }
    const card = cards.get('power-to-the-bench');
    const cardHtml = list.innerHTML.match(/<article class="quest-tracker-card" data-quest-card="power-to-the-bench"[\s\S]*?<\/article>/)?.[0] || '';
    const powerChecks = card?.querySelectorAll('[data-quest-fact]') || [];
    const powerProgress = card?.querySelector('[data-quest-progress]')?.textContent || '';
    const select = hintSelects.find(item => item.dataset.questHintTarget === 'power-to-the-bench');
    const hintText = lang === 'zh-CN' ? '电力合同和工作台建造是两个不同目标' : 'The electricity contract and the workbench build are separate objectives';
    const response = {
      powerCheckCount: powerChecks.length,
      powerProgress,
      nextIsOldFact: cardHtml.includes('The observed route sends the player to City Hall') || cardHtml.includes('观测流程要求玩家前往市政厅'),
      hintVisibleBeforeSelection: cardHtml.includes(hintText),
    };
    const first = powerChecks.find(check => check.dataset.questFact === 'power-to-the-bench::0');
    if (first) {
      first.checked = false;
      first.dispatch('change');
      response.storageAfterUndo = { ...storage };
      first.checked = true;
      first.dispatch('change');
      response.storageAfterRedo = { ...storage };
    } else {
      response.storageAfterUndo = {};
      response.storageAfterRedo = {};
    }
    const selectedCardHtml = () => list.innerHTML.match(/<article class="quest-tracker-card" data-quest-card="power-to-the-bench"[\s\S]*?<\/article>/)?.[0] || '';
    const selected = hintSelects.find(item => item.dataset.questHintTarget === 'power-to-the-bench');
    if (selected) {
      selected.value = '0';
      selected.dispatch('change');
      response.hintVisibleAfterSelection = selectedCardHtml().includes(hintText);
      response.localizedHint = lang !== 'zh-CN' || selectedCardHtml().includes('电力合同和工作台建造是两个不同目标');
      response.storageAfterHintSelection = { ...storage };
      const cleared = hintSelects.find(item => item.dataset.questHintTarget === 'power-to-the-bench');
      cleared.value = '';
      cleared.dispatch('change');
      response.hintVisibleAfterClear = selectedCardHtml().includes(hintText);
    } else {
      response.hintVisibleAfterSelection = false;
      response.hintVisibleAfterClear = false;
      response.storageAfterHintSelection = { ...storage };
    }
    if (response.localizedHint == null) response.localizedHint = lang !== 'zh-CN';
    process.stdout.write(JSON.stringify(response));
  }, 120);
}

runChildScenario(process.env.R29_TRACKER_SCENARIO);
