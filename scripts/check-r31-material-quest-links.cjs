const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
for (const prefix of ['', 'zh/']) {
  const quest = fs.readFileSync(path.join(root, `${prefix}database/quests/feathered-foes.html`), 'utf8');
  for (const material of ['stone', 'wood-log', 'hay']) {
    assert.match(quest, new RegExp(`database/materials/${material}#${material}`), `${prefix || 'en/'} quest must link its recipe material ${material}`);
  }
  assert.match(quest, prefix ? /不等同于任务交付数量/ : /not a quest delivery quantity/);

  for (const material of ['stone', 'wood-log', 'hay']) {
    const page = fs.readFileSync(path.join(root, `${prefix}database/materials/${material}.html`), 'utf8');
    assert.match(page, new RegExp(`database/quests/feathered-foes`), `${prefix || 'en/'} ${material} must link back to Feathered Foes`);
    assert.match(page, prefix ? /相关任务配方/ : /Linked quest recipes/);
    const evidenceHeading = page.indexOf(prefix ? '<summary>获取证据与来源边界</summary>' : '<summary>Acquisition evidence and source boundary</summary>');
    const questHeading = page.indexOf(prefix ? '<h3>相关任务配方</h3>' : '<h3>Linked quest recipes</h3>');
    assert.ok(questHeading >= 0 && evidenceHeading > questHeading,
      `${prefix || 'en/'} ${material}: actionable quest/recipe links must precede the source ledger`);
    const buildingHeading = page.indexOf(prefix ? '<h3>建筑词条中的用途</h3>' : '<h3>Uses in building entries</h3>');
    if (buildingHeading >= 0) assert.ok(buildingHeading < evidenceHeading,
      `${prefix || 'en/'} ${material}: building uses must precede the source ledger`);
  }
}
console.log('PASS: Feathered Foes and the three existing recipe materials form bilingual forward and reverse links.');
