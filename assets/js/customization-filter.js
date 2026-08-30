(function () {
  'use strict';
  var root = document.querySelector('.database-customization');
  if (!root) return;
  var search = root.querySelector('[data-customization-search]');
  var category = root.querySelector('[data-customization-category]');
  var setting = root.querySelector('[data-customization-setting]');
  var count = root.querySelector('[data-customization-count]');
  var empty = root.querySelector('[data-customization-empty]');
  var links = Array.from(root.querySelectorAll('[data-customization-directory-link]'));
  var profiles = Array.from(root.querySelectorAll('[data-customization-entry]'));
  var groups = Array.from(root.querySelectorAll('[data-customization-category-group]'));

  function matches(node, query, categoryValue, settingValue) {
    return (!query || node.dataset.filterText.indexOf(query) !== -1) &&
      (categoryValue === 'all' || node.dataset.category === categoryValue) &&
      (settingValue === 'all' || (node.dataset.settings || '').split(' ').includes(settingValue));
  }

  function apply() {
    var query = search.value.trim().toLocaleLowerCase();
    var categoryValue = category.value;
    var settingValue = setting.value;
    var visible = 0;
    links.forEach(function (link) {
      var show = matches(link, query, categoryValue, settingValue);
      link.hidden = !show;
      if (show) visible += 1;
    });
    profiles.forEach(function (profile) {
      profile.hidden = !matches(profile, query, categoryValue, settingValue);
    });
    groups.forEach(function (group) {
      var hasVisible = Array.from(group.querySelectorAll('[data-customization-directory-link]')).some(function (link) { return !link.hidden; });
      group.hidden = !hasVisible;
      if (query && hasVisible) group.open = true;
    });
    count.textContent = String(visible);
    empty.hidden = visible !== 0;
  }

  search.addEventListener('input', apply);
  category.addEventListener('change', apply);
  setting.addEventListener('change', apply);
  apply();
}());
