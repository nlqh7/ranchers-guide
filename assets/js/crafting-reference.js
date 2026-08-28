(function () {
  'use strict';
  document.querySelectorAll('[data-crafting-reference]').forEach(root => {
    const query = root.querySelector('[data-recipe-query]');
    const category = root.querySelector('[data-recipe-category]');
    const groups = Array.from(root.querySelectorAll('[data-recipe-group]'));
    function filter() {
      const term = query.value.trim().toLocaleLowerCase();
      let matches = 0;
      groups.forEach(group => {
        let visible = 0;
        group.querySelectorAll('[data-recipe-row]').forEach(row => {
          row.hidden = (category.value !== 'all' && group.dataset.recipeGroup !== category.value) || !row.dataset.query.toLocaleLowerCase().includes(term);
          if (!row.hidden) visible += 1;
        });
        group.hidden = visible === 0;
        matches += visible;
      });
      root.querySelector('[data-recipe-empty]').hidden = matches !== 0;
    }
    function revealAnchor() {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
      const target = document.getElementById(id);
      if (!target || !root.contains(target)) return;
      query.value = '';
      category.value = 'all';
      filter();
      target.scrollIntoView({block: 'start', behavior: 'instant'});
    }
    query.addEventListener('input', filter);
    category.addEventListener('change', filter);
    window.addEventListener('hashchange', revealAnchor);
    revealAnchor();
  });
})();
