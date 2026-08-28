(function () {
  'use strict';
  document.querySelectorAll('[data-shop-reference]').forEach(root => {
    const query = root.querySelector('[data-shop-query]');
    const category = root.querySelector('[data-shop-category]');
    const groups = Array.from(root.querySelectorAll('[data-shop-group]'));
    function filter() {
      const term = query.value.trim().toLocaleLowerCase();
      let matches = 0;
      groups.forEach((group,index) => {
        const selected = category.value === 'all' || category.value === group.dataset.shopGroup;
        let visible = 0;
        group.querySelectorAll('[data-shop-row]').forEach(row => {
          row.hidden = !selected || !row.dataset.query.toLocaleLowerCase().includes(term);
          if(!row.hidden) visible += 1;
        });
        const unresolved = group.querySelector('.shop-unresolved');
        if(unresolved) unresolved.hidden = Boolean(term);
        group.hidden = visible === 0;
        group.open = Boolean(term) || category.value !== 'all' || index === 0;
        matches += visible;
      });
      root.querySelector('[data-shop-empty]').hidden = matches !== 0;
    }
    function revealAnchor() {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
      const target = document.getElementById(id);
      if(!target || !root.contains(target)) return;
      query.value = '';
      category.value = 'all';
      filter();
      for(let node=target;node && node!==root;node=node.parentElement) if(node.tagName==='DETAILS') node.open=true;
      target.scrollIntoView({block:'start',behavior:'instant'});
    }
    query.addEventListener('input',filter);
    category.addEventListener('change',filter);
    window.addEventListener('hashchange',revealAnchor);
    revealAnchor();
  });
})();
