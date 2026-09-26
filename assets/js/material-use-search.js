(function () {
  'use strict';
  function filterUses(entries, query) {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return entries.filter(entry => terms.every(term => entry.text.toLocaleLowerCase().includes(term)));
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { filterUses };
  if (typeof document === 'undefined') return;
  const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
  const controls = [];
  document.querySelectorAll('[data-material-uses]').forEach(root => {
    const input = root.querySelector('[data-use-search]');
    const clear = root.querySelector('[data-use-clear]');
    const count = root.querySelector('[data-use-count]');
    const entries = Array.from(root.querySelectorAll('[data-use-row]'), row => ({row, text: row.dataset.useSearchText}));
    const groups = Array.from(root.querySelectorAll('[data-use-group]'));
    let previousOpen = [];
    let filtering = false;
    function apply() {
      const active = Boolean(input.value.trim());
      if (active && !filtering) previousOpen = groups.map(group => group.open);
      const matches = new Set(filterUses(entries, input.value));
      entries.forEach(entry => { entry.row.hidden = !matches.has(entry); });
      groups.forEach((group, index) => {
        const hasMatch = Array.from(group.querySelectorAll('[data-use-row]')).some(row => !row.hidden);
        group.hidden = !hasMatch;
        if (active) group.open = hasMatch;
        else if (filtering) group.open = previousOpen[index];
      });
      filtering = active;
      clear.disabled = !input.value;
      count.textContent = !active ? '' : matches.size ? (zh ? `找到 ${matches.size} 个配方。` : `${matches.size} matching ${matches.size === 1 ? 'recipe' : 'recipes'}.`) : (zh ? '没有匹配的用途。试试其他物品名，或清除搜索。' : 'No matching uses. Try another item name or clear the search.');
    }
    function updateUrl() {
      const url = new URL(location.href);
      if (input.value.trim()) {
        url.searchParams.set('material', root.dataset.materialUses);
        url.searchParams.set('use', input.value);
        url.hash = root.dataset.materialUses;
      } else if (url.searchParams.get('material') === root.dataset.materialUses) {
        url.searchParams.delete('material');
        url.searchParams.delete('use');
      }
      history.replaceState(history.state, '', url);
    }
    input.addEventListener('input', () => { apply(); updateUrl(); });
    clear.addEventListener('click', () => { input.value = ''; apply(); updateUrl(); input.focus(); });
    controls.push({id: root.dataset.materialUses, input, apply});
    root.querySelector('.resource-use-controls').hidden = false;
    apply();
  });
  function restore() {
    const params = new URL(location.href).searchParams;
    controls.forEach(control => {
      control.input.value = control.id === params.get('material') ? (params.get('use') || '') : '';
      control.apply();
    });
  }
  window.addEventListener('popstate', restore);
  restore();
})();
