(function () {
  'use strict';
  document.querySelectorAll('[data-shop-reference]').forEach(root => {
    const query = root.querySelector('[data-shop-query]');
    const category = root.querySelector('[data-shop-category]');
    const season = root.querySelector('[data-shop-season]');
    const groups = Array.from(root.querySelectorAll('[data-shop-group]'));
    function saveUrl(clearAnchor) {
      const url = new URL(location.href);
      const values = { q: query.value.trim(), shop: category.value === 'all' ? '' : category.value, season: season.value === 'all' ? '' : season.value };
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
      const selected = params.get('shop');
      category.value = Array.from(category.options).some(option => option.value === selected) ? selected : 'all';
      const selectedSeason = params.get('season');
      season.value = Array.from(season.options).some(option => option.value === selectedSeason) ? selectedSeason : 'all';
      filter();
      revealAnchor();
    }
    function filter() {
      const term = query.value.trim().toLocaleLowerCase();
      const terms = term.split(/\s+/).filter(Boolean);
      let matches = 0;
      groups.forEach((group,index) => {
        const selected = category.value === 'all' || category.value === group.dataset.shopGroup;
        let visible = 0;
        group.querySelectorAll('[data-shop-row]').forEach(row => {
          const inSeason = season.value === 'all' || row.dataset.shopListingSeason === 'AllTheTime' || row.dataset.shopListingSeason === season.value;
          row.hidden = !selected || !inSeason || !terms.every(word => row.dataset.query.toLocaleLowerCase().includes(word));
          if(!row.hidden) visible += 1;
        });
        const unresolved = group.querySelector('.shop-unresolved');
        if(unresolved) unresolved.hidden = Boolean(term) || season.value !== 'all';
        group.hidden = visible === 0;
        group.open = Boolean(term) || category.value !== 'all' || season.value !== 'all' || index === 0;
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
      season.value = 'all';
      filter();
      saveUrl(false);
      for(let node=target;node && node!==root;node=node.parentElement) if(node.tagName==='DETAILS') node.open=true;
      target.scrollIntoView({block:'start',behavior:'instant'});
    }
    query.addEventListener('input',function () { filter(); saveUrl(true); });
    category.addEventListener('change',function () { filter(); saveUrl(true); });
    season.addEventListener('change',function () { filter(); saveUrl(true); });
    window.addEventListener('hashchange',revealAnchor);
    window.addEventListener('popstate',restoreUrl);
    restoreUrl();
  });
})();
