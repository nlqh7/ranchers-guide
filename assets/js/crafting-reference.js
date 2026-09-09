(function () {
  'use strict';
  document.querySelectorAll('[data-wall-plan]').forEach(root => {
    const rows = Array.from(root.querySelectorAll('[data-plan-row]'));
    const stocks = Array.from(root.querySelectorAll('[data-plan-owned]'));
    function updatePlan() {
      const totals = new Map();
      let valid = true;
      rows.forEach(row => {
        const input = row.querySelector('[data-plan-count]');
        const count = Number(input.value);
        const allowed = input.value.trim() !== '' && Number.isInteger(count) && count >= 0 && count <= 999;
        input.setAttribute('aria-invalid', String(!allowed));
        valid = valid && allowed;
        row.querySelectorAll('[data-plan-ingredient]').forEach(amount => {
          const quantity = Number(amount.dataset.planBase) * count;
          amount.textContent = allowed ? String(quantity) : '—';
          totals.set(amount.dataset.planIngredient, (totals.get(amount.dataset.planIngredient) || 0) + quantity);
        });
      });
      root.querySelectorAll('[data-plan-total-value]').forEach(amount => {
        amount.textContent = valid ? String(totals.get(amount.dataset.planTotalValue) || 0) : '—';
      });
      root.querySelector('[data-plan-error]').hidden = valid;
      const owned = new Map();
      let stockValid = true;
      stocks.forEach(input => {
        const count = Number(input.value);
        const allowed = input.value.trim() !== '' && Number.isInteger(count) && count >= 0 && count <= 999999;
        input.setAttribute('aria-invalid', String(!allowed));
        stockValid = stockValid && allowed;
        owned.set(input.dataset.planOwned, count);
      });
      root.querySelectorAll('[data-plan-missing]').forEach(amount => {
        const id = amount.dataset.planMissing;
        amount.textContent = valid && stockValid ? String(Math.max(0, (totals.get(id) || 0) - (owned.get(id) || 0))) : '—';
      });
      root.querySelector('[data-plan-stock-error]').hidden = stockValid;
    }
    rows.forEach(row => row.querySelector('[data-plan-count]').addEventListener('input', updatePlan));
    stocks.forEach(input => input.addEventListener('input', updatePlan));
    updatePlan();
  });
  document.querySelectorAll('[data-crafting-reference]').forEach(root => {
    const query = root.querySelector('[data-recipe-query]');
    const category = root.querySelector('[data-recipe-category]');
    const groups = Array.from(root.querySelectorAll('[data-recipe-group]'));
    const batches = root.querySelector('[data-recipe-batches]');
    const reset = root.querySelector('[data-recipe-reset]');
    const resultCount = root.querySelector('[data-recipe-count]');
    function saveUrl(clearAnchor) {
      const url = new URL(location.href);
      const count = batches ? Number(batches.value) : 1;
      const values = { q: query.value.trim(), category: category.value === 'all' ? '' : category.value, batches: Number.isInteger(count) && count > 1 && count <= 999 ? String(count) : '' };
      Object.entries(values).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
      if (clearAnchor) {
        let target;
        try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch (_) {}
        if (target && root.contains(target)) url.hash = '';
      }
      history.replaceState(history.state, '', url.href);
    }
    function restoreUrl() {
      const params = new URL(location.href).searchParams;
      query.value = params.get('q') || '';
      const selected = params.get('category');
      category.value = Array.from(category.options).some(option => option.value === selected) ? selected : 'all';
      if (batches) {
        const count = Number(params.get('batches'));
        batches.value = Number.isInteger(count) && count >= 1 && count <= 999 ? String(count) : '1';
        scaleIngredients();
      }
      filter();
      revealAnchor();
    }
    function scaleIngredients() {
      const count = Number(batches.value);
      const valid = batches.value.trim() !== '' && Number.isInteger(count) && count >= 1 && count <= 999;
      root.querySelectorAll('[data-recipe-base-quantity]').forEach(amount => {
        amount.textContent = valid ? '× ' + (Number(amount.dataset.recipeBaseQuantity) * count) : '—';
      });
      batches.setAttribute('aria-invalid', String(!valid));
      root.querySelector('[data-recipe-batch-error]').hidden = valid;
    }
    if (batches) batches.addEventListener('input', function () { scaleIngredients(); saveUrl(false); });
    function filter() {
      const terms = query.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      let matches = 0;
      groups.forEach(group => {
        let visible = 0;
        group.querySelectorAll('[data-recipe-row]').forEach(row => {
          row.hidden = (category.value !== 'all' && group.dataset.recipeGroup !== category.value) || !terms.every(term => row.dataset.query.toLocaleLowerCase().includes(term));
          if (!row.hidden) visible += 1;
        });
        group.hidden = visible === 0;
        matches += visible;
      });
      root.querySelector('[data-recipe-empty]').hidden = matches !== 0;
      if (resultCount) resultCount.textContent = root.dataset.resultLabel.replace('{count}', matches);
      if (reset) reset.hidden = terms.length === 0 && category.value === 'all';
    }
    function revealAnchor() {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
      const target = document.getElementById(id);
      if (!target || !root.contains(target)) return;
      if (target.closest('[data-recipe-row]')?.hidden || target.closest('[data-recipe-group]')?.hidden) {
        query.value = '';
        category.value = 'all';
        filter();
        saveUrl(false);
      }
      target.scrollIntoView({block: 'start', behavior: 'instant'});
    }
    query.addEventListener('input', function () { filter(); saveUrl(true); });
    category.addEventListener('change', function () { filter(); saveUrl(true); });
    if (reset) reset.addEventListener('click', function () {
      query.value = '';
      category.value = 'all';
      filter();
      saveUrl(true);
      query.focus();
    });
    window.addEventListener('hashchange', revealAnchor);
    window.addEventListener('popstate', restoreUrl);
    restoreUrl();
  });
})();
