(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RanchRecipePlanText = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function formatSummary(plan, zh = false) {
    const building = plan.mode === 'building';
    const lines = [building ? (zh ? '建筑材料核对' : 'Building material check') : (zh ? '制作备料' : 'Crafting plan'), zh ? '目标：' : 'Targets:'];
    plan.targets.forEach(item => lines.push(`- ${item.name}` + (building ? '' : ` × ${item.count} ${zh ? '份' : item.count === 1 ? 'batch' : 'batches'}`)));
    const missing = plan.materials.filter(item => item.missing > 0);
    lines.push('', missing.length ? (zh ? '还缺材料：' : 'Missing materials:') : (zh ? '材料已齐全，无缺料。' : 'All materials covered; nothing missing.'));
    missing.forEach(item => {
      lines.push(zh ? `- ${item.name}：还缺 ${item.missing}（需要 ${item.required}，已有 ${item.owned}）` : `- ${item.name}: ${item.missing} missing (required ${item.required}, on hand ${item.owned})`);
    });
    const shops = missing.length ? plan.shops.map(shop => ({ ...shop, items: shop.items.filter(item => item.missing > 0) })).filter(shop => shop.items.length) : [];
    if (shops.length) {
      lines.push('', zh ? '已选商店：' : 'Selected shops:');
      shops.forEach(shop => lines.push(`- ${shop.name}: ` + shop.items.map(item => `${item.name} × ${item.missing}`).join(zh ? '；' : '; ')));
    }
    const unlisted = missing.length ? plan.unlisted.filter(item => item.missing > 0) : [];
    if (unlisted.length) {
      lines.push('', zh ? '未收录商店：' : 'Not in shop listings:');
      unlisted.forEach(item => lines.push(`- ${item.name} × ${item.missing}`));
    }
    if (building) lines.push('', zh ? '仅核对材料条件，不是售价或已解锁保证。' : 'Material requirements only; not a price quote or a guarantee of unlock.');
    if (shops.length) lines.push('', zh ? '商店来自已收录列表，不保证现货或价格。' : 'Shop choices come from listings; stock and prices are not guaranteed.');
    return lines.join('\n');
  }
  return { formatSummary };
});
