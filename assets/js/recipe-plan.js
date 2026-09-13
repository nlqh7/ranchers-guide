(function () {
  'use strict';
  const quantity = (value, max) => (typeof value === 'number' || typeof value === 'string') &&
    String(value).trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= max;
  function calculate(recipes, selections, stock) {
    const totals = new Map();
    const known = new Set(recipes.map(recipe => recipe.id));
    const invalidRecipes = Object.keys(selections).filter(id => !known.has(id) || !quantity(selections[id], 999));
    recipes.forEach(recipe => {
      const count = Number(selections[recipe.id] ?? 0);
      recipe.materials.forEach(item => {
        if (count) totals.set(item.id, (totals.get(item.id) || 0) + item.quantity * count);
      });
    });
    const invalidStock = Array.from(totals.keys()).filter(id => !quantity(stock[id] ?? 0, 999999));
    if (invalidRecipes.length || invalidStock.length) return { valid: false, materials: [], invalidRecipes, invalidStock };
    return {
      valid: true,
      invalidRecipes, invalidStock,
      materials: Array.from(totals, ([id, required]) => {
        const owned = Number(stock[id] || 0);
        return { id, required, owned, missing: Math.max(0, required - owned) };
      })
    };
  }
  function checkBuilding(offers, buildingId, stock) {
    return calculate(offers.filter(offer => offer.materials.length), buildingId ? { [buildingId]: 1 } : {}, stock);
  }
  function groupPurchases(result, offers, preferred) {
    const groups = new Map();
    const unresolved = [];
    if (!result.valid) return { groups: [], unresolved };
    result.materials.filter(item => item.missing > 0).forEach(item => {
      const alternatives = offers.filter(offer => offer.itemId === item.id && offer.season === 'AllTheTime');
      const offer = alternatives.find(offer => offer.id === preferred[item.id]) || alternatives[0];
      if (!offer) { unresolved.push(item); return; }
      if (!groups.has(offer.shopId)) groups.set(offer.shopId, []);
      groups.get(offer.shopId).push({ ...item, offerId: offer.id, alternatives });
    });
    return { groups: Array.from(groups, ([shopId, items]) => ({ shopId, items })), unresolved };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { calculate, groupPurchases, checkBuilding };
  if (typeof document === 'undefined') return;
  document.querySelectorAll('[data-recipe-plan]').forEach(root => {
    const data = JSON.parse(root.querySelector('[data-plan-data]').textContent);
    const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
    const prefix = zh ? '/zh' : '';
    const name = item => zh ? item.zhName : item.name;
    const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const labels = new Map();
    const seen = new Map();
    data.recipes.forEach(recipe => {
      const base = name(recipe);
      const number = (seen.get(base) || 0) + 1;
      seen.set(base, number);
      const duplicates = data.recipes.filter(item => name(item) === base).length > 1;
      labels.set(recipe.id, base + (duplicates ? (zh ? '（同名配方 ' : ' (same-name recipe ') + number + (zh ? '）' : ')') : ''));
    });
    const query = root.querySelector('[data-plan-search]');
    const picker = root.querySelector('[data-plan-select]');
    const add = root.querySelector('[data-plan-add]');
    const selectionList = root.querySelector('[data-plan-selections]');
    const supplyList = root.querySelector('[data-plan-supplies]');
    const status = root.querySelector('[data-plan-status]');
    const selections = Object.create(null);
    const stock = Object.create(null);
    const preferredShops = Object.create(null);
    const buildingPicker = root.querySelector('[data-building-select]');
    let mode = 'recipes';
    let buildingId = '';
    const storageKey = 'ranchers-guide-recipe-plan-v1';
    const saveNote = root.querySelector('[data-plan-save-note]');
    const savedMessage = saveNote.textContent;
    function storageUnavailable() {
      saveNote.textContent = zh ? '此浏览器无法保存；当前页面仍可计算，关闭后不会保留。' : 'Browser storage is unavailable. You can calculate here, but this plan will not be kept after closing.';
    }
    try {
      const raw = localStorage.getItem(storageKey);
      let saved;
      try { saved = JSON.parse(raw || '{}'); } catch (_) {
        saveNote.textContent = zh ? '上次计划无法读取，请重新选择。新计划仍可保存在此浏览器。' : 'The previous plan could not be read. Choose your items again; a new plan can still be saved.';
      }
      if (saved && typeof saved === 'object') {
        if (saved.mode === 'building') mode = 'building';
        if (data.buildings.some(item => item.id === saved.buildingId)) buildingId = saved.buildingId;
        data.recipes.forEach(recipe => {
          if (Object.hasOwn(saved.selections || {}, recipe.id) && quantity(saved.selections[recipe.id], 999)) selections[recipe.id] = Number(saved.selections[recipe.id]);
        });
        data.ingredients.forEach(item => {
          if (quantity(saved.stock?.[item.id], 999999)) stock[item.id] = Number(saved.stock[item.id]);
          const preferred = saved.preferredShops?.[item.id];
          if (data.offers.some(offer => offer.itemId === item.id && offer.id === preferred && offer.season === 'AllTheTime')) preferredShops[item.id] = preferred;
        });
      }
    } catch (_) { storageUnavailable(); }
    let savedSelections = { ...selections };
    const savedStock = { ...stock };
    const linkedBuilding = new URL(location.href).searchParams.get('building');
    let invalidBuildingLink = false;
    if (linkedBuilding !== null) {
      invalidBuildingLink = !data.buildings.some(item => item.id === linkedBuilding);
      buildingId = invalidBuildingLink ? '' : linkedBuilding;
      mode = 'building';
    }
    function syncUrl() {
      const url = new URL(location.href);
      if (mode === 'building' && buildingId) url.searchParams.set('building', buildingId);
      else url.searchParams.delete('building');
      history.replaceState(history.state, '', url);
    }
    function save() {
      if (!currentResult().valid) return;
      // An unfinished edit in the other mode must not block this valid plan.
      if (calculate(data.recipes, selections, {}).valid) savedSelections = { ...selections };
      Object.entries(stock).forEach(([id, value]) => {
        if (quantity(value, 999999)) savedStock[id] = Number(value);
      });
      try {
        localStorage.setItem(storageKey, JSON.stringify({ selections: savedSelections, stock: savedStock, preferredShops, mode, buildingId }));
        saveNote.textContent = savedMessage;
      } catch (_) { storageUnavailable(); }
    }
    function currentResult() {
      return mode === 'building' ? checkBuilding(data.buildings, buildingId, stock) : calculate(data.recipes, selections, stock);
    }
    function renderMode() {
      root.querySelectorAll('[data-plan-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.planMode === mode)));
      root.querySelector('[data-plan-recipes]').hidden = mode !== 'recipes';
      root.querySelector('[data-plan-building]').hidden = mode !== 'building';
      root.querySelector('[data-plan-recipe-note]').hidden = mode !== 'recipes';
      buildingPicker.value = buildingId;
      const building = data.buildings.find(item => item.id === buildingId);
      root.querySelector('[data-building-info]').innerHTML = building ? `<a href="${prefix}/guides/resources-and-materials#offer-${esc(building.id)}">${zh ? '查看建筑商店条目' : 'View building shop listing'}</a>${building.quest ? `<p class="recipe-plan-note">${zh ? '此条目另有任务条件，材料齐全不等于已经解锁。' : 'This listing also has a quest condition; having the materials does not establish that it is unlocked.'}</p>` : ''}` : invalidBuildingLink ? `<p role="status">${zh ? '链接中的建筑未收录，请从上方重新选择。原制作计划仍保留。' : 'The linked building is not listed. Choose one above; your crafting plan is kept.'}</p>` : '';
      root.querySelector('[data-plan-total-title]').textContent = mode === 'building' ? (zh ? '单栋建筑材料核对' : 'Single-building material check') : (zh ? '合并材料清单' : 'Combined material list');
      renderSupplies();
      update();
    }

    function filter() {
      const previous = picker.value;
      const terms = query.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const matches = data.recipes.filter(recipe => {
        const materials = recipe.materials.map(item => data.ingredients.find(ingredient => ingredient.id === item.id));
        const text = [recipe.name, recipe.zhName, ...materials.flatMap(item => [item.name, item.zhName])].join(' ').toLocaleLowerCase();
        return terms.every(term => text.includes(term));
      });
      picker.replaceChildren();
      Object.entries(data.groups).forEach(([id, label]) => {
        const entries = matches.filter(recipe => recipe.category === id);
        if (!entries.length) return;
        const group = document.createElement('optgroup');
        group.label = label;
        entries.forEach(recipe => group.append(new Option(labels.get(recipe.id), recipe.id)));
        picker.append(group);
      });
      if (matches.some(recipe => recipe.id === previous)) picker.value = previous;
      picker.disabled = add.disabled = matches.length === 0;
      root.querySelector('[data-plan-no-match]').hidden = matches.length > 0;
    }

    function renderSelections() {
      selectionList.innerHTML = Object.keys(selections).map(id => {
        const recipe = data.recipes.find(item => item.id === id);
        const label = labels.get(id);
        const bench = recipe.workbench ? (zh ? '需要工作台' : 'Workbench required') : (zh ? '不要求工作台' : 'No workbench required');
        return `<li class="recipe-plan-item" data-selected-recipe="${esc(id)}">
          <div class="recipe-plan-name"><a href="${prefix}/guides/crafting-guide#recipe-${esc(id)}">${esc(label)}</a><small>${bench}${recipe.quest ? (zh ? ' · 有任务条件' : ' · Quest condition') : ''}</small></div>
          <label class="recipe-plan-quantity">${zh ? '份数' : 'Batches'}<input type="number" min="0" max="999" step="1" required data-selected-count="${esc(id)}" aria-label="${esc(label + (zh ? '份数' : ' batches'))}" aria-describedby="recipe-plan-error" value="${esc(selections[id])}"></label>
          <button type="button" data-plan-remove="${esc(id)}" aria-label="${esc((zh ? '移除' : 'Remove ') + label)}">${zh ? '移除' : 'Remove'}</button>
        </li>`;
      }).join('');
      renderSupplies();
      update();
    }
    function renderSupplies() {
      const used = new Set();
      const selected = mode === 'building' ? data.buildings.filter(item => item.id === buildingId) : data.recipes.filter(recipe => Object.hasOwn(selections, recipe.id));
      selected.forEach(recipe => recipe.materials.forEach(item => used.add(item.id)));
      supplyList.innerHTML = data.ingredients.filter(item => used.has(item.id)).map(item => `<li class="recipe-plan-supply" data-supply-row="${esc(item.id)}">
        <div class="recipe-plan-material"><a href="${esc(item.href)}">${item.icon ? `<img src="${esc(item.icon)}" width="28" height="28" alt="">` : ''}<span>${esc(name(item))}<small>${zh ? '查看获取途径' : 'Where to get it'}</small></span></a></div>
        <div><span>${zh ? '所需' : 'Required'}</span><strong data-supply-required>—</strong></div>
        <label>${zh ? '已有' : 'On hand'}<input type="number" data-supply-owned="${esc(item.id)}" min="0" max="999999" step="1" required aria-label="${esc(name(item) + (zh ? '已有' : ' on hand'))}" aria-describedby="recipe-plan-error" value="${esc(stock[item.id] ?? 0)}"></label>
        <div><span>${zh ? '还缺' : 'Missing'}</span><strong data-supply-missing>—</strong></div>
      </li>`).join('');
    }
    function renderPurchases(result) {
      const panel = root.querySelector('[data-purchase-plan]');
      const purchase = groupPurchases(result, data.offers, preferredShops);
      panel.hidden = !result.valid || !result.materials.some(item => item.missing > 0);
      const shopName = id => name(data.shops.find(shop => shop.id === id));
      const ingredient = id => data.ingredients.find(item => item.id === id);
      const choices = purchase.groups.flatMap(group => group.items).filter(item => item.alternatives.length > 1);
      root.querySelector('[data-purchase-choices]').innerHTML = choices.map(item => {
        const label = name(ingredient(item.id)) + (zh ? '商店' : ' shop');
        return `<label>${esc(label)}<select aria-label="${esc(label)}" data-purchase-choice="${esc(item.id)}">${item.alternatives.map(offer => `<option value="${esc(offer.id)}"${offer.id === item.offerId ? ' selected' : ''}>${esc(shopName(offer.shopId))}</option>`).join('')}</select></label>`;
      }).join('');
      root.querySelector('[data-purchase-groups]').innerHTML = purchase.groups.map(group => `<section class="recipe-plan-shop" data-purchase-shop="${esc(group.shopId)}">
        <h4>${esc(shopName(group.shopId))}</h4><ul>${group.items.map(item => `<li data-purchase-item="${esc(item.id)}"><a href="${prefix}/guides/resources-and-materials#offer-${esc(item.offerId)}"><span>${esc(name(ingredient(item.id)))}<small>${zh ? '查看商店条目' : 'View shop listing'}${item.alternatives.find(offer => offer.id === item.offerId).quest ? (zh ? ' · 有任务条件' : ' · Quest condition') : ''}</small></span></a><strong aria-label="${esc((zh ? '还缺 ' : 'Missing ') + item.missing)}">${item.missing}</strong></li>`).join('')}</ul>
      </section>`).join('');
      const unlisted = root.querySelector('[data-purchase-unlisted]');
      unlisted.hidden = purchase.unresolved.length === 0;
      unlisted.innerHTML = (zh ? '未收录商店条目，不代表无法获得。查看获取资料：' : 'No shop listing is recorded; this does not mean unavailable. Check acquisition notes: ') +
        purchase.unresolved.map(item => `<a href="${esc(ingredient(item.id).href)}">${esc(name(ingredient(item.id)))} × ${item.missing}</a>`).join(zh ? '、' : ', ');
    }
    function update() {
      const result = currentResult();
      const hasTarget = mode === 'building' ? Boolean(buildingId) : Object.keys(selections).length > 0;
      root.querySelector('[data-plan-error]').hidden = result.valid;
      root.querySelector('[data-plan-empty]').hidden = Object.keys(selections).length > 0;
      root.querySelector('[data-plan-totals]').hidden = !hasTarget;
      root.querySelectorAll('[data-selected-count]').forEach(input => input.setAttribute('aria-invalid', String(result.invalidRecipes.includes(input.dataset.selectedCount))));
      root.querySelectorAll('[data-supply-row]').forEach(row => {
        const input = row.querySelector('[data-supply-owned]');
        const id = input.dataset.supplyOwned;
        input.setAttribute('aria-invalid', String(result.invalidStock.includes(id)));
        const material = result.materials.find(item => item.id === id);
        row.querySelector('[data-supply-required]').textContent = result.valid ? String(material?.required || 0) : '—';
        row.querySelector('[data-supply-missing]').textContent = result.valid ? String(material?.missing || 0) : '—';
      });
      const missing = result.materials.filter(item => item.missing > 0).length;
      status.textContent = !result.valid || !hasTarget ? '' : missing ? (zh ? `${missing} 种材料还需收集。` : `${missing} material types still to collect.`) : mode === 'building' ? (zh ? '已达到所列材料数量；购买与解锁条件仍需在游戏中核对。' : 'The listed material quantities are covered; check purchase and unlock conditions in-game.') : (zh ? '所选配方的材料已备齐。' : 'Materials for the selected recipes are covered.');
      renderPurchases(result);
    }
    root.querySelector('[data-plan-picker]').addEventListener('submit', event => {
      event.preventDefault();
      const id = picker.value;
      if (!id) return;
      if (Object.hasOwn(selections, id)) {
        root.querySelector(`[data-selected-count="${id}"]`).focus();
        status.textContent = zh ? '已在计划中，可直接修改份数。' : 'Already in your plan. Adjust its batch count.';
        return;
      }
      selections[id] = 1;
      renderSelections();
      save();
      status.textContent = (zh ? '已加入：' : 'Added: ') + labels.get(id);
    });
    selectionList.addEventListener('input', event => {
      const id = event.target.dataset.selectedCount;
      if (!id) return;
      selections[id] = event.target.value;
      update();
      save();
    });
    selectionList.addEventListener('click', event => {
      const button = event.target.closest('[data-plan-remove]');
      if (!button) return;
      delete selections[button.dataset.planRemove];
      renderSelections();
      save();
      query.focus();
    });
    supplyList.addEventListener('input', event => {
      const id = event.target.dataset.supplyOwned;
      if (!id) return;
      stock[id] = event.target.value;
      update();
      save();
    });
    query.addEventListener('input', filter);
    root.querySelectorAll('[data-plan-mode]').forEach(button => button.addEventListener('click', () => {
      mode = button.dataset.planMode;
      invalidBuildingLink = false;
      renderMode();
      syncUrl();
      save();
    }));
    buildingPicker.addEventListener('change', () => {
      buildingId = buildingPicker.value;
      invalidBuildingLink = false;
      renderMode();
      syncUrl();
      save();
    });
    root.querySelector('[data-purchase-choices]').addEventListener('change', event => {
      const id = event.target.dataset.purchaseChoice;
      if (!id) return;
      preferredShops[id] = event.target.value;
      update();
      save();
      root.querySelector(`[data-purchase-choice="${id}"]`)?.focus();
    });
    root.querySelector('[data-recipe-plan-ui]').hidden = false;
    filter();
    renderSelections();
    renderMode();
  });
})();
