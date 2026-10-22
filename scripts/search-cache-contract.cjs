const assert = require('node:assert/strict');
module.exports = function assertSearchCacheRevision(source, minimum = { en: 55, zh: 41 }) {
  const assignment = source.match(/\b(?:var|let|const)\s+CACHE_KEY\s*=\s*[^;]+;/)?.[0] || '';
  const en = Number(assignment.match(/["']ranchers-search-index-v(\d+)["']/)?.[1]);
  const zh = Number(assignment.match(/["']ranchers-search-index-zh-v(\d+)["']/)?.[1]);
  assert.ok(en >= minimum.en, 'English search cache must invalidate all earlier indexed scopes');
  assert.ok(zh >= minimum.zh, 'Chinese search cache must invalidate all earlier indexed scopes');
};
