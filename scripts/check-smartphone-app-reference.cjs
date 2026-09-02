const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'data/build-smartphone-apps.json');
const searchCore = require('../assets/js/search-core.js');

assert.ok(fs.existsSync(dataPath), 'source-backed smartphone app data must be generated');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

assert.equal(data.labels.length, 30, 'all 28 S/APP labels and two case-variant labels must be accounted for');
assert.equal(data.confirmedApps.length, 14, 'only active level6 app icons with matching labels are confirmed');
assert.equal(data.mapControls.length, 4, 'three map actions and the weak-GPS status must stay distinct from apps');
assert.equal(data.nonAppLabels.length, 9, 'loading, update, demo and status labels must not be presented as apps');
assert.deepEqual(data.unmatchedAppCandidates.map(entry => entry.key), ['S/APP_BOOKBOOK', 'S/APP_DLC_SHOP']);

for (const app of data.confirmedApps) {
  assert.equal(app.evidenceLevel, 'build-observed');
  assert.equal(app.object.source, 'TheRanchers_Data/level6');
  assert.equal(app.object.active, true);
  assert.match(app.object.gameObjectName, /^app-/);
  assert.equal(app.object.script, 'UI_SmartPhone_App');
}

for (const locale of ['en', 'zh']) {
  const prefix = locale === 'zh' ? 'zh/' : '';
  const guide = fs.readFileSync(path.join(root, prefix, 'guides/beginners-guide.html'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const block = guide.match(/BEGIN SMARTPHONE TUTORIAL REFERENCE -->[\s\S]*?<!-- END SMARTPHONE TUTORIAL REFERENCE/)?.[0] || '';
  assert.ok(block, `${locale}: smartphone reference block missing`);
  assert.match(block, /class="smartphone-app-groups"/, `${locale}: confirmed app list must be visible in the existing answer`);
  assert.equal((block.match(/class="smartphone-app-name"/g) || []).length, 14, `${locale}: render every confirmed app exactly once`);
  assert.match(block, locale === 'zh' ? /地图操作[\s\S]*地图居中[\s\S]*放置地标[\s\S]*移除标记/ : /Map controls[\s\S]*Center the map[\s\S]*Place a landmark[\s\S]*Remove marker/i);
  const visibleApps = block.match(/<div class="smartphone-app-groups">[\s\S]*?<p class="smartphone-map-controls">/)?.[0] || '';
  assert.doesNotMatch(visibleApps, locale === 'zh' ? /书书|商店/ : /\bBook\b|\bStore\b/i);
  assert.doesNotMatch(block, /EARLY ACCESS|Intializing game data|Saddling up the shaders|Disconnecting/);
  const exactNameQuery = locale === 'zh' ? '活力矩阵' : 'Zesty Metrix';
  assert.equal(
    searchCore.searchDocuments(searchIndex, exactNameQuery, 5)[0]?.url,
    `/${prefix}guides/beginners-guide#smartphone-apps`,
    `${locale}: a confirmed app name must open the smartphone reference`,
  );
}

console.log('PASS: smartphone labels are classified, object-matched apps are visible, and system text stays out of the app list.');
